"""GNN graph builder for ApexStrategy AI — v5.0 XGBoost + GAT Hybrid Model.

Transforms each lap snapshot into a torch_geometric.data.Data graph:
- Nodes: one per active driver, 13 features (9 base + 3 track + 1 XGBoost prior)
- Edges: kNN k=4 over temporal gap
- Node target y [N]: deg_rate (Tasa de desgaste físico continuo por vuelta)

Usage:
    python build_graphs.py
"""

from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from sklearn.neighbors import NearestNeighbors
from torch_geometric.data import Data
from xgboost import XGBRegressor  # <-- Nueva dependencia para ensamble secuencial

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger(__name__)

COMPOUND_MAP: dict[str, int] = {
    "SOFT": 0,
    "MEDIUM": 1,
    "HARD": 2,
    "INTERMEDIATE": 3,
    "WET": 4,
}

# Metadata macro técnica de los circuitos (Inyección causal en los nodos)
CIRCUIT_METADATA: dict[str, dict[str, float]] = {
    "AbuDhabi": {"downforce": 2.0, "width": 12.0, "longest_straight": 1240.0},
    "Austria": {"downforce": 2.0, "width": 13.0, "longest_straight": 860.0},
    "Bahrain": {"downforce": 2.0, "width": 15.0, "longest_straight": 1054.0},
    "Barcelona": {"downforce": 3.0, "width": 14.0, "longest_straight": 1047.0},
    "Belgium": {"downforce": 2.0, "width": 14.0, "longest_straight": 770.0},
    "Canada": {"downforce": 1.0, "width": 12.0, "longest_straight": 1195.0},
    "Hungary": {"downforce": 3.0, "width": 12.0, "longest_straight": 790.0},
    "Japan": {"downforce": 3.0, "width": 12.0, "longest_straight": 1200.0},
    "Monza": {"downforce": 1.0, "width": 12.0, "longest_straight": 1120.0},
    "Silverstone": {"downforce": 3.0, "width": 15.0, "longest_straight": 770.0},
    "Singapore": {"downforce": 3.0, "width": 10.0, "longest_straight": 500.0},
    "Zandvoort": {"downforce": 3.0, "width": 12.0, "longest_straight": 678.0},
}

K_NEIGHBORS = 4      

# ── CARGA DEL MODELO BASE XGBOOST ─────────────────────────────────────────────
XGB_MODEL_PATH = Path("models/xgb_final.json")
xgb_estimator = None

if XGB_MODEL_PATH.exists():
    xgb_estimator = XGBRegressor()
    xgb_estimator.load_model(str(XGB_MODEL_PATH))
    log.info("🚀 XGBoost prior técnico cargado con éxito para inyección en GAT.")
else:
    log.warning("⚠️ No se encontró models/xgb_final.json. Los nodos irán sin prior base.")

# Columnas exactas que tu train_xgb.py entrenó en estricto orden
XGB_FEATURES = [
    "compound_soft", "compound_medium", "compound_hard", 
    "compound_intermediate", "compound_wet",
    "track_status_code", "TyreLife", "tyrelife_squared", 
    "TyreAge_pct", "StintProgress",
    "TrackTemp", "AirTemp", "Rainfall", "Humidity", 
    "Pressure", "WindDirection", "WindSpeed", "FuelLoad"
]


# ── 1. Normalización segura ────────────────────────────────────────────────────

def safe_normalize(arr: np.ndarray) -> np.ndarray:
    arr = np.nan_to_num(arr, nan=0.0)
    ptp = np.ptp(arr)
    if ptp < 1e-8:
        return np.zeros_like(arr)
    return (arr - arr.min()) / ptp


# ── 2. Core graph construction ─────────────────────────────────────────────────

