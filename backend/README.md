# PasaHero backend

Python pipeline and API for jeepney demand forecasting on five Batangas City routes.

```bash
pip install -r requirements.txt
python train_model.py          # generates data, trains, writes artifacts/ and ../frontend/src/data/generated.json
uvicorn main:app --port 8000   # run from this folder
```

- `train_model.py` builds synthetic hourly data (rush windows, weekday/weekend, weather, ferry/bus surges), cleans it, adds lag and cyclical features, trains a HistGradientBoostingRegressor on a chronological split, and writes metrics (R2, MAE, RMSE).
- `main.py` exposes `/api/routes`, `/api/forecast`, `/api/dispatch-plan`, `/api/metrics`.
- `config.py` holds route metadata and the congestion/headway rules, mirrored in the frontend.

The data is synthetic: metrics demonstrate the pipeline, not real-world accuracy.

## Road geometry
`python ../scripts/fetch_osm_routes.py` queries OSRM for road-snapped polylines and writes `frontend/src/data/roads.json` (bundled, so the site works offline).

## Calibration
See the docstring in `config.py` and the Model & Data page: route codes, seat classes (18/26) and PAGASA rainfall tiers are taken from the named sources; fleet sizes, BatStateU class shifts and PPA ferry waves are labelled assumptions.
