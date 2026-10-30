#!/usr/bin/env python3
"""Henter administrative grenser og steder (POI) for en by og skriver dem til public/data/<by>/.

Kilder:
  - Fylke og kommune: Kartverket (ws.geonorge.no/kommuneinfo)
  - Bydeler: OpenStreetMap via Overpass (admin_level=9, 15 bydeler + Sentrum og Marka)
  - Postnummerområder: Posten/Kartverket (wfs.geonorge.no), kun Oslo og Bærum
  - POI: OpenStreetMap via Overpass
  - Kystlinje, øyer, vann og riksgrense: OpenStreetMap via Overpass

Byene og områdene som hentes, står i scripts/cities.json. Grensene er bygget for
hver by for seg (`admin` i cities.json, se ADMIN_BUILDERS). Har byen ingen, hoppes
grensene over, og appen slår av spørsmålene som trenger dem.

Bruk:
    python3 scripts/fetch_geodata.py <by> [cache-mappe] [admin|poi|shapes|<stedstype>]
"""
import json
import math
import os
import re
import sys
import time
import urllib.parse
import urllib.request

UA = "hide-and-seek-oslo-databuild/1.0 (github.com/kristiangoystdal)"
# Er hovedserveren opptatt, kan et speil brukes: OVERPASS_URL=https://overpass.kumi.systems/api/interpreter
OVERPASS = os.environ.get("OVERPASS_URL", "https://overpass-api.de/api/interpreter")
CITIES = os.path.join(os.path.dirname(__file__), "cities.json")
# Områdene settes fra cities.json i `use_city`. BBOX dekker alle stasjonene i nettet med margin.
BBOX = WIDE = COAST_BBOX = BORDER_BBOX = ""
KARTVERKET = "https://ws.geonorge.no/kommuneinfo/v1"
KOMMUNER = {"0301": "Oslo", "3201": "Bærum"}
# Kommunene for byen som bygges, fra «admin.kommuner» i cities.json.
ALL_KOMMUNER = {}


def use_city(cfg):
    global BBOX, WIDE, COAST_BBOX, BORDER_BBOX, ALL_KOMMUNER
    # WIDE: sjeldne steder letes etter i et større område, siden nærmeste kan ligge langt unna.
    # COAST_BBOX: kystlinjen hentes litt utenfor kartet, så nærmeste kyst alltid er med.
    # BORDER_BBOX: riksgrensen, langt nok ut til at nærmeste punkt fra byen er med.
    BBOX, WIDE, COAST_BBOX = cfg["bbox"], cfg["wide"], cfg["coastBbox"]
    # Uten «borderBbox» er riksgrensen for langt unna til å bety noe, og spørsmålet slås av.
    BORDER_BBOX = cfg.get("borderBbox", "")
    admin = cfg.get("admin")
    ALL_KOMMUNER = admin.get("kommuner", {}) if isinstance(admin, dict) else {}


def postnummer_wfs():
    # Bboxen gjelder bare utvalget som lastes ned. Kommunene filtreres etterpå.
    return ("https://wfs.geonorge.no/skwms1/wfs.postnummeromrader?" + urllib.parse.urlencode({
        "service": "WFS", "version": "2.0.0", "request": "GetFeature", "typeNames": "app:Postnummerområde",
        "srsName": "urn:ogc:def:crs:EPSG::4258", "bbox": BBOX + ",urn:ogc:def:crs:EPSG::4258"}))


# Filnavnene må stemme med POI_TYPES i src/geo.ts. Verdien er (område, velgere), der
# området er "BBOX" eller "WIDE" og slås opp når byen er valgt.
POI_TYPES = {
    "flyplass": ("WIDE", ('nwr["aeroway"="aerodrome"]["iata"]',)),
    "jernbanestasjon": ("BBOX", ('nwr["railway"="station"]["station"!="subway"]["station"!="light_rail"]["subway"!="yes"]',)),
    "fjell": ("BBOX", ('node["natural"="peak"]["name"]',)),
    "park": ("BBOX", ('nwr["leisure"="park"]["name"]',)),
    "fornoyelsespark": ("WIDE", ('nwr["tourism"="theme_park"]',)),
    "dyrepark": ("WIDE", ('nwr["tourism"="zoo"]',)),
    "akvarium": ("WIDE", ('nwr["tourism"="aquarium"]',)),
    "golfbane": ("WIDE", ('nwr["leisure"="golf_course"]',)),
    "museum": ("BBOX", ('nwr["tourism"="museum"]',)),
    "kino": ("BBOX", ('nwr["amenity"="cinema"]',)),
    "sykehus": ("BBOX", ('nwr["amenity"="hospital"]',)),
    "bibliotek": ("BBOX", ('nwr["amenity"="library"]',)),
    "konsulat": ("BBOX", ('nwr["office"="diplomatic"]', 'nwr["amenity"="embassy"]')),
}

