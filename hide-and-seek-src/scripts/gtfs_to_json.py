#!/usr/bin/env python3
"""Bygger stations.json og lines.geojson for en by fra GTFS-feeden i scripts/cities.json.

En by kan ha flere nett (`networks` i cities.json), f.eks. T-bane og trikk. Hvert nett
har et transportmiddel (`mode`: metro, tram, lightrail eller bus), rutetypene som hører
til (`routeTypes`), og eventuelt `linePattern` (regulært uttrykk for linjenumrene, f.eks.
bare bybussene) og `lineColors`. Linjer uten farge får en fra PALETTE. Hver linje i
lines.geojson får `mode`, så appen kan la spillerne velge transportmidler.
Filene skrives til public/data/<by>/.

Bruk:
    curl -o gtfs.zip <gtfs.url fra cities.json>
    python3 scripts/gtfs_to_json.py <by> gtfs.zip
"""
import csv
import io
import json
import math
import os
import re
import sys
import zipfile
from collections import defaultdict
from datetime import date, datetime, timedelta

CITIES = os.path.join(os.path.dirname(__file__), "cities.json")
DAY_KEYS = {"wk": 2, "sa": 5, "su": 6}  # onsdag, lørdag, søndag
SIMPLIFY_M = 4.0
# Godt skillbare farger til linjer uten egen farge. Fordeles i linjenummerrekkefølge.
PALETTE = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#42d4f4", "#f032e6", "#9a6324",
           "#469990", "#800000", "#808000", "#000075", "#e6a800", "#2f9ad6", "#bf3eff", "#1d7a3a",
           "#d2691e", "#c71585", "#556b2f", "#4b0082", "#b22222", "#008080", "#8b4513", "#6a5acd"]


def line_key(name):
    """Sorterer linjenumre som tall: 2 før 10, X31 etter 31."""
    m = re.match(r"(\D*)(\d+)(.*)", name)
    return (int(m.group(2)), m.group(1), m.group(3)) if m else (10**9, name, "")


def rows(zf, name):
    with zf.open(name) as f:
        yield from csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig"))


def simplify(points, tol_m):
    """Douglas-Peucker på [lon, lat] med toleranse i meter."""
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
            if norm == 0:
                d = math.hypot(px - ax, py - ay)
            else:
                d = abs(dy * px - dx * py + bx * ay - by * ax) / norm
            if d > best:
                best, best_i = d, i
        if best > tol_m:
            keep[best_i] = True
            stack.append((a, best_i))
            stack.append((best_i, b))
    return [p for p, k in zip(points, keep) if k]