def build_graph(lap_telemetry: pd.DataFrame, circuit_name: str) -> Data:
    df = lap_telemetry.reset_index(drop=True)
    n = len(df)

    # ── 2.0 Inferencia del Prior con XGBoost ──────────────────────────────────
    if xgb_estimator is not None and all(c in df.columns for c in XGB_FEATURES):
        X_xgb = df[XGB_FEATURES].copy()
        # Forzar tipos numéricos planos para evitar errores de API C++
        for c in X_xgb.columns:
            if X_xgb[c].dtype == 'bool': 
                X_xgb[c] = X_xgb[c].astype(int)
        xgb_preds = xgb_estimator.predict(X_xgb).astype(np.float64)
    else:
        xgb_preds = np.zeros(n, dtype=np.float64)
        
    xgb_preds_norm = safe_normalize(xgb_preds)

    # ── Node features (9 dimensiones base) ────────────────────────────────────
    speed = df["SpeedST"].fillna(df["SpeedST"].mean()).values.astype(np.float64)
    speed_norm = safe_normalize(speed)

    pos_norm = ((df["Position"].values.astype(np.float64) - 1.0) / 19.0).clip(0.0, 1.0)

    pit_flag = df["PitInTime"].notna().astype(np.float64).values

    tyre_life = df["TyreLife"].fillna(0).values.astype(np.float64)
    tyre_life_norm = safe_normalize(tyre_life)

    stint = df["Stint"].fillna(1).values.astype(np.float64)
    stint_norm = safe_normalize(stint)

    lap_num = df["LapNumber"].fillna(1).values.astype(np.float64)
    lap_num_norm = safe_normalize(lap_num)

    compound_enc = df["Compound"].map(COMPOUND_MAP).fillna(1).values.astype(np.float64)
    compound_norm = compound_enc / 4.0

    fuel = df["FuelLoad"].fillna(df["FuelLoad"].median()).values.astype(np.float64)
    fuel_norm = safe_normalize(fuel)

    track_temp = df["TrackTemp"].fillna(df["TrackTemp"].median()).values.astype(np.float64)
    track_temp_norm = safe_normalize(track_temp)

    # ── Características de Contexto Físico de Circuito (3 dimensiones) ────────
    meta = CIRCUIT_METADATA.get(circuit_name, {"downforce": 2.0, "width": 12.0, "longest_straight": 800.0})
    downforce_feature = np.full(n, meta["downforce"] / 3.0)
    width_feature = np.full(n, meta["width"] / 16.0)
    straight_feature = np.full(n, meta["longest_straight"] / 1500.0)

# Consolidación de la Matriz de Nodos con Prior Físico no alterado
    x = torch.tensor(
        np.stack([
            speed_norm, pos_norm, pit_flag,
            tyre_life_norm, stint_norm, lap_num_norm,
            compound_norm, fuel_norm, track_temp_norm,
            downforce_feature, width_feature, straight_feature,
            xgb_preds  # <-- CAMBIO CLAVE: Entra directo en escala de segundos/vuelta
        ], axis=1),
        dtype=torch.float32,
    )
    # CORRECCIÓN DE DIMENSIÓN: X pasa a medir 13 dimensiones unificadas

    # ── kNN edges sobre estampa de tiempo unificada (Segundos Float) ──────────
    if pd.api.types.is_timedelta64_dtype(df["Time"]):
        t = df["Time"].dt.total_seconds().values.reshape(-1, 1)
    else:
        t = pd.to_numeric(df["Time"], errors="coerce").values.reshape(-1, 1)
        
    t = np.nan_to_num(t, nan=0.0)
    
    k = min(K_NEIGHBORS, n - 1)
    nbrs = NearestNeighbors(n_neighbors=k + 1).fit(t)
    distances, indices = nbrs.kneighbors(t)

    src = np.repeat(np.arange(n), k)
    tgt = indices[:, 1:].ravel()

    edge_index = torch.tensor(np.stack([src, tgt]), dtype=torch.long)

    # ── Edge attributes (3 dimensiones) ───────────────────────────────────────
    temporal_gap = np.abs(t[src, 0] - t[tgt, 0])
    closure_speed = speed[src] - speed[tgt]
    compound_delta = compound_enc[src] - compound_enc[tgt]

    edge_attr = torch.tensor(
        np.stack([temporal_gap, closure_speed, compound_delta], axis=1),
        dtype=torch.float32,
    )

    # ── TARGET DE REGRESIÓN CONTINUA (deg_rate) ──────────────────────────────
    if "deg_rate" in df.columns:
        y = torch.tensor(df["deg_rate"].values, dtype=torch.float32).view(-1, 1)
    else:
        y = torch.tensor(df["LapTime"].values, dtype=torch.float32).view(-1, 1)

    return Data(x=x, edge_index=edge_index, edge_attr=edge_attr, y=y)