NOT_WATER = {"pool", "reflecting_pool", "fountain", "wastewater"}
MIN_ISLAND_M = 60

CACHE = None


def fetch(url, data=None, key=None):
    path = os.path.join(CACHE, key) if CACHE and key else None
    if path and os.path.exists(path):
        return open(path, encoding="utf-8").read()
    body = urllib.parse.urlencode(data).encode() if data else None
    for attempt in range(int(os.environ.get("FETCH_TRIES", 6))):
        try:
            req = urllib.request.Request(url, data=body, headers={"User-Agent": UA})
            text = urllib.request.urlopen(req, timeout=180).read().decode("utf-8")
            if path:
                open(path, "w", encoding="utf-8").write(text)
            return text
        except Exception as e:  # Overpass er ofte opptatt, prøv igjen
            print(f"  {url}: {e}, prøver igjen", file=sys.stderr)
            time.sleep(15 * (attempt + 1))
    raise SystemExit(f"Ga opp: {url}")


def overpass(query, key):
    return json.loads(fetch(OVERPASS, {"data": f"[out:json][timeout:150];{query}"}, key))


def simplify_ring(ring, tol_m):
    """Douglas-Peucker på en lukket ring av [lon, lat] med toleranse i meter."""
    if tol_m <= 0 or len(ring) < 6:
        return ring
    lat0 = math.radians(ring[0][1])
    xy = [(p[0] * 111320 * math.cos(lat0), p[1] * 110540) for p in ring]
    keep = [False] * len(ring)
    keep[0] = keep[-1] = True
    # Lukket ring: del i to ved punktet lengst fra start så DP har en basislinje.
    far = max(range(len(ring)), key=lambda i: (xy[i][0] - xy[0][0]) ** 2 + (xy[i][1] - xy[0][1]) ** 2)
    keep[far] = True
    stack = [(0, far), (far, len(ring) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = xy[a]
        bx, by = xy[b]
        dx, dy = bx - ax, by - ay
        norm = math.hypot(dx, dy)
        best, best_i = 0.0, -1
        for i in range(a + 1, b):
            px, py = xy[i]
            d = math.hypot(px - ax, py - ay) if norm == 0 else abs(dy * px - dx * py + bx * ay - by * ax) / norm
            if d > best:
                best, best_i = d, i
        if best > tol_m:
            keep[best_i] = True
            stack.append((a, best_i))
            stack.append((best_i, b))
    out = [p for p, k in zip(ring, keep) if k]
    return out if len(out) >= 4 else ring


def clean_geometry(geom, tol_m):
    """Fjerner z-koordinat, forenkler og runder av. Returnerer alltid MultiPolygon."""
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    out = []
    for poly in polys:
        rings = [simplify_ring([[round(p[0], 5), round(p[1], 5)] for p in ring], tol_m) for ring in poly]
        rings = [r for r in rings if len(r) >= 4]
        if rings:
            out.append(rings)
    return {"type": "MultiPolygon", "coordinates": out}


def feature(name, geom, tol_m, **props):
    return {"type": "Feature", "properties": {"name": name, **props}, "geometry": clean_geometry(geom, tol_m)}


def stitch(ways):
    """Setter sammen veisegmenter fra en OSM-relasjon til lukkede ringer."""
    segs = [[[p["lon"], p["lat"]] for p in w] for w in ways if w]
    rings = []
    while segs:
        ring = segs.pop()
        while ring[0] != ring[-1]:
            for i, s in enumerate(segs):
                if s[0] == ring[-1]:
                    ring += s[1:]
                elif s[-1] == ring[-1]:
                    ring += s[-2::-1]
                else:
                    continue
                segs.pop(i)
                break
            else:
                break  # åpen ring, forkastes under
        if ring[0] == ring[-1] and len(ring) >= 4:
            rings.append(ring)
    return rings


def simplify_line(points, tol_m):
    """Douglas-Peucker på en åpen linje av [lon, lat] med toleranse i meter."""
    if len(points) < 3:
        return points
    lat0 = math.radians(points[0][1])
    xy = [(p[0] * 111320 * math.cos(lat0), p[1] * 110540) for p in points]
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = xy[a]
        bx, by = xy[b]
        dx, dy = bx - ax, by - ay
        norm = math.hypot(dx, dy)
        best, best_i = 0.0, -1
        for i in range(a + 1, b):
            px, py = xy[i]
            d = math.hypot(px - ax, py - ay) if norm == 0 else abs(dy * px - dx * py + bx * ay - by * ax) / norm
            if d > best:
                best, best_i = d, i
        if best > tol_m:
            keep[best_i] = True
            stack.append((a, best_i))
            stack.append((best_i, b))
    return [p for p, k in zip(points, keep) if k]


def chains(ways):
    """Setter sammen veisegmenter til lengst mulige linjer. Returnerer (lukkede ringer, åpne linjer)."""
    segs = [[[round(p["lon"], 5), round(p["lat"], 5)] for p in w] for w in ways if w]
    closed, opened = [], []
    while segs:
        line = segs.pop()
        grew = True
        while grew and line[0] != line[-1]:
            grew = False
            for i, s in enumerate(segs):
                if s[0] == line[-1]:
                    line += s[1:]
                elif s[-1] == line[-1]:
                    line += s[-2::-1]
                elif s[-1] == line[0]:
                    line = s[:-1] + line
                elif s[0] == line[0]:
                    line = s[:0:-1] + line
                else:
                    continue
                segs.pop(i)
                grew = True
                break
        (closed if line[0] == line[-1] and len(line) >= 4 else opened).append(line)
    return closed, opened


def diag_m(points):
    lons, lats = [p[0] for p in points], [p[1] for p in points]
    return dist_m((min(lons), min(lats)), (max(lons), max(lats)))


def geo(kind, coords, **props):
    return {"type": "Feature", "properties": props, "geometry": {"type": kind, "coordinates": coords}}


def build_shapes(out_dir):
    """Linjer avstand måles til. Lukkede kystringer er øyer, og brukes også til landmasse-spørsmålet."""
    ways = overpass(f'way["natural"="coastline"]({COAST_BBOX});out geom;', "op-coast.json")["elements"]
    closed, opened = chains([w.get("geometry") for w in ways])
    coast = [geo("Polygon", [simplify_ring(r, 8)]) for r in closed if diag_m(r) >= MIN_ISLAND_M]
    coast += [geo("LineString", simplify_line(l, 8)) for l in opened if len(l) >= 2]
    write(f"{out_dir}/coast.geojson", coast)

    q = (f'(way["natural"="water"]["name"]({BBOX});relation["natural"="water"]["name"]({BBOX});'
         f'way["waterway"="river"]["name"]({BBOX}););out geom;')
    water = []
    for el in overpass(q, "op-water.json")["elements"]:
        tags = el.get("tags", {})
        if tags.get("water") in NOT_WATER:
            continue
        if el["type"] == "relation":
            rings = stitch([m.get("geometry") for m in el["members"] if m["type"] == "way" and m["role"] != "inner"])
            rings = [[[round(p[0], 5), round(p[1], 5)] for p in r] for r in rings]
        else:
            rings = [[[round(p["lon"], 5), round(p["lat"], 5)] for p in el["geometry"]]]
        for r in rings:
            if r[0] == r[-1] and len(r) >= 4:
                water.append(geo("Polygon", [simplify_ring(r, 8)], name=tags["name"]))
            elif len(r) >= 2:
                water.append(geo("LineString", simplify_line(r, 8), name=tags["name"]))
    water.sort(key=lambda f: f["properties"]["name"])
    write(f"{out_dir}/water.geojson", water)

    if not BORDER_BBOX:
        riks = f"{out_dir}/riks.geojson"
        if os.path.exists(riks):
            os.remove(riks)
        print("ingen riksgrense (mangler «borderBbox» i cities.json)")
        return
    ways = overpass(f'way["boundary"="administrative"]["admin_level"="2"]["maritime"!="yes"]({BORDER_BBOX});out geom;', "op-riks.json")["elements"]
    closed, opened = chains([w.get("geometry") for w in ways if "border_type" not in w.get("tags", {})])
    write(f"{out_dir}/riks.geojson", [geo("LineString", simplify_line(l, 20)) for l in closed + opened if len(l) >= 2])


def ring_contains(ring, pt):
    x, y = pt
    inside = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside


def relation_geometry(rel):
    ways = [m for m in rel["members"] if m["type"] == "way"]
    outers = stitch([m.get("geometry") for m in ways if m["role"] != "inner"])
    inners = stitch([m.get("geometry") for m in ways if m["role"] == "inner"])
    polys = [[o] for o in outers]
    for inner in inners:
        for poly in polys:
            if ring_contains(poly[0], inner[0]):
                poly.append(inner)
                break
    return {"type": "MultiPolygon", "coordinates": polys}


def kartverket(kind, number):
    d = json.loads(fetch(f"{KARTVERKET}/{kind}/{number}/omrade?utkoordsys=4258", key=f"kv-{kind}-{number}.json"))
    return d["omrade"]


def build_postnummer():
    """Postnummerområder fra Kartverkets WFS (GML, koordinater som «lat lon»)."""
    gml = fetch(postnummer_wfs(), key="kv-postnummer.gml")
    ring = lambda text: [[float(lon), float(lat)] for lat, lon in zip(*[iter(text.split())] * 2)]
    feats = []
    for member in re.findall(r"<wfs:member>(.*?)</wfs:member>", gml, re.S):
        kommune = re.search(r"<app:kommune>(\d+)", member).group(1)
        if kommune not in KOMMUNER and kommune not in ALL_KOMMUNER:
            continue
        polys = []
        for poly in re.findall(r"<gml:Polygon.*?</gml:Polygon>", member, re.S):
            outer = re.search(r"<gml:exterior>.*?<gml:posList[^>]*>([^<]*)", poly, re.S).group(1)
            inners = re.findall(r"<gml:interior>.*?<gml:posList[^>]*>([^<]*)", poly, re.S)
            polys.append([ring(outer)] + [ring(i) for i in inners])
        nr = re.search(r"<app:postnummer>(\d+)", member).group(1)
        sted = re.search(r"<app:poststed>([^<]*)", member).group(1).title()
        feats.append(feature(nr, {"type": "MultiPolygon", "coordinates": polys}, 5, poststed=sted))
    feats.sort(key=lambda f: f["properties"]["name"])
    return feats


def write(path, features):
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{path}: {len(features)} objekter, {os.path.getsize(path) // 1024} kB")


def build_admin_oslo(out_dir):
    """Oslo og Bærum: fylke og kommune fra Kartverket, bydeler fra OSM, postnummer fra Posten."""
    baerum = kartverket("kommuner", "3201")
    fylke = [feature("Oslo", kartverket("fylker", "03"), 15), feature("Akershus", kartverket("fylker", "32"), 40)]
    kommune = [feature("Oslo", kartverket("kommuner", "0301"), 10), feature("Bærum", baerum, 10)]

    rels = overpass(f'relation["boundary"="administrative"]["admin_level"="9"]({BBOX});out geom;', "op-bydeler.json")
    bydel = [feature(r["tags"]["name"], relation_geometry(r), 5) for r in rels["elements"]]
    bydel.sort(key=lambda f: f["properties"]["name"])
    # Bærum har ingen bydeler: kommunen står inn som én «bydel» så spørsmålet alltid har svar.
    bydel.append(feature("Bærum", baerum, 10))

    postnummer = build_postnummer()

    write(f"{out_dir}/admin.geojson", [
        {**f, "properties": {**f["properties"], "level": level}}
        for level, feats in (("fylke", fylke), ("kommune", kommune), ("bydel", bydel), ("postnummer", postnummer))
        for f in feats
    ])


def point_of(el):
    if el["type"] == "node":
        return el["lon"], el["lat"]
    c = el.get("center")
    return (c["lon"], c["lat"]) if c else None


def dist_m(a, b):
    lat0 = math.radians((a[1] + b[1]) / 2)
    return math.hypot((a[0] - b[0]) * 111320 * math.cos(lat0), (a[1] - b[1]) * 110540)


def honorary(tags):
    """Honorære konsulater teller ikke som konsulat i reglene."""
    text = " ".join(tags.get(k, "") for k in ("diplomatic", "consulate", "name", "name:en", "name:no", "official_name")).lower()
    return "honor" in text


def poi_features(elements, extra=lambda tags: {}, skip=lambda tags: False):
    out = []
    for el in elements:
        tags = el.get("tags", {})
        name, pt = tags.get("name"), point_of(el)
        if not name or not pt or skip(tags):
            continue
        # Samme sted er ofte tegnet både som punkt og flate.
        if any(f["properties"]["name"] == name and dist_m(f["geometry"]["coordinates"], pt) < 300 for f in out):
            continue
        out.append({"type": "Feature", "properties": {"name": name, **extra(tags)},
                    "geometry": {"type": "Point", "coordinates": [round(pt[0], 6), round(pt[1], 6)]}})
    out.sort(key=lambda f: f["properties"]["name"])
    return out


def build_poi(out_dir, only=None):
    os.makedirs(f"{out_dir}/poi", exist_ok=True)
    for key, (area, selectors) in POI_TYPES.items():
        if only and key != only:
            continue
        bbox = WIDE if area == "WIDE" else BBOX
        q = "(" + "".join(f"{s}({bbox});" for s in selectors) + ");out center tags;"
        skip = honorary if key == "konsulat" else lambda tags: False
        write(f"{out_dir}/poi/{key}.geojson", poi_features(overpass(q, f"op-poi-{key}.json")["elements"], skip=skip))


def ring_center(ring):
    return sum(p[0] for p in ring) / len(ring), sum(p[1] for p in ring) / len(ring)


def in_multi(geom, pt):
    return any(ring_contains(poly[0], pt) for poly in geom["coordinates"])


def build_admin_norway(out_dir, admin):
    """
    Norske byer: fylker og kommuner fra Kartverket, bydeler fra OSM og postnummer fra Posten.
    Kommuner uten bydeler står inn som én bydel, så spørsmålet alltid har et svar.
    """
    fylke = [feature(name, kartverket("fylker", nr), 40) for nr, name in admin.get("fylker", {}).items()]
    kommune = [feature(name, kartverket("kommuner", nr), 10) for nr, name in admin["kommuner"].items()]

    try:
        rels = overpass(f'relation["boundary"="administrative"]["admin_level"="9"]({BBOX});out geom;', "op-bydeler.json")
    except SystemExit:
        # Overpass er nede. Kommuner og postnummer kommer fra Kartverket og bygges likevel.
        # Bydelene mangler da, og appen slår av det spørsmålet til skriptet kjøres på nytt.
        print("Overpass svarer ikke: bygger uten bydeler", file=sys.stderr)
        rels = None
    bydel = []
    for r in (rels or {"elements": []})["elements"]:
        f = feature(r["tags"]["name"], relation_geometry(r), 5)
        if not f["geometry"]["coordinates"]:
            continue
        # Bare bydeler i kommunene som er med.
        c = ring_center(f["geometry"]["coordinates"][0][0])
        if any(in_multi(k["geometry"], c) for k in kommune):
            bydel.append(f)
    for k in kommune if rels else []:
        if not any(in_multi(k["geometry"], ring_center(b["geometry"]["coordinates"][0][0])) for b in bydel):
            bydel.append(k)
    bydel.sort(key=lambda f: f["properties"]["name"])

    postnummer = build_postnummer()

    write(f"{out_dir}/admin.geojson", [
        {**f, "properties": {**f["properties"], "level": level}}
        for level, feats in (("fylke", fylke), ("kommune", kommune), ("bydel", bydel), ("postnummer", postnummer))
        for f in feats
    ])


# Grensene er bygget for hver by, siden kildene er ulike fra land til land.
# Står «admin» i cities.json som et oppslag med fylker og kommuner, brukes build_admin_norway.
ADMIN_BUILDERS = {"oslo": build_admin_oslo}


if __name__ == "__main__":
    city = sys.argv[1]
    with open(CITIES, encoding="utf-8") as f:
        cfg = json.load(f)[city]
    use_city(cfg)
    out = os.path.join(os.path.dirname(__file__), "..", "public", "data", city)
    os.makedirs(out, exist_ok=True)
    # Ett hurtigbuffer per by, siden filnavnene i bufferet er like for alle byer.
    CACHE = os.path.join(sys.argv[2], city) if len(sys.argv) > 2 else None
    if CACHE:
        os.makedirs(CACHE, exist_ok=True)
    only = sys.argv[3] if len(sys.argv) > 3 else None
    if only in (None, "admin"):
        admin = cfg.get("admin")
        builder = ADMIN_BUILDERS.get(admin) if isinstance(admin, str) else None
        if isinstance(admin, dict):
            build_admin_norway(out, admin)
        elif builder:
            builder(out)
        else:
            print(f"{city}: ingen grenser bygget (mangler «admin» i cities.json)")
    if only in (None, "poi"):
        build_poi(out)
    if only in POI_TYPES:
        build_poi(out, only)
    if only in (None, "shapes"):
        build_shapes(out)
