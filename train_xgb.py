"""Training, LOCO validation and prior serialization for ApexStrategy AI.

Sincronizado con v5.0 (Enfoque Híbrido):
- Entrada: data/processed/**/laps_clean.parquet (Salida directa del pipeline)
- Target: deg_rate (Tasa de desgaste físico por vuelta continuo)
- Salida: models/xgb_final.json (Prior técnico para la GNN)
"""

import sys
import logging
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger(__name__)

# ── Configuración de Entorno y Parámetros ─────────────────────────────────────
EXCLUDE_CIRCUITS = {"Monaco"}
TARGET = "deg_rate"  

BEST_PARAMS = {
    "n_estimators": 885,
    "max_depth": 9,
    "learning_rate": 0.02497483051037017,
    "subsample": 0.7890546520048931,
    "colsample_bytree": 0.7245010954750863,
    "random_state": 42,
}

# Características que el pipeline unificado garantiza o calcula en caliente
FEATURES = [
    "compound_soft", "compound_medium", "compound_hard", 
    "compound_intermediate", "compound_wet",
    "track_status_code", "TyreLife", "tyrelife_squared", 
    "TyreAge_pct", "StintProgress",
    "TrackTemp", "AirTemp", "Rainfall", "Humidity", 
    "Pressure", "WindDirection", "WindSpeed", "FuelLoad"
]

MONOTONE = tuple(1 if c in ["TyreAge_pct", "StintProgress"] else 0 for c in FEATURES)

# ── 1. Carga e Integración de Sesiones desde data/processed ──────────────────
def load_all_processed_data(processed_dir: Path) -> pd.DataFrame:
    paths = list(processed_dir.glob("**/laps_clean.parquet"))
    if not paths:
        log.error("✗ ERROR: No se encontraron archivos laps_clean.parquet en %s", processed_dir)
        log.error("  Asegúrate de que pipeline_apolo_total.py corra primero.")
        sys.exit(1)
        
    dfs = []
    for p in sorted(paths):
        year = int(p.parts[-3])
        circuit = p.parts[-2]
        
        df_lap = pd.read_parquet(p)
        df_lap["year"] = year
        df_lap["circuit"] = circuit
        
        # Ingeniería de características rápida en caliente para compatibilidad con XGBoost
        if "compound_soft" not in df_lap.columns:
            for comp in ["soft", "medium", "hard", "intermediate", "wet"]:
                df_lap[f"compound_{comp}"] = (df_lap["Compound"].astype(str).str.upper() == comp.upper()).astype(int)
        
        if "track_status_code" not in df_lap.columns:
            df_lap["track_status_code"] = df_lap["TrackStatus"].fillna("1").astype(str).str.contains("4").astype(int)
            
        if "TyreAge_pct" not in df_lap.columns:
            df_lap["TyreAge_pct"] = df_lap["TyreLife"] / 35.0
            
        if "StintProgress" not in df_lap.columns:
            df_lap["StintProgress"] = 0.5
            
        if "tyrelife_squared" not in df_lap.columns:
            df_lap["tyrelife_squared"] = df_lap["TyreLife"] ** 2
            
        dfs.append(df_lap)
        
    combined_df = pd.concat(dfs, ignore_index=True)
    return combined_df

log.info("========== Paso 1: Cargando y compilando sesiones procesadas ==========")
df = load_all_processed_data(Path("data/processed"))

# Filtros de limpieza finales para evitar colapsos en la matriz lineal
df = df[~df["circuit"].isin(EXCLUDE_CIRCUITS)].dropna(subset=[TARGET] + FEATURES)
log.info("Filas consolidadas para XGBoost: %d en %d circuitos diferentes.", len(df), len(df['circuit'].unique()))

# ── 2. Data Split de Control (Train, Val, Test) ──────────────────────────────
df_train, df_temp = train_test_split(df, test_size=0.30, random_state=42)
df_val, df_test = train_test_split(df_temp, test_size=0.50, random_state=42)

X_train, y_train = df_train[FEATURES], df_train[TARGET]
X_val, y_val = df_val[FEATURES], df_val[TARGET]
X_test, y_test = df_test[FEATURES], df_test[TARGET]

# Asegurar tipos numéricos puros para la API C++ de XGBoost
for dataset in [X_train, X_val, X_test]:
    for col in dataset.columns:
        if dataset[col].dtype == 'bool':
            dataset[col] = dataset[col].astype(int)

# ── 3. Entrenamiento con Parada Temprana ──────────────────────────────────────
log.info("\n" + "=" * 60)
log.info("🚀 ENTRENANDO XGBOOST PRIOR (DEG_RATE BASE FÍSICA)")
log.info("=" * 60)

model = XGBRegressor(
    **BEST_PARAMS,
    monotone_constraints=MONOTONE,
    early_stopping_rounds=50,
)
model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)

y_pred_test = model.predict(X_test)
mae_test = mean_absolute_error(y_test, y_pred_test)
r2_test = r2_score(y_test, y_pred_test)
log.info("📊 Métricas Globales de Test -> MAE: %.4f s/vuelta | R²: %.4f", mae_test, r2_test)

# ── 4. Leave-One-Circuit-Out (LOCO) para Validar Generalización ───────────────
log.info("\n" + "=" * 60)
log.info("🌍 EVALUACIÓN LOCO (Generalización a pistas ocultas)")
log.info("=" * 60)
all_circuits = sorted(df["circuit"].unique())
loco_results = []

for hold_out in all_circuits:
    df_tr = df[df["circuit"] != hold_out]
    df_te = df[df["circuit"] == hold_out]
    
    if len(df_te) < 10: 
        continue
    
    X_tr, y_tr = df_tr[FEATURES].copy(), df_tr[TARGET]
    X_te, y_te = df_te[FEATURES].copy(), df_te[TARGET]

    # Ajuste de tipos booleanos rápido para el ciclo iterativo
    for c in X_tr.columns:
        if X_tr[c].dtype == 'bool': X_tr[c] = X_tr[c].astype(int)
        if X_te[c].dtype == 'bool': X_te[c] = X_te[c].astype(int)

    m = XGBRegressor(**BEST_PARAMS, monotone_constraints=MONOTONE)
    m.fit(X_tr, y_tr, verbose=False)
    y_p = m.predict(X_te)

    mae_lo = mean_absolute_error(y_te, y_p)
    r2_lo = r2_score(y_te, y_p)
    loco_results.append({"circuito": hold_out, "MAE": round(mae_lo, 4), "R2": round(r2_lo, 4)})
    log.info("  Pista oculta [%-15s] -> MAE: %.4f s/v | R²: %.4f", hold_out, mae_lo, r2_lo)

loco_r2_avg = np.mean([r["R2"] for r in loco_results])
log.info("  -> 🏁 R² Promedio LOCO en Apolo: %.4f", loco_r2_avg)

# ── 5. Almacenamiento de Artefactos Estructurados ─────────────────────────────
Path("models").mkdir(exist_ok=True)
Path("reports/plots").mkdir(parents=True, exist_ok=True)

# Guardar el JSON en la ruta exacta que leerá tu build_graphs.py híbrido
model.save_model("models/xgb_final.json")
log.info("✓ Artefacto guardado con éxito en 'models/xgb_final.json'")

# Exportar métricas numéricas del LOCO para el reporte del equipo
pd.DataFrame(loco_results).to_csv("reports/xgb_loco_metrics.csv", index=False)
log.info("✓ Reporte LOCO guardado en 'reports/xgb_loco_metrics.csv'")