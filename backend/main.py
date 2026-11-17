"""PasaHero FastAPI service. Run: uvicorn main:app --reload --port 8000  (from backend/)"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

import config as C

ART = Path(__file__).parent / "artifacts"

app = FastAPI(title="PasaHero API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])


def _load(name: str):
    path = ART / name
    if not path.exists():
        raise HTTPException(503, "Model artifacts missing. Run `python train_model.py` first.")
    return json.loads(path.read_text())


def _slice(route: str, day: str, weather: str):
    if route not in {r["code"] for r in C.ROUTES}:
        raise HTTPException(404, f"Unknown route {route}")
    if day not in C.DAYS:
        raise HTTPException(422, f"day must be one of {C.DAYS}")
    if weather not in C.WEATHER:
        raise HTTPException(422, f"weather must be one of {C.WEATHER}")
    return [r for r in _load("forecast_table.json")
            if r["route"] == route and r["day"] == day and r["weather"] == weather]


@app.get("/api/routes")
def routes():
    return C.ROUTES


@app.get("/api/forecast")
def forecast(route: str = "BP-01", day: str = "Mon", weather: str = "Clear"):
    rows = _slice(route, day, weather)
    peak = max(rows, key=lambda r: r["demand"])
    return {"route": route, "day": day, "weather": weather, "peak": peak,
            "hourly": [{k: r[k] for k in ("hour", "demand", "lo", "hi", "congestion", "headway")} for r in rows]}


@app.get("/api/dispatch-plan")
def dispatch_plan(route: str = "BP-01", day: str = "Mon", weather: str = "Clear"):
    rows = _slice(route, day, weather)
    blocks = [("Early (04-06)", 4, 6), ("AM Rush (06-09)", 6, 9), ("Midday (09-15)", 9, 15),
              ("PM Rush (15-19)", 15, 19), ("Evening (19-23)", 19, 23)]
    plan = []
    for label, a, b in blocks:
        sel = [r for r in rows if a <= r["hour"] < b]
        plan.append({"block": label, "avg_demand": round(sum(r["demand"] for r in sel) / len(sel)),
                     "headway_min": min(r["headway"] for r in sel), "active_units": max(r["units"] for r in sel)})
    return {"route": route, "day": day, "weather": weather, "plan": plan}


@app.get("/api/metrics")
def metrics():
    return _load("metrics.json")
