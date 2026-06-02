import { useState, useMemo } from 'react'
import DegradationCharts from './DegradationCharts'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea, Cell, LabelList,
} from 'recharts'

const C = {
  red:       '#E10600',
  orange:    '#FF6B35',
  yellow:    '#FFD700',
  green:     '#00D27A',
  blue:      '#4DA8DA',
  gray:      '#8B8BA3',
  surface:   '#1E1E2E',
  surfaceAlt:'#252538',
  border:    '#2A2A40',
  white:     '#FFFFFF',
  lightGray: '#C4C4D4',
}

const axisStyle = {
  fill: C.gray,
  fontFamily: "'Titillium Web', sans-serif",
  fontSize: 10,
}

// Maps tracks.json circuit ids → stints.json keys
const TRACKS_TO_STINTS = {
  'abu_dhabi': 'Abu_Dhabi_Grand_Prix',
  'austria':   'Austrian_Grand_Prix',
  'bahrain':   'Bahrain_Grand_Prix',
  'belgium':   'Belgian_Grand_Prix',
  'british':   'British_Grand_Prix',
  'canada':    'Canadian_Grand_Prix',
  'dutch':     'Dutch_Grand_Prix',
  'hungary':   'Hungarian_Grand_Prix',
  'italy':     'Italian_Grand_Prix',
  'japan':     'Japanese_Grand_Prix',
  'singapore': 'Singapore_Grand_Prix',
  'spain':     'Spanish_Grand_Prix',
}

function NarrativeHeader({ n, title, subtitle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
        <span style={{
          background: C.red, color: C.white, fontSize: 9, fontWeight: 900,
          padding: '3px 8px', borderRadius: 2, letterSpacing: '0.1em', flexShrink: 0, marginTop: 2,
        }}>{n}</span>
        <span style={{
          color: C.white, fontWeight: 700, fontSize: 14,
          letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.35,
        }}>{title}</span>
      </div>
      <div style={{ color: C.gray, fontSize: 11, marginLeft: 36, lineHeight: 1.6 }}>{subtitle}</div>
    </div>
  )
}

function InsightPill({ color, children }) {
  return (
    <div style={{
      marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8,
      background: color + '14', border: `1px solid ${color}40`,
      borderRadius: 4, padding: '8px 14px', fontFamily: "'Titillium Web', sans-serif",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ color: C.lightGray, fontSize: 11, lineHeight: 1.4 }}>{children}</span>
    </div>
  )
}

