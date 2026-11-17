"""PasaHero training pipeline: synthetic hourly corridor data -> clean -> features -> model -> artifacts.

Outputs
  backend/artifacts/model.joblib, metrics.json, forecast_table.json
  frontend/src/data/generated.json  (bundled so the Vercel build works with zero backend)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.inspection import permutation_importance
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

sys.path.insert(0, str(Path(__file__).parent))
import config as C  # noqa: E402

ROOT = Path(__file__).resolve().parent
ART = ROOT / "artifacts"
FRONT = ROOT.parent / "frontend" / "src" / "data" / "generated.json"
SEED = 42
DAYS_OF_HISTORY = 140


# ---------------------------------------------------------------- data generation
def _gauss(h, mu, sd):
    return np.exp(-0.5 * ((h - mu) / sd) ** 2)


# Assumed BatStateU Alangilan class-shift windows (hour, spread, weight): morning arrivals before 7:00 classes,
# lunch change, afternoon-shift arrivals, 4-5 PM dismissal, evening-class dismissal. Replace with registrar data.
BATSTATEU_SHIFTS = [(6.5, 0.7, 1.0), (11.5, 0.6, 0.5), (13.0, 0.5, 0.45), (16.6, 0.8, 0.95), (20.0, 0.6, 0.3)]
# Assumed PPA Batangas Port ferry/RoRo arrival waves (hour). Replace with PPA vessel schedules.
PPA_FERRY_WAVES = (4.7, 8.2, 12.3, 16.6, 20.6)
# Batangas Grand Terminal bus arrival waves (hour); assumed.
BUS_WAVES = (5.5, 8.5, 12.5, 16.5, 19.5)


def hourly_shape(profile: str, hour: np.ndarray, weekend: np.ndarray) -> np.ndarray:
    """Relative demand by hour (peaks = class/work rush windows)."""
    h = hour.astype(float)
    am, pm = _gauss(h, 6.8, 1.1), _gauss(h, 17.2, 1.3)
    mid = _gauss(h, 12.0, 1.8)
    if profile == "campus":      # BatStateU Alangilan class shifts
        wd = sum(w * _gauss(h, mu, sd) for mu, sd, w in BATSTATEU_SHIFTS) + 0.12
        we = 0.30 * _gauss(h, 10, 3) + 0.08
    elif profile == "commute":   # work commute
        wd = 0.95 * am + 0.35 * mid + 1.0 * pm + 0.12
        we = 0.35 * _gauss(h, 11, 3.5) + 0.10
    elif profile == "bus":       # Bauan side: Grand Terminal bus arrival waves
        surge = sum(_gauss(h, t, 0.6) for t in BUS_WAVES)
        wd = 0.6 * am + 0.3 * mid + 0.6 * pm + 0.35 * surge + 0.10
        we = 0.45 * _gauss(h, 10, 3) + 0.2 * surge + 0.12
    elif profile == "ferry":     # Pier: PPA Batangas Port arrival waves
        surge = sum(_gauss(h, t, 0.7) for t in PPA_FERRY_WAVES)
        wd = 0.4 * am + 0.25 * mid + 0.4 * pm + 0.75 * surge + 0.08
        we = 0.4 * _gauss(h, 11, 3) + 0.6 * surge + 0.12
    else:                        # market (Pallocan): morning market + afternoon
        wd = 0.8 * _gauss(h, 7.0, 1.4) + 0.5 * mid + 0.7 * pm + 0.12
        we = 0.9 * _gauss(h, 8.0, 2.0) + 0.5 * _gauss(h, 16, 2.5) + 0.15
    out = np.where(weekend, we, wd)
    out = np.where((h < 4) | (h > 22), out * 0.15, out)  # off-service hours
    return out


def ferry_bus_surge(profile: str, hour: np.ndarray) -> np.ndarray:
    times = {"bus": BUS_WAVES, "ferry": PPA_FERRY_WAVES}.get(profile)
    if not times:
        return np.zeros(len(hour))
    return np.max([_gauss(hour, t, 0.7) for t in times], axis=0)


def simulate_rain(rng, n_days: int) -> np.ndarray:
    """Hourly rainfall (mm/hr). Day regimes persist; intensities are drawn so all PAGASA tiers occur."""
    wet = 0.25 + 0.2 * np.sin(np.arange(n_days) / n_days * np.pi)
    regime, out = 0, []
    for d in range(n_days):
        if rng.random() >= 0.35:  # spell ends -> new regime
            r = rng.random()
            regime = 0 if r > wet[d] else (1 if rng.random() < 0.65 else 2)
        hours = np.zeros(24)
        if regime:
            start, length = int(rng.integers(0, 16)), int(rng.integers(2, 9))
            scale = 1.8 if regime == 1 else 9.0     # drizzle-moderate vs heavy-and-above spells
            hours[start:start + length] = rng.gamma(2.0, scale / 2.0, size=min(length, 24 - start))
        out.append(hours)
    return np.concatenate(out)


def generate_data() -> pd.DataFrame:
    rng = np.random.default_rng(SEED)
    ts = pd.date_range("2026-03-02", periods=DAYS_OF_HISTORY * 24, freq="h")  # starts on a Monday
    rain = simulate_rain(rng, DAYS_OF_HISTORY)
    weather = np.array([C.weather_class(x) for x in rain])
    frames = []
    for route in C.ROUTES:
        df = pd.DataFrame({"ts": ts, "route": route["code"]})
        df["hour"] = df.ts.dt.hour
        df["dow"] = df.ts.dt.day_of_week
        df["rain_mm"] = rain
        df["weather"] = weather
        weekend = (df.dow >= 5).to_numpy()
        shape = hourly_shape(route["profile"], df.hour.to_numpy(), weekend)
        wmult = df.weather.map({"Clear": 1.0, "Light Rain": 1.08, "Heavy Rain": 1.14}).to_numpy()
        rush = ((df.hour.between(6, 8)) | (df.hour.between(16, 18))).to_numpy() & ~weekend
        # heavy rain at rush hour suppresses a bit (fewer trips make it onto the road)
        wmult = np.where((df.weather == "Heavy Rain").to_numpy() & rush, wmult * 0.93, wmult)
        sat_boost = np.where((route["profile"] == "market") & (df.dow == 5), 1.1, 1.0)
        trend = 1 + 0.0006 * np.arange(len(df)) / 24
        noise = rng.lognormal(0, 0.07, len(df))
        df["passengers"] = route["base"] * shape * wmult * sat_boost * trend * noise
        df["surge"] = ferry_bus_surge(route["profile"], df.hour.to_numpy())
        df["rush"] = rush.astype(int)
        frames.append(df)
    data = pd.concat(frames, ignore_index=True)
    # inject realistic dirt: sensor dropouts, a few spikes, duplicate rows
    n = len(data)
    drop = rng.choice(n, int(n * 0.01), replace=False)
    data.loc[drop, "passengers"] = np.nan
    spike = rng.choice(n, int(n * 0.002), replace=False)
    data.loc[spike, "passengers"] *= 6
    data = pd.concat([data, data.sample(60, random_state=SEED)], ignore_index=True)
    return data


# ---------------------------------------------------------------- cleaning + features
def clean(data: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    log = {"raw_rows": int(len(data))}
    data = data.drop_duplicates(["ts", "route"]).sort_values(["route", "ts"]).reset_index(drop=True)
    log["after_dedupe"] = int(len(data))
    log["missing_values"] = int(data.passengers.isna().sum())
    data["passengers"] = data.groupby("route").passengers.transform(lambda s: s.interpolate(limit_direction="both"))
    # clip outliers relative to per-route/hour median (robust to peaks)
    med = data.groupby(["route", "hour"]).passengers.transform("median")
    cap = med * 2.5 + 30
    log["outliers_clipped"] = int((data.passengers > cap).sum())
    data["passengers"] = np.minimum(data.passengers, cap)
    log["clean_rows"] = int(len(data))
    return data, log


FEATURES: list[str] = []


def add_features(df: pd.DataFrame, lag_cols: bool = True) -> pd.DataFrame:
    df = df.copy()
    df["hour_sin"] = np.sin(2 * np.pi * df.hour / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df.hour / 24)
    df["dow_sin"] = np.sin(2 * np.pi * df.dow / 7)
    df["dow_cos"] = np.cos(2 * np.pi * df.dow / 7)
    df["is_weekend"] = (df.dow >= 5).astype(int)
    df["rain_level"] = df.weather.map({"Clear": 0, "Light Rain": 1, "Heavy Rain": 2})
    for r in C.ROUTES:
        df[f"route_{r['code']}"] = (df.route == r["code"]).astype(int)
    if lag_cols:
        g = df.groupby("route").passengers
        df["lag_1h"] = g.shift(1)
        df["lag_24h"] = g.shift(24)
        df["lag_168h"] = g.shift(168)
        df["roll_mean_3h"] = g.shift(1).rolling(3).mean().reset_index(level=0, drop=True)
    return df


def feature_list() -> list[str]:
    return (["hour_sin", "hour_cos", "dow_sin", "dow_cos", "is_weekend", "rain_level", "rain_mm", "rush", "surge"]
            + [f"route_{r['code']}" for r in C.ROUTES]
            + ["lag_1h", "lag_24h", "lag_168h", "roll_mean_3h"])


# ---------------------------------------------------------------- forecast table for the frontend / API
def build_forecast_table(model, history: pd.DataFrame, rel_q: tuple[float, float]) -> list[dict]:
    """Recursive 24h forecast for every route x weekday x weather scenario."""
    profile = history.groupby(["route", "dow", "hour"]).passengers.mean()
    rows = []
    for route in C.ROUTES:
        for dow in range(7):
            for weather in C.WEATHER:
                prev = float(profile[(route["code"], (dow - 1) % 7, 23)])
                hist3 = [prev] * 3
                for hour in range(24):
                    pdow = (dow - 1) % 7
                    rec = {
                        "hour": hour, "dow": dow, "weather": weather, "route": route["code"], "rain_mm": C.SCENARIO_MM[weather],
                        "rush": int((6 <= hour <= 8 or 16 <= hour <= 18) and dow < 5),
                        "surge": float(ferry_bus_surge(route["profile"], np.array([hour]))[0]),
                        "passengers": 0.0,
                    }
                    rec["lag_1h"] = hist3[-1]
                    rec["lag_24h"] = float(profile[(route["code"], pdow, hour)])
                    rec["lag_168h"] = float(profile[(route["code"], dow, hour)])
                    rec["roll_mean_3h"] = float(np.mean(hist3))
                    X = add_features(pd.DataFrame([rec]), lag_cols=False)
                    for c in ("lag_1h", "lag_24h", "lag_168h", "roll_mean_3h"):
                        X[c] = rec[c]
                    pred = max(0.0, float(model.predict(X[FEATURES])[0]))
                    hist3 = hist3[1:] + [pred]
                    lo, hi = pred * (1 + rel_q[0]), pred * (1 + rel_q[1])
                    idx = C.congestion_index(pred, route["capacity_pph"], weather)
                    headway, active = C.dispatch(pred, route)
                    rows.append({
                        "route": route["code"], "day": C.DAYS[dow], "weather": weather, "hour": hour,
                        "demand": round(pred), "lo": round(lo), "hi": round(hi),
                        "congestion": idx, "headway": headway, "units": active,
                    })
    return rows


def main() -> None:
    ART.mkdir(exist_ok=True)
    raw = generate_data()
    data, clean_log = clean(raw)
    print("cleaning:", clean_log)

    global FEATURES
    FEATURES = feature_list()
    full = add_features(data).dropna(subset=["lag_168h", "roll_mean_3h"]).sort_values("ts").reset_index(drop=True)

    cut = full.ts.max() - pd.Timedelta(days=28)  # chronological split: last 4 weeks held out
    train, test = full[full.ts <= cut], full[full.ts > cut]
    model = HistGradientBoostingRegressor(max_iter=400, learning_rate=0.06, max_leaf_nodes=24,
                                          l2_regularization=0.5, random_state=SEED)
    model.fit(train[FEATURES], train.passengers)
    pred = model.predict(test[FEATURES])
    y = test.passengers.to_numpy()
    metrics = {
        "r2": round(float(r2_score(y, pred)), 4),
        "mae": round(float(mean_absolute_error(y, pred)), 2),
        "rmse": round(float(np.sqrt(mean_squared_error(y, pred))), 2),
        "train_rows": int(len(train)), "test_rows": int(len(test)),
        "model": "HistGradientBoostingRegressor",
        "split": "chronological, last 28 days held out",
    }
    print("metrics:", metrics)

    imp = permutation_importance(model, test[FEATURES], y, n_repeats=5, random_state=SEED, scoring="r2")
    groups = {
        "Lag 1h demand": ["lag_1h"], "Lag 24h demand": ["lag_24h"], "Lag 168h demand": ["lag_168h"],
        "3h rolling mean": ["roll_mean_3h"], "Hour of day (sin/cos)": ["hour_sin", "hour_cos"],
        "Day of week (sin/cos)": ["dow_sin", "dow_cos"], "Weekend flag": ["is_weekend"],
        "Weather (PAGASA mm/hr)": ["rain_level", "rain_mm"], "Rush window": ["rush"], "Terminal surge": ["surge"],
        "Route identity": [f"route_{r['code']}" for r in C.ROUTES],
    }
    raw_imp = dict(zip(FEATURES, np.clip(imp.importances_mean, 0, None)))
    grouped = {k: sum(raw_imp[f] for f in v) for k, v in groups.items()}
    total = sum(grouped.values()) or 1
    metrics["feature_importance"] = sorted(
        [{"feature": k, "importance": round(v / total, 4)} for k, v in grouped.items()],
        key=lambda d: -d["importance"])
    metrics["cleaning"] = clean_log

    rel = (y - pred) / np.maximum(pred, 20)
    rel_q = (float(np.quantile(rel, 0.10)), float(np.quantile(rel, 0.90)))
    table = build_forecast_table(model, data, rel_q)

    joblib.dump({"model": model, "features": FEATURES, "rel_q": rel_q}, ART / "model.joblib")
    (ART / "metrics.json").write_text(json.dumps(metrics, indent=2))
    (ART / "forecast_table.json").write_text(json.dumps(table))
    FRONT.parent.mkdir(parents=True, exist_ok=True)
    FRONT.write_text(json.dumps({"metrics": metrics, "routes": C.ROUTES, "forecast": table}, separators=(",", ":")))
    print(f"wrote {len(table)} forecast rows -> {FRONT}")


if __name__ == "__main__":
    main()
