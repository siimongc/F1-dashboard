"""Pipeline Maestro de Alta Velocidad para Apolo (FastF1 -> Raw -> Clean).

Sincronizado con v6.0 (Filtro de Circuitos e Ingeniería Espacial del Proyecto):
- Descarga datos de vueltas, clima y telemetría en el clúster.
- Procesa la limpieza anti-anomalías.
- Inyecta métricas implícitas de complejidad y estrés geométrico de pista.
- Filtra estrictamente las raíces de los 12 circuitos válidos para evitar Timeouts.
"""

import logging
from pathlib import Path
import pandas as pd
import fastf1

# Configuración de logs para el output de SLURM
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

# ── CONFIGURACIÓN DE RUTAS EN APOLO ──────────────────────────────────────────
BASE_DIR = Path("./data")
RAW_DIR = BASE_DIR / "raw"
PROCESSED_DIR = BASE_DIR / "processed"
CACHE_DIR = BASE_DIR / "fastf1_cache"

# Crear directorios del proyecto
CACHE_DIR.mkdir(parents=True, exist_ok=True)
RAW_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

# Habilitar la caché de FastF1 en Apolo
fastf1.Cache.enable_cache(str(CACHE_DIR))

# Configurar temporadas a procesar
TEMPORADAS = [2023, 2024, 2025]
MIN_LAPS_PER_COMPOUND = 20

# ── FILTRO ESTRICTO DE DATA QUALITY (VERSIÓN ULTRA-ROBUSTA) ──────────────────
# Se usan las raíces lingüísticas exactas de los nombres oficiales de la FIA
CIRCUITOS_PROYECTO = [
    "abu",        # Abu Dhabi Grand Prix / Yas Marina
    "austri",     # Austrian Grand Prix (Austria)
    "bahr",       # Bahrain Grand Prix
    "span",       # Spanish Grand Prix (Barcelona)
    "belg",       # Belgian Grand Prix (Spa)
    "canad",      # Canadian Grand Prix
    "hungar",     # Hungarian Grand Prix (Hungaroring)
    "japa",       # Japanese Grand Prix (Suzuka)
    "ital",       # Italian Grand Prix (Monza)
    "brit",       # British Grand Prix (Silverstone)
    "singap",     # Singapore Grand Prix
    "dutch"       # Dutch Grand Prix (Zandvoort)
]

# ── PIPELINE DE DESCARGA Y LIMPIEZA INTERACTIVA ──────────────────────────────

