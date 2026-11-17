"""Fetch road-snapped polylines for the 5 PasaHero routes from OSRM and bake them into the frontend.

Usage: python scripts/fetch_osm_routes.py
Writes frontend/src/data/roads.json  ({code: [[lat, lon], ...]}).
Coordinates below are (lat, lon); OSRM wants lon,lat.
"""
import json
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "frontend" / "src" / "data" / "roads.json"
OSRM = "https://router.project-osrm.org/route/v1/driving/{coords}?overview=full&geometries=geojson&continue_straight=true"

ROUTES = {
    "BP-01": [(13.7844, 121.0743), (13.7735, 121.0665), (13.7645, 121.0620), (13.7568, 121.0585)],
    "BP-05": [(13.7975, 121.0622), (13.7820, 121.0575), (13.7695, 121.0608), (13.7568, 121.0585)],
    "BW-02": [(13.7917, 121.0085), (13.7845, 121.0265), (13.7730, 121.0455), (13.7638, 121.0535), (13.7568, 121.0585)],
    "BP-02": [(13.7568, 121.0585), (13.7605, 121.0485), (13.7547, 121.0448)],
    "BS-02": [(13.7568, 121.0585), (13.7552, 121.0675), (13.7556, 121.0766), (13.7495, 121.0845)],
}


def fetch(points, tries=4):
    coords = ";".join(f"{lon},{lat}" for lat, lon in points)
    req = urllib.request.Request(OSRM.format(coords=coords), headers={"User-Agent": "pasahero-portfolio-build/1.0"})
    for i in range(tries):
        try:
            try:
                with urllib.request.urlopen(req, timeout=30) as r:
                    data = json.load(r)
            except urllib.error.URLError as e:
                if "CERTIFICATE_VERIFY_FAILED" not in str(e):
                    raise
                # Python's trust store is stale on some machines; curl uses the OS store (verification stays on).
                out = subprocess.run(["curl", "-sS", "-m", "30", "-A", "pasahero-portfolio-build/1.0", req.full_url],
                                     capture_output=True, text=True, check=True).stdout
                data = json.loads(out)
            if data.get("code") != "Ok":
                raise RuntimeError(data.get("code"))
            route = data["routes"][0]
            return [[round(lat, 6), round(lon, 6)] for lon, lat in route["geometry"]["coordinates"]], route
        except Exception as e:  # noqa: BLE001
            print(f"  retry {i + 1}: {e}")
            time.sleep(2 * (i + 1))
    raise SystemExit("OSRM unreachable; keeping existing roads.json")


def main():
    out = {}
    for code, pts in ROUTES.items():
        line, route = fetch(pts)
        out[code] = {"line": line, "km": round(route["distance"] / 1000, 2), "min": round(route["duration"] / 60, 1)}
        print(f"{code}: {len(line)} vertices, {out[code]['km']} km, {out[code]['min']} min free-flow")
        time.sleep(1)
    OUT.write_text(json.dumps(out, separators=(",", ":")))
    print("wrote", OUT)


if __name__ == "__main__":
    main()