# ── 3. Serialization ─────────────────────────────────────────────────────────

def serialize_session(
    session_df: pd.DataFrame,
    circuit: str,
    year: int,
    output_dir: str = "data/graphs",
) -> None:
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    saved = 0
    
    # Parches en caliente para asegurar compatibilidad de características con el XGBoost global
    df_lap_all = session_df.copy()
    if "compound_soft" not in df_lap_all.columns:
        for comp in ["soft", "medium", "hard", "intermediate", "wet"]:
            df_lap_all[f"compound_{comp}"] = (df_lap_all["Compound"].astype(str).str.upper() == comp.upper()).astype(int)
    if "track_status_code" not in df_lap_all.columns:
        df_lap_all["track_status_code"] = df_lap_all["TrackStatus"].fillna("1").astype(str).str.contains("4").astype(int)
    if "TyreAge_pct" not in df_lap_all.columns:
        df_lap_all["TyreAge_pct"] = df_lap_all["TyreLife"] / 35.0
    if "StintProgress" not in df_lap_all.columns:
        df_lap_all["StintProgress"] = 0.5
    if "tyrelife_squared" not in df_lap_all.columns:
        df_lap_all["tyrelife_squared"] = df_lap_all["TyreLife"] ** 2

    for lap_num, lap_df in df_lap_all.groupby("LapNumber"):
        if len(lap_df) < 2:
            continue
        g = build_graph(lap_df, circuit) 
        path = Path(output_dir) / f"{circuit}_{year}_lap{int(lap_num):03d}.pt"
        torch.save(g, path)
        saved += 1
    log.info("serialize_session: %s %d → %d graphs saved", circuit, year, saved)


def serialize_all_sessions(
    processed_dir: str = "data/processed",
    output_dir: str = "data/graphs",
) -> None:
    paths = list(Path(processed_dir).glob("**/laps_clean.parquet"))
    if not paths:
        raise FileNotFoundError(f"No laps_clean.parquet files found under {processed_dir}")
    for p in sorted(paths):
        year = int(p.parts[-3])
        circuit = p.parts[-2]
        df = pd.read_parquet(p)
        serialize_session(df, circuit, year, output_dir)
    log.info("serialize_all_sessions: %d sessions processed", len(paths))


def mean_knn_gap(session_df: pd.DataFrame, k: int = K_NEIGHBORS) -> float:
    gaps: list[float] = []
    for _, lap in session_df.groupby("LapNumber"):
        if pd.api.types.is_timedelta64_dtype(lap["Time"]):
            t = lap["Time"].dt.total_seconds().values
        else:
            t = pd.to_numeric(lap["Time"], errors="coerce").values
        t = np.nan_to_num(t, nan=0.0)
        n = len(t)
        if n < 2:
            continue
        ki = min(k, n - 1)
        nbrs = NearestNeighbors(n_neighbors=ki + 1).fit(t.reshape(-1, 1))
        distances, _ = nbrs.kneighbors(t.reshape(-1, 1))
        gaps.extend(distances[:, 1:].ravel().tolist())
    return float(np.mean(gaps))


def verify_traffic_density(
    circuit_a: str = "Singapore",
    circuit_b: str = "Bahrain",
    year: int = 2024,
    processed_dir: str = "data/processed",
) -> dict:
    def _load(circuit: str) -> pd.DataFrame:
        path = Path(processed_dir) / str(year) / circuit / "laps_clean.parquet"
        if not path.exists():
            raise FileNotFoundError(path)
        return pd.read_parquet(path)

    try:
        gap_a = mean_knn_gap(_load(circuit_a))
        gap_b = mean_knn_gap(_load(circuit_b))
        assert gap_a < gap_b, f"{circuit_a} mean kNN gap ({gap_a:.2f}s) not < {circuit_b} ({gap_b:.2f}s)"
        result = {circuit_a: gap_a, circuit_b: gap_b, "assertion": True}
    except Exception as e:
        log.warning("No se pudo completar la verificación cruzada de densidad de tráfico: %s", e)
        result = {"assertion": False}
        
    log.info("verify_traffic_density: %s", result)
    return result


def main() -> None:
    serialize_all_sessions("data/processed", "data/graphs")
    _ = verify_traffic_density("Singapore", "Bahrain", year=2024)


if __name__ == "__main__":
    main()