def process_session_core(year: int, grand_prix: str) -> None:
    """Descarga los datos crudos y genera los archivos procesados limpios."""
    log.info(f"🏎️  Procesando sesión: {year} - {grand_prix}")
    
    # 1. Descarga Completa desde la API de FastF1 (Vueltas + Clima + Telemetría)
    try:
        session = fastf1.get_session(year, grand_prix, 'R')
        session.load(laps=True, telemetry=True, weather=True)
    except Exception as e:
        log.error(f"❌ Error al descargar {year} {grand_prix}: {e}")
        return

    laps = session.laps
    if laps.empty:
        log.warning(f"⚠ Sesión vacía para {grand_prix}")
        return

    # Definir rutas de almacenamiento crudo (Raw)
    circuit_name_clean = grand_prix.replace(" ", "_")
    raw_circuit_dir = RAW_DIR / str(year) / circuit_name_clean
    raw_circuit_dir.mkdir(parents=True, exist_ok=True)

    # 2. Guardar Datos Crudos en Parquet (Copia de respaldo por seguridad académica)
    df_laps_raw = pd.DataFrame(laps)
    df_laps_raw.to_parquet(raw_circuit_dir / "lap_data.parquet", index=False)
    
    df_weather_raw = pd.DataFrame(session.weather_data)
    if not df_weather_raw.empty:
        df_weather_raw.to_parquet(raw_circuit_dir / "weather.parquet", index=False)

    try:
        car_channels = session.car_data
        # Corrección de estructura robusta para diccionarios y DataFrames en FastF1 v3.8+
        if car_channels is not None and len(car_channels) > 0:
            df_tel_raw = pd.DataFrame(car_channels)
            df_tel_raw.to_parquet(raw_circuit_dir / "telemetry.parquet", index=False)
    except Exception as e:
        log.warning(f"  No se pudo extraer telemetría fina para {grand_prix}: {e}")

    # 3. PIPELINE DE LIMPIEZA UNIFICADO (Generación de laps_clean.parquet)
    df = df_laps_raw.copy()

    # Ingeniería de la variable target: deg_rate (Tasa de desgaste continuo por vuelta)
    if "LapTime" in df.columns:
        # Conversión de Tiempos (Timedelta -> Float segundos)
        time_cols = ["LapTime", "Sector1Time", "Sector2Time", "Sector3Time"]
        for col in time_cols:
            if col in df.columns:
                df[col] = pd.to_timedelta(df[col], errors="coerce").dt.total_seconds()
        
        # Calcular el diferencial de tiempo entre vueltas sucesivas por piloto como proxy de desgaste
        df = df.sort_values(by=["Driver", "LapNumber"])
        df["deg_rate"] = df.groupby("Driver")["LapTime"].diff().fillna(0.0)

    # Estimación de Carga de Combustible (Modelo Físico Lineal)
    if "LapNumber" in df.columns:
        df["FuelLoad"] = 110.0 - (1.8 * pd.to_numeric(df["LapNumber"], errors="coerce"))
        df["FuelLoad"] = df["FuelLoad"].clip(lower=0.0, upper=110.0)

    # ── ADICIÓN DE NOCIÓN ESPACIAL EXPLÍCITA (CEREBRO GEOMÉTRICO) ────────────
    # Inyección de un mapa de complejidad técnica (1=rectas/Monza a 5=urbano/Singapur)
    mapeo_complejidad = {
        "singapore": 5.0, "monaco": 5.0, "hungar": 4.5, "dutch": 4.0,
        "japa": 3.8, "abu": 3.5, "canad": 3.0, "span": 3.0, "bahr": 3.0,
        "belg": 2.5, "austri": 2.0, "brit": 2.0, "ital": 1.0
    }
    
    # Encontrar la clave correspondiente basado en el nombre de la sesión actual
    gp_lower = grand_prix.lower()
    valor_complejidad = 3.0  # Valor base por defecto
    for k, v in mapeo_complejidad.items():
        if k in gp_lower:
            valor_complejidad = v
            break
            
    df["Track_Complexity"] = valor_complejidad
    
    # Variables de estrés térmico continuo y carga aerodinámica relativa
    if "TrackTemp" in df.columns and "TyreLife" in df.columns:
        df["Tyre_Thermal_Stress"] = df["TyreLife"] * df["TrackTemp"]
    elif "TrackTemp" in df.columns and "LapNumber" in df.columns:
        df["Tyre_Thermal_Stress"] = df["LapNumber"] * df["TrackTemp"]
        
    df["Aerodynamic_Load"] = df["FuelLoad"] * df["Track_Complexity"]
    # ─────────────────────────────────────────────────────────────────────────

    # Fusión de Clima (Merge asof rápido backward)
    if not df_weather_raw.empty and "LapStartTime" in df.columns:
        df_weather_raw["_t"] = pd.to_timedelta(df_weather_raw["Time"], errors="coerce").dt.total_seconds()
        df["_t"] = pd.to_timedelta(df["LapStartTime"], errors="coerce").dt.total_seconds()
        
        df_weather_raw = df_weather_raw.dropna(subset=["_t"]).sort_values("_t").reset_index(drop=True)
        df_sorted = df.sort_values("_t")
        
        weather_cols = [c for c in df_weather_raw.columns if c not in ("Time", "_t")]
        df = pd.merge_asof(df_sorted, df_weather_raw[["_t"] + weather_cols], on="_t", direction="backward")
        df = df.drop(columns=["_t"])
        
        # Rellenar lags térmicos iniciales
        for col in ["TrackTemp", "AirTemp"]:
            if col in df.columns:
                df[col] = df[col].ffill().bfill()

    # Filtrado de Condiciones Anómalas Severas (SC, VSC, Boxes)
    if "TrackStatus" in df.columns:
        ts_str = df["TrackStatus"].astype(str)
        mask_sc = ts_str.str.contains("4")
        mask_vsc = ts_str.str.contains("6")
        mask_inlap = df["PitInTime"].notna()
        mask_outlap = df["PitOutTime"].notna()
        
        mask_remove = mask_sc | mask_vsc | mask_inlap | mask_outlap
        df = df[~mask_remove].copy()

    # Limpieza final de nulos estructurales
    critical_cols = ["LapTime", "Sector1Time", "Sector2Time", "Sector3Time", "FuelLoad", "TrackTemp", "deg_rate"]
    df = df.dropna(subset=[c for c in critical_cols if c in df.columns])

    # Guardar en la carpeta final de procesamiento para XGBoost y GNN
    if len(df) >= MIN_LAPS_PER_COMPOUND:
        processed_circuit_dir = PROCESSED_DIR / str(year) / circuit_name_clean
        processed_circuit_dir.mkdir(parents=True, exist_ok=True)
        
        df.to_parquet(processed_circuit_dir / "laps_clean.parquet", index=False)
        log.info(f"  ✅ Guardado en processed: {year} - {circuit_name_clean} ({len(df)} vueltas válidas)")
    else:
        log.warning(f"  ⚠ {grand_prix} descartado por bajo volumen de datos ({len(df)} vueltas)")


# ── EJECUCIÓN PRINCIPAL CON FILTRADO GEOMÉTRICO ──────────────────────────────

def main():
    for year in TEMPORADAS:
        log.info(f"📅 Leyendo el calendario FIA para la temporada {year}...")
        try:
            schedule = fastf1.get_event_schedule(year)
            events = schedule[schedule["EventFormat"] != "testing"]["EventName"].tolist()
        except Exception as e:
            log.error(f"No se pudo mapear el calendario de {year}: {e}")
            continue

        for circuit in events:
            # INTERCEPCIÓN CAUSAL: Si la carrera no está en nuestra lista, ignorar inmediatamente
            if not any(target.lower() in circuit.lower() for target in CIRCUITOS_PROYECTO):
                log.info(f"  ⏩ Saltando {circuit} (No pertenece al núcleo del proyecto)")
                continue
                
            process_session_core(year, circuit)

    log.info("📊 ¡Pipeline de datos quirúrgico completado con éxito en Apolo!")

if __name__ == "__main__":
    main()