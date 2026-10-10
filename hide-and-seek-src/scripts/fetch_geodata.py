#!/usr/bin/env python3
"""Henter administrative grenser og steder (POI) én gang og skriver dem til public/data/.

Kilder:
  - Fylke og kommune: Kartverket (ws.geonorge.no/kommuneinfo)
  - Bydeler: OpenStreetMap via Overpass (admin_level=9, 15 bydeler + Sentrum og Marka)
  - Delbydeler: oslokommune/bydelsfakta (MIT), generaliserte grenser
  - POI: OpenStreetMap via Overpass

Bruk:
    python3 scripts/fetch_geodata.py public/data [cache-mappe]
"""
import json
import math
import os
import sys
import time
import urllib.parse
import urllib.request

UA = "hide-and-seek-oslo-databuild/1.0 (github.com/kristiangoystdal)"
OVERPASS = "https://overpass-api.de/api/interpreter"
BBOX = "59.78,10.38,60.06,11.00"  # dekker alle T-banestasjoner med margin
KARTVERKET = "https://ws.geonorge.no/kommuneinfo/v1"
BYDELSFAKTA = "https://raw.githubusercontent.com/oslokommune/bydelsfakta/master/src/config/geoData"
BYDEL_FILES = ["alna", "bjerke", "frogner", "gamle_oslo", "grorud", "grunerlokka", "nordre_aker", "nordstrand",
               "ostensjo", "sagene", "sondre_nordstrand", "st_hanshaugen", "stovner", "ullern", "vestre_aker"]

# Filnavnene må stemme med POI_TYPES i src/geo.ts.
POI_TYPES = {
    "kino": ('nwr["amenity"="cinema"]',),
    "sykehus": ('nwr["amenity"="hospital"]',),
    "museum": ('nwr["tourism"="museum"]',),
    "park": ('nwr["leisure"="park"]["name"]',),
    "bibliotek": ('nwr["amenity"="library"]',),
    "universitet": ('nwr["amenity"="university"]',),
    "svommehall": ('nwr["leisure"="sports_centre"]["sport"="swimming"]', 'nwr["leisure"="water_park"]'),
}
TALLEST_COUNT = 15
TALL_RE = "^([5-9][0-9]|1[0-9][0-9])"  # høyde 50–199 m

CACHE = None


def fetch(url, data=None, key=None):
    path = os.path.join(CACHE, key) if CACHE and key else None
    if path and os.path.exists(path):
        return open(path, encoding="utf-8").read()
    body = urllib.parse.urlencode(data).encode() if data else None
    for attempt in range(6):
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


def write(path, features):
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{path}: {len(features)} objekter, {os.path.getsize(path) // 1024} kB")


def build_admin(out_dir):
    baerum = kartverket("kommuner", "3201")
    fylke = [feature("Oslo", kartverket("fylker", "03"), 15), feature("Akershus", kartverket("fylker", "32"), 40)]
    kommune = [feature("Oslo", kartverket("kommuner", "0301"), 10), feature("Bærum", baerum, 10)]

    rels = overpass(f'relation["boundary"="administrative"]["admin_level"="9"]({BBOX});out geom;', "op-bydeler.json")
    bydel = [feature(r["tags"]["name"], relation_geometry(r), 5) for r in rels["elements"]]
    bydel.sort(key=lambda f: f["properties"]["name"])
    # Bærum har ingen bydeler: kommunen står inn som én «bydel» så spørsmålet alltid har svar.
    bydel.append(feature("Bærum", baerum, 10))

    delbydel = []
    for name in BYDEL_FILES:
        text = fetch(f"{BYDELSFAKTA}/{name}.js", key=f"bf-{name}.js")
        fc = json.loads(text[text.index("{"):].rstrip().rstrip(";"))
        parent = fc["name"].replace("Bydel ", "")
        for f in fc["features"]:
            delbydel.append(feature(f["properties"]["name"], f["geometry"], 0, bydel=parent))
    # Sentrum og Marka har ingen delbydeler i kommunens inndeling.
    for f in bydel:
        if f["properties"]["name"] in ("Sentrum", "Marka", "Bærum"):
            delbydel.append({**f, "properties": {"name": f["properties"]["name"], "bydel": f["properties"]["name"]}})

    write(f"{out_dir}/admin.geojson", [
        {**f, "properties": {**f["properties"], "level": level}}
        for level, feats in (("fylke", fylke), ("kommune", kommune), ("bydel", bydel), ("delbydel", delbydel))
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


def poi_features(elements, extra=lambda tags: {}):
    out = []
    for el in elements:
        tags = el.get("tags", {})
        name, pt = tags.get("name"), point_of(el)
        if not name or not pt:
            continue
        # Samme sted er ofte tegnet både som punkt og flate.
        if any(f["properties"]["name"] == name and dist_m(f["geometry"]["coordinates"], pt) < 300 for f in out):
            continue
        out.append({"type": "Feature", "properties": {"name": name, **extra(tags)},
                    "geometry": {"type": "Point", "coordinates": [round(pt[0], 6), round(pt[1], 6)]}})
    out.sort(key=lambda f: f["properties"]["name"])
    return out


def parse_height(tags):
    try:
        return float(tags.get("height", "").replace("m", "").replace(",", ".").strip())
    except ValueError:
        return 0.0


def build_poi(out_dir):
    os.makedirs(f"{out_dir}/poi", exist_ok=True)
    for key, selectors in POI_TYPES.items():
        q = "(" + "".join(f"{s}({BBOX});" for s in selectors) + ");out center tags;"
        write(f"{out_dir}/poi/{key}.geojson", poi_features(overpass(q, f"op-poi-{key}.json")["elements"]))

    q = f'(way["building"]["name"]["height"~"{TALL_RE}"]({BBOX});relation["building"]["name"]["height"~"{TALL_RE}"]({BBOX}););out center tags;'
    feats = poi_features(overpass(q, "op-poi-hoye.json")["elements"], lambda tags: {"height": parse_height(tags)})
    feats.sort(key=lambda f: -f["properties"]["height"])
    write(f"{out_dir}/poi/hoyeste_bygninger.geojson", feats[:TALLEST_COUNT])


if __name__ == "__main__":
    out = sys.argv[1]
    CACHE = sys.argv[2] if len(sys.argv) > 2 else None
    if CACHE:
        os.makedirs(CACHE, exist_ok=True)
    build_admin(out)
    build_poi(out)
