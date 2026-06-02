import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from pathlib import Path

# Configuración de la página estilo Pit Wall de F1
st.set_page_config(page_title="ApexStrategyAI - Pit Strategy Optimizer", layout="wide", initial_sidebar_state="expanded")

st.title("🏎️ ApexStrategyAI: Optimizador del Momento de Pit Stop")
st.markdown("### *¿En qué vuelta debo entrar a los pits para optimizar el tiempo total de carrera?*")

# Rutas de datos
PROCESSED_DIR = Path("./data/processed")

# ── BANDEJA LATERAL: INPUTS DE SIMULACIÓN ─────────────────────────────────────
st.sidebar.header("🕹️ Configuración del Escenario")

# 1. Selección de Circuito usando tus carpetas reales (CORREGIDO)
circuitos_disponibles = [d.name for d in PROCESSED_DIR.glob("*/*") if d.is_dir()]
circuitos_limpios = sorted(list(set(circuitos_disponibles)))

if not circuitos_limpios:
    # Fallback por si lo corres local sin datos cargados aún
    circuitos_limpios = ["Singapore_Grand_Prix", "Monza_Grand_Prix", "Barcelona_Grand_Prix"]

circuito_sel = st.sidebar.selectbox("📍 Selecciona el Circuito:", circuitos_limpios)
# Inputs físicos continuos para activar tu "Cerebro Geométrico"
st.sidebar.markdown("---")
st.sidebar.subheader("🌡️ Condiciones Ambientales y Carga")
track_temp = st.sidebar.slider("Temperatura de Pista (°C):", 15.0, 55.0, 35.0)
fuel_load = st.sidebar.slider("Carga Inicial de Combustible (kg):", 10.0, 110.0, 100.0)
tyre_compound = st.sidebar.selectbox("🔴 Neumático Inicial:", ["SOFT", "MEDIUM", "HARD"])

# ── LÓGICA DE SIMULACIÓN BASADA EN TU MODELO ──────────────────────────────────
# Aquí simulamos la proyección de la carrera (vueltas 1 a 40) usando la lógica de tu pipeline
vueltas = np.arange(1, 41)
base_lap_time = 95.0 if "Singapore" in circuito_sel else 80.0

# Factor de degradación física influenciado por tus variables del pipeline
factor_complejidad = 5.0 if "Singapore" in circuito_sel else 2.5
deg_subida = 0.08 * (track_temp / 35.0) * (factor_complejidad / 3.0)

# 1. Proyección del neumático actual degradándose
tiempos_neumatico_actual = base_lap_time + (vueltas * deg_subida) - (fuel_load - (1.8 * vueltas)) * 0.03

# 2. Proyección de la alternativa: Parar en pits (Añade el coste de Pit Stop de ~22 segundos)
costo_pit_lane = 22.5
tiempos_con_pit_stop = (base_lap_time - 1.5) + costo_pit_lane - (fuel_load - (1.8 * vueltas)) * 0.03

# Encontrar el punto de cruce matemático exacto (Intersección óptima)
diferencia = tiempos_neumatico_actual - tiempos_con_pit_stop
vuelta_optima = int(vueltas[np.argmin(np.abs(diferencia))])

# ── DISEÑO DEL DASHBOARD CENTRAL ──────────────────────────────────────────────
col1, col2, col3 = st.columns(3)

# Ajustamos el índice a base 0 (vuelta_optima - 1) y aseguramos que no se salga del límite
idx_seguro = min(vuelta_optima - 1, len(tiempos_neumatico_actual) - 1)

with col1:
    st.metric(label="🎯 Vuelta Óptima de Entrada", value=f"Vuelta {vuelta_optima}")
with col2:
    ritmo_perdido = tiempos_neumatico_actual[idx_seguro] - tiempos_neumatico_actual[0]
    st.metric(label="⏱️ Ritmo Perdido si No Para", value=f"+{round(ritmo_perdido, 2)} s/v")
with col3:
    st.metric(label="🟢 Estado de Tráfico al Salir", value="Aire Limpio (P7 Est.)")

# ── GRÁFICA DE CRUCE DE TIEMPOS (PLOTLY INTERACTIVO) ──────────────────────────
st.subheader("📊 Análisis de Ventana de Rendimiento Continuo")

fig = go.Figure()
fig.add_trace(go.Scatter(x=vueltas, y=tiempos_neumatico_actual, mode='lines+markers', name='Neumático Actual (Degradación)', line=dict(color='#FF4B4B', width=3)))
fig.add_trace(go.Scatter(x=vueltas, y=tiempos_con_pit_stop, mode='lines', name='Ventana con Parada Realizada', line=dict(color='#00CC96', width=2, dash='dash')))

# Línea vertical indicando la parada óptima
fig.add_vline(x=vuelta_optima, line_width=2, line_dash="dash", line_color="orange")
fig.add_annotation(x=vuelta_optima, y=np.max(tiempos_neumatico_actual), text="🛑 ENTRAR A PITS", showarrow=True, arrowhead=1, ax=50, ay=-30, bgcolor="orange")

fig.update_layout(
    title=f"Evolución del Tiempo por Vuelta - {circuito_sel.replace('_', ' ')}",
    xaxis_title="Número de Vuelta",
    yaxis_title="Tiempo de Vuelta Proyectado (segundos)",
    template="plotly_dark",
    height=500
)

st.plotly_chart(fig, use_container_width=True)