def main(city, src):
    with open(CITIES, encoding="utf-8") as f:
        gtfs = json.load(f)[city]["gtfs"]
    networks = gtfs["networks"]
    out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "data", city)
    os.makedirs(out_dir, exist_ok=True)
    zf = zipfile.ZipFile(src)

    def network_of(r):
        for n in networks:
            if r["route_type"] in n["routeTypes"] and ("linePattern" not in n or re.fullmatch(n["linePattern"], r["route_short_name"])):
                return n
        return None

    routes, mode_of = {}, {}
    # Noen feeder (som Ruters) har samme farge på alle linjene, så fargene kan settes i cities.json.
    line_colors = {}
    for r in rows(zf, "routes.txt"):
        n = network_of(r)
        if not n:
            continue
        line = r["route_short_name"]
        if mode_of.get(line, n["mode"]) != n["mode"]:
            raise SystemExit(f"Linje {line} finnes både som {mode_of[line]} og {n['mode']}. Gi den ene et prefiks.")
        routes[r["route_id"]] = r
        mode_of[line] = n["mode"]
        if line in n.get("lineColors", {}):
            line_colors[line] = n["lineColors"][line]
    trips = {t["trip_id"]: t for t in rows(zf, "trips.txt") if t["route_id"] in routes}

    # Dagene hver rute kjører: ukemønstre i calendar.txt (Kolumbus, AtB) og enkeltdatoer
    # i calendar_dates.txt (Ruter, Skyss), der unntakene legger til eller fjerner dager.
    service_dates = defaultdict(set)
    if "calendar.txt" in zf.namelist():
        weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        for c in rows(zf, "calendar.txt"):
            d = datetime.strptime(c["start_date"], "%Y%m%d").date()
            end = datetime.strptime(c["end_date"], "%Y%m%d").date()
            while d <= end:
                if c[weekdays[d.weekday()]] == "1":
                    service_dates[c["service_id"]].add(d.strftime("%Y%m%d"))
                d += timedelta(days=1)
    for r in rows(zf, "calendar_dates.txt"):
        if r["exception_type"] == "1":
            service_dates[r["service_id"]].add(r["date"])
        elif r["exception_type"] == "2":
            service_dates[r["service_id"]].discard(r["date"])
    used = {t["service_id"] for t in trips.values()}
    per_date = defaultdict(int)
    for sid in used:
        for d in service_dates[sid]:
            per_date[d] += 1
    all_dates = set(per_date)

    # Én representativ dato per dagtype: blant de fire første ukene, dagen med flest ruter i drift.
    # Slik unngås helligdager og dager med innstilt trafikk.
    first = datetime.strptime(min(all_dates), "%Y%m%d").date()
    rep = {}
    for key, weekday in DAY_KEYS.items():
        days = [first + timedelta(days=i) for i in range(28) if (first + timedelta(days=i)).weekday() == weekday]
        rep[key] = max((d.strftime("%Y%m%d") for d in days), key=lambda d: per_date.get(d, 0))

    stops = {s["stop_id"]: s for s in rows(zf, "stops.txt")}

    trip_stops = defaultdict(list)
    for st in rows(zf, "stop_times.txt"):
        if st["trip_id"] in trips:
            trip_stops[st["trip_id"]].append((int(st["stop_sequence"]), st["stop_id"], st["departure_time"]))

    def station_of(stop_id):
        return stops[stop_id]["parent_station"] or stop_id

    st_lines = defaultdict(set)
    st_quays = defaultdict(set)
    st_dep = defaultdict(lambda: {k: [0] * 24 for k in DAY_KEYS})
    patterns = defaultdict(lambda: defaultdict(list))  # route_id -> stasjonsrekkefølge -> trip_ids

    for trip_id, seq in trip_stops.items():
        seq.sort()
        trip = trips[trip_id]
        days = [k for k, d in rep.items() if d in service_dates[trip["service_id"]]]
        patterns[trip["route_id"]][tuple(station_of(s) for _, s, _ in seq)].append(trip_id)
        for i, (_, stop_id, dep) in enumerate(seq):
            sid = station_of(stop_id)
            st_quays[sid].add(stop_id)
            if i < len(seq) - 1:  # endestasjonen har ingen avgang
                hour = int(dep.split(":")[0]) % 24
                for k in days:
                    st_dep[sid][k][hour] += 1

    # Hovedmønsteret per linje: det lengste blant de vanlige kjøremønstrene. Slik
    # unngår vi at vognhallturer (f.eks. linje 2 til Avløs) legger stasjoner til en linje.
    best_trip = {}  # route_id -> (antall stopp, trip_id)
    for route_id, pats in patterns.items():
        common = max(len(t) for t in pats.values()) * 0.2
        main_pat = max((p for p, t in pats.items() if len(t) >= common), key=len)
        best_trip[route_id] = (len(main_pat), pats[main_pat][0])
        for sid in main_pat:
            st_lines[sid].add(routes[route_id]["route_short_name"])

    stations = []
    for sid, quays in st_quays.items():
        # Holdeplasser bare andre kjøremønstre stopper ved (f.eks. vognhallturer), er ikke med i spillet.
        if not st_lines[sid]:
            continue
        lat = sum(float(stops[q]["stop_lat"]) for q in quays) / len(quays)
        lon = sum(float(stops[q]["stop_lon"]) for q in quays) / len(quays)
        name = stops[sid]["stop_name"] if sid in stops else stops[next(iter(quays))]["stop_name"]
        stations.append({
            "id": sid.split(":")[-1],
            "name": name,
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "lines": sorted(st_lines[sid]),
            "dep": st_dep[sid],
        })
    stations.sort(key=lambda s: s["name"])

    shape_ids = {trips[tid]["shape_id"]: rid for rid, (_, tid) in best_trip.items()}
    shapes = defaultdict(list)
    for p in rows(zf, "shapes.txt"):
        if p["shape_id"] in shape_ids:
            shapes[p["shape_id"]].append((int(p["shape_pt_sequence"]), float(p["shape_pt_lon"]), float(p["shape_pt_lat"])))

    by_id = {s["id"]: s["name"] for s in stations}
    # Kolumbus har ikke navn på linjene. Da brukes endeholdeplassene.
    long_name = lambda order: f"{by_id.get(order[0], '?')} - {by_id.get(order[-1], '?')}"

    names = sorted({routes[rid]["route_short_name"] for rid in best_trip}, key=line_key)
    auto = {n: PALETTE[i % len(PALETTE)] for i, n in enumerate(names)}

    features = []
    for shape_id, pts in shapes.items():
        route = routes[shape_ids[shape_id]]
        pts.sort()
        coords = simplify([[round(lon, 5), round(lat, 5)] for _, lon, lat in pts], SIMPLIFY_M)
        line = route["route_short_name"]
        order = [station_of(s).split(":")[-1] for _, s, _ in trip_stops[best_trip[route["route_id"]][1]]]
        color = line_colors.get(line) or (f"#{route['route_color']}" if route.get("route_color") else auto[line])
        features.append({
            "type": "Feature",
            "properties": {"line": line, "mode": mode_of[line], "name": route["route_long_name"] or long_name(order), "color": color, "stations": order},
            "geometry": {"type": "LineString", "coordinates": coords},
        })
    order_of = {n["mode"]: i for i, n in enumerate(networks)}
    features.sort(key=lambda f: (order_of[f["properties"]["mode"]], line_key(f["properties"]["line"])))

    meta = {"source": gtfs.get("source", "GTFS"), "feedStart": min(all_dates), "feedEnd": max(all_dates), "days": rep}
    with open(f"{out_dir}/stations.json", "w", encoding="utf-8") as f:
        json.dump({"meta": meta, "stations": stations}, f, ensure_ascii=False, separators=(",", ":"))
    with open(f"{out_dir}/lines.geojson", "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f, ensure_ascii=False, separators=(",", ":"))
    modes = {m: sum(1 for f in features if f["properties"]["mode"] == m) for m in order_of}
    print(f"{len(stations)} stasjoner, {len(features)} linjer {modes}, dager {rep}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
