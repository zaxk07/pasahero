"""Calibration constants for PasaHero (mirrored to the frontend through generated.json).

Provenance, kept honest:
  * Route codes/names ........ Batangas City Local Public Transport Route Plan (LPTRP) / LTFRB route codes.
  * Seat classes ............. 18-seat traditional PUJ, 26-seat modern PUJ (PUV Modernization Program).
  * Rainfall tiers ........... PAGASA rainfall-intensity categories (mm/hr).
  * Road length / travel time  OSRM driving routes over OpenStreetMap roads (scripts/fetch_osm_routes.py).
  * Fleet size, modern-unit share, class-shift windows, ferry waves: MODELLING ASSUMPTIONS informed by the
    sources above. They are not published figures; replace them with LTFRB franchise counts, the BatStateU
    registrar's timetable and PPA vessel schedules when those are obtained.
"""
import math

SEATS_TRADITIONAL = 18
SEATS_MODERN = 26
LOAD_FACTOR = 0.85          # planning load factor: dispatchers target ~85% of seats at the peak load point
TERMINAL_DWELL_MIN = 10     # loading + turnaround per round trip
STOP_PENALTY = 1.6          # jeepney run time vs OSRM car time (frequent loading stops)

# (route code, LPTRP name, color, OSRM one-way free-flow car minutes, OSRM km,
#  franchised units assumed on the route, share of 26-seat modern units, demand profile)
_RAW = [
    ("BP-01", "Alangilan – Bayan", "#E8590C", 10.9, 5.49, 30, 0.30, "campus", 520),
    ("BP-05", "Balagtas – Bayan", "#1C7ED6", 13.8, 8.30, 34, 0.25, "commute", 430),
    ("BW-02", "Bauan – Batangas", "#2F9E44", 18.7, 8.87, 40, 0.35, "bus", 480),
    ("BP-02", "Batangas – Pier", "#AE3EC9", 9.4, 3.74, 24, 0.20, "ferry", 390),
    ("BS-02", "Libjo / Pallocan – Bayan", "#C2255C", 15.1, 5.88, 36, 0.30, "market", 410),
]


def _route(code, name, color, car_min, km, fleet, modern, profile, base):
    run = car_min * STOP_PENALTY
    round_trip = round(2 * run + TERMINAL_DWELL_MIN)
    seats = SEATS_TRADITIONAL * (1 - modern) + SEATS_MODERN * modern
    capacity = fleet * 60 / round_trip * seats * LOAD_FACTOR
    return {
        "code": code, "name": name, "color": color, "profile": profile, "base": base,
        "km": km, "free_flow_min": round(run), "round_trip_min": round_trip,
        "fleet": fleet, "modern_share": modern, "avg_seats": round(seats, 1),
        "capacity_pph": round(capacity),
    }


ROUTES = [_route(*r) for r in _RAW]

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
WEATHER = ["Clear", "Light Rain", "Heavy Rain"]

# PAGASA rainfall intensity (mm/hr): light <=2.5, moderate 2.5-7.5, heavy 7.5-15, intense 15-30, torrential >30.
# Model classes: Clear = no rain, Light Rain = light/moderate tiers, Heavy Rain = heavy tier and above.
PAGASA_TIERS = [("Light", 0.1, 2.5), ("Moderate", 2.5, 7.5), ("Heavy", 7.5, 15.0), ("Intense", 15.0, 30.0), ("Torrential", 30.0, None)]
WEATHER_FROM_MM = [(7.5, "Heavy Rain"), (0.1, "Light Rain"), (0.0, "Clear")]
SCENARIO_MM = {"Clear": 0.0, "Light Rain": 3.0, "Heavy Rain": 12.0}  # representative mm/hr for forecast scenarios

WEATHER_CONGESTION_PENALTY = {"Clear": 0, "Light Rain": 4, "Heavy Rain": 10}
MIN_HEADWAY, MAX_HEADWAY = 2, 30


def weather_class(mm_per_hr: float) -> str:
    for floor, label in WEATHER_FROM_MM:
        if mm_per_hr >= floor:
            return label
    return "Clear"


def congestion_index(demand: float, capacity_pph: float, weather: str) -> float:
    return round(min(100.0, 100.0 * demand / capacity_pph + WEATHER_CONGESTION_PENALTY[weather]), 1)


def dispatch(demand: float, route: dict):
    """Headway (min) so seats on the road cover demand at LOAD_FACTOR; units = fleet needed for that headway."""
    units_per_hour = max(1, math.ceil(demand / (route["avg_seats"] * LOAD_FACTOR)))
    headway = int(min(MAX_HEADWAY, max(MIN_HEADWAY, round(60 / units_per_hour))))
    active = math.ceil(route["round_trip_min"] / headway)
    return headway, min(active, route["fleet"])


def congestion_label(idx: float) -> str:
    return "Free-Flow" if idx < 45 else "Moderate" if idx < 70 else "Heavy Bottleneck"