export default function CircuitComparison({ circuits }) {
  const [selectedId, setSelectedId] = useState('bahrain')

  const selected    = circuits.find(c => c.id === selectedId) || circuits[0]
  const above90     = circuits.filter(c => c.gnn.r2 >= 0.90).length
  const below90     = circuits.length - above90
  const accentCol   = selected.gnn.r2 >= 0.90 ? C.green : C.orange
  const stintsKey   = TRACKS_TO_STINTS[selectedId] ?? 'Bahrain_Grand_Prix'
  const negXgb      = circuits.filter(c => c.xgb.r2 < 0).length

  // Business KPIs computed from circuits data
  const avgReductionPct = Math.round(
    circuits.reduce((s, c) => s + (c.xgb.mae - c.gnn.mae) / c.xgb.mae * 100, 0) / circuits.length
  )
  const avgGnnMae = (circuits.reduce((s, c) => s + c.gnn.mae, 0) / circuits.length).toFixed(2)
  const avgXgbMae = (circuits.reduce((s, c) => s + c.xgb.mae, 0) / circuits.length).toFixed(1)
  const totalGraphs = circuits.reduce((s, c) => s + c.gnn.n_graphs, 0)

  const r2Data = useMemo(() =>
    [...circuits]
      .sort((a, b) => a.gnn.r2 - b.gnn.r2)
      .map(c => ({ id: c.id, label: c.name.replace(' GP', ''), r2: +c.gnn.r2.toFixed(4) })),
  [circuits])

  return (
    <div style={{ fontFamily: "'Titillium Web', sans-serif", display: 'flex', flexDirection: 'column', gap: 44 }}>

      {/* ── Business KPI strip ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { label: 'Circuitos accionables',       value: `${above90} / ${circuits.length}`, color: C.green,  sub: 'R² ≥ 90% sin ver en entrenamiento' },
          { label: 'Error por vuelta (XGB → GNN)', value: `${avgXgbMae}s → ${avgGnnMae}s`,  color: C.orange, sub: 'reducción del error de predicción' },
          { label: 'Reducción vs baseline',        value: `${avgReductionPct}%`,             color: C.green,  sub: 'ventaja GNN sobre XGBoost' },
          { label: 'Grafos de telemetría',          value: `${totalGraphs}`,                  color: C.blue,   sub: 'vueltas reales analizadas 2023–2025' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} style={{
            flex: '1 1 160px', background: C.surfaceAlt,
            border: `1px solid ${C.border}`, borderRadius: 4,
            padding: '12px 16px', textAlign: 'center',
          }}>
            <div style={{ color, fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{value}</div>
            <div style={{ color: C.gray, fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: 5 }}>{label}</div>
            {sub && <div style={{ color: C.gray, fontSize: 9, marginTop: 3 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Chart 1: Viabilidad global ── */}
      <div>
        <NarrativeHeader
          n="01"
          title={`Viabilidad global: predicción confiable en ${above90} de ${circuits.length} circuitos del calendario`}
          subtitle={`Para adoptarlo en el Pit Wall, el sistema debe funcionar en el calendario completo — no solo en pistas conocidas. La validación LOCO (Leave-One-Circuit-Out) es el examen más estricto: el modelo se prueba en circuitos que nunca vio durante el entrenamiento. ${above90} de ${circuits.length} circuitos superan el 90% de variación explicada. Haz clic en una barra para ver el análisis completo de carrera.`}
        />

        <div style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>

          {/* Barras */}
          <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '16px 16px 8px 8px' }}>
            <ResponsiveContainer width="100%" height={420}>
              <BarChart
                data={r2Data}
                layout="vertical"
                margin={{ top: 4, right: 56, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                <XAxis
                  type="number" domain={[0, 1.05]} tick={axisStyle}
                  axisLine={false} tickLine={false} tickFormatter={v => v.toFixed(1)}
                />
                <YAxis
                  type="category" dataKey="label" tick={{ ...axisStyle, fontSize: 10 }}
                  axisLine={false} tickLine={false} width={90}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div style={{ background: '#1A1A2A', border: `1px solid ${C.border}`, borderRadius: 4, padding: '8px 12px', fontFamily: "'Titillium Web', sans-serif", fontSize: 11 }}>
                        <div style={{ color: C.white, fontWeight: 700, marginBottom: 4 }}>{d.label}</div>
                        <div style={{ color: d.r2 >= 0.90 ? C.green : C.orange }}>R²: <b>{d.r2.toFixed(4)}</b></div>
                        <div style={{ color: C.gray, fontSize: 10, marginTop: 3 }}>
                          {d.r2 >= 0.90 ? '✓ Accionable para decisiones de carrera' : '⚠ Desgaste bajo — incertidumbre alta'}
                        </div>
                        <div style={{ color: C.gray, fontSize: 9, marginTop: 2 }}>Clic para ver análisis de carrera</div>
                      </div>
                    )
                  }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <ReferenceLine x={0.90} stroke={C.green} strokeDasharray="6 3" strokeWidth={1.5}
                  label={{ value: '0.90', position: 'insideTopRight', fill: C.green, fontSize: 8.5, fontFamily: "'Titillium Web', sans-serif", dy: -4 }} />
                <Bar
                  dataKey="r2"
                  radius={[0, 3, 3, 0]}
                  barSize={22}
                  isAnimationActive
                  animationDuration={600}
                  onClick={d => setSelectedId(d.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <LabelList
                    dataKey="r2" position="right"
                    style={{ fill: C.lightGray, fontSize: 10, fontFamily: "'Titillium Web', sans-serif", fontWeight: 700 }}
                    formatter={v => v.toFixed(3)}
                  />
                  {r2Data.map(d => (
                    <Cell
                      key={d.id}
                      fill={d.id === selectedId ? C.white : d.r2 >= 0.90 ? C.green : '#3A3A58'}
                      opacity={d.id === selectedId ? 1 : 0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Panel derecho — número grande */}
          <div style={{
            width: 240, flexShrink: 0,
            background: C.surfaceAlt,
            border: `1px solid ${accentCol}`,
            borderRadius: 4, padding: '28px 24px',
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', gap: 16,
            transition: 'border-color 0.3s',
          }}>
            <div>
              <div style={{ fontSize: 36, lineHeight: 1 }}>{selected.flag}</div>
              <div style={{ color: C.lightGray, fontSize: 13, fontWeight: 700, marginTop: 6 }}>
                {selected.name}
              </div>
              <div style={{ color: C.gray, fontSize: 9.5, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Circuito seleccionado
              </div>
            </div>

            <div>
              <div style={{ color: accentCol, fontSize: 60, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', transition: 'color 0.3s' }}>
                {selected.gnn.r2.toFixed(4)}
              </div>
            </div>

            <div style={{
              color: C.lightGray, fontSize: 12, lineHeight: 1.6,
              borderTop: `1px solid ${C.border}`, paddingTop: 14,
            }}>
              El modelo explica el{' '}
              <span style={{ color: accentCol, fontWeight: 700 }}>
                {(selected.gnn.r2 * 100).toFixed(1)}%
              </span>{' '}
              de la variación real en el desgaste
            </div>

            <div style={{ color: C.gray, fontSize: 10, lineHeight: 1.5 }}>
              Error GNN: <span style={{ color: C.green, fontWeight: 700 }}>{selected.gnn.mae.toFixed(3)}s/vuelta</span>
              <br />
              Error XGB: <span style={{ color: selected.xgb.r2 < 0 ? C.red : C.lightGray, fontWeight: 700 }}>{selected.xgb.mae.toFixed(3)}s/vuelta</span>
            </div>
          </div>
        </div>

        <InsightPill color={C.green}>
          Deployable hoy en <b>{above90} circuitos</b> del calendario. Los {below90} circuitos bajo el umbral (desgaste bajo o variable) muestran incertidumbre alta — el modelo los señala correctamente, lo que ya es información de valor para el estratega.
        </InsightPill>
      </div>

      {/* ── Chart 2: Mitigación de riesgo ── */}
      <div>
        <NarrativeHeader
          n="02"
          title="Mitigación de riesgo: la GNN elimina las estrategias erróneas donde XGBoost colapsa"
          subtitle={`XGBoost evalúa cada vuelta de forma aislada, fila por fila, ignorando las interacciones entre monoplazas. En circuitos de alto tráfico (Singapur, Canadá, Bélgica), colapsa completamente — R² negativo significa que adivinar el promedio sería más preciso. La GNN modela la carrera como grafo dinámico, capturando estelas de turbulencia, tráfico obstruido y degradación diferencial entre compuestos.`}
        />

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '16px 16px 8px 4px' }}>

          {/* Leyenda */}
          <div style={{ display: 'flex', gap: 20, paddingLeft: 16, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: C.green, display: 'inline-block' }} />
              <span style={{ color: C.gray, fontSize: 14 }}>GNN GAT v5.1 <span style={{ color: C.white, fontWeight: 700 }}>· R²</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: '#4A4A68', display: 'inline-block' }} />
              <span style={{ color: C.gray, fontSize: 14 }}>XGBoost <span style={{ color: C.white, fontWeight: 700 }}>· R²</span></span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.red, opacity: 0.5, display: 'inline-block' }} />
                <span style={{ color: C.gray, fontSize: 9 }}>Estrategia errónea (R² &lt; 0)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.green, opacity: 0.3, display: 'inline-block' }} />
                <span style={{ color: C.gray, fontSize: 9 }}>Alta confianza (R² ≥ 0.90)</span>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={340}>
            <BarChart
              data={[...circuits]
                .sort((a, b) => b.gnn.r2 - a.gnn.r2)
                .map(c => ({
                  id:    c.id,
                  label: c.name.replace(' GP', ''),
                  name:  c.name,
                  gnn:   +c.gnn.r2.toFixed(4),
                  xgb:   +c.xgb.r2.toFixed(4),
                }))}
              margin={{ top: 8, right: 16, left: 8, bottom: 20 }}
              barCategoryGap="8%"
              barGap={2}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <ReferenceArea y1={-4.5} y2={0} fill={C.red} fillOpacity={0.06} />
              <ReferenceArea y1={0.90} y2={1.05} fill={C.green} fillOpacity={0.06} />

              <XAxis dataKey="label" tick={{ ...axisStyle, fontSize: 9 }}
                axisLine={false} tickLine={false}
                interval={0} angle={-35} textAnchor="end" height={60} />
              <YAxis domain={[-4.5, 1.05]} tick={axisStyle} axisLine={false} tickLine={false}
                tickFormatter={v => v.toFixed(1)} width={36}
                label={{ value: 'R²', angle: -90, position: 'insideLeft', offset: 12, fill: C.gray, fontSize: 9, fontFamily: "'Titillium Web', sans-serif" }} />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  return (
                    <div style={{ background: '#1A1A2A', border: `1px solid ${C.border}`, borderRadius: 4, padding: '10px 14px', fontFamily: "'Titillium Web', sans-serif", fontSize: 11 }}>
                      <div style={{ color: C.white, fontWeight: 700, marginBottom: 8 }}>{d?.name}</div>
                      <div style={{ color: C.green, marginBottom: 3 }}>
                        GNN: <b>{d?.gnn?.toFixed(4)}</b>
                        <span style={{ color: C.gray, fontSize: 9, marginLeft: 6 }}>
                          {d?.gnn >= 0.90 ? '✓ Accionable' : ''}
                        </span>
                      </div>
                      <div style={{ color: d?.xgb < 0 ? C.red : C.lightGray }}>
                        XGBoost: <b>{d?.xgb?.toFixed(4)}</b>
                        <span style={{ fontSize: 9, marginLeft: 6, color: C.red }}>
                          {d?.xgb < 0 ? '✗ Estrategia errónea' : ''}
                        </span>
                      </div>
                      {d?.xgb < 0 && d?.gnn >= 0.90 && (
                        <div style={{ color: C.orange, fontSize: 10, marginTop: 6, borderTop: `1px solid ${C.border}`, paddingTop: 6 }}>
                          Ventaja GNN: +{(d.gnn - d.xgb).toFixed(3)} puntos de R²
                        </div>
                      )}
                    </div>
                  )
                }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />

              <ReferenceLine y={0} stroke={C.lightGray} strokeWidth={1.5}
                label={{ value: 'R² = 0', position: 'insideTopRight', fill: C.lightGray, fontSize: 8, fontFamily: "'Titillium Web', sans-serif", dy: 4, dx: -4 }} />
              <ReferenceLine y={0.90} stroke={C.green} strokeDasharray="6 3" strokeWidth={1}
                label={{ value: '0.90', position: 'insideTopRight', fill: C.green, fontSize: 8, fontFamily: "'Titillium Web', sans-serif", dy: 4, dx: -4 }} />

              <Bar dataKey="gnn" fill={C.green}  radius={[3, 3, 0, 0]} barSize={16} isAnimationActive animationDuration={700} />
              <Bar dataKey="xgb" fill="#4A4A68" radius={[3, 3, 0, 0]} barSize={16} isAnimationActive animationDuration={700}>
                {[...circuits]
                  .sort((a, b) => b.gnn.r2 - a.gnn.r2)
                  .map(c => (
                    <Cell key={c.id} fill={c.xgb.r2 < 0 ? C.red : '#4A4A68'} opacity={c.xgb.r2 < 0 ? 0.7 : 0.8} />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <InsightPill color={C.red}>
          En <b>{negXgb} circuitos críticos</b> del calendario, XGBoost generaría estrategias erróneas comprometiendo posiciones y puntos. La GNN elimina ese riesgo con <b>{avgReductionPct}% menos error</b>. En Singapur: XGBoost R² = {circuits.find(c => c.id === 'singapore')?.xgb.r2.toFixed(2)} vs GNN R² = {circuits.find(c => c.id === 'singapore')?.gnn.r2.toFixed(2)}.
        </InsightPill>
      </div>

      <DegradationCharts stintsKey={stintsKey} />

    </div>
  )
}
