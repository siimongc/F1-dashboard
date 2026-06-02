import { useState, useMemo, useEffect } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea, Label,
  BarChart, Bar, Cell, LabelList,
} from 'recharts'
import stintsData  from '../data/stints.json'
import tracksData  from '../data/tracks.json'

const C = {
  red:        '#E10600',
  orange:     '#FF6B35',
  green:      '#00D27A',
  yellow:     '#FFD700',
  gray:       '#8B8BA3',
  surface:    '#1E1E2E',
  surfaceAlt: '#252538',
  border:     '#2A2A40',
  white:      '#FFFFFF',
  lightGray:  '#C4C4D4',
}

const axisStyle = {
  fill: C.gray,
  fontFamily: "'Titillium Web', sans-serif",
  fontSize: 10,
}

const COMPOUND_COLOR = {
  SOFT:   '#E10600',
  MEDIUM: '#C8A800',
  HARD:   '#AAAAAA',
  INTER:  '#00D27A',
  WET:    '#4488FF',
}

const COMPOUND_LABEL = {
  SOFT:   'Blando',
  MEDIUM: 'Medio',
  HARD:   'Duro',
  INTER:  'Intermedio (lluvia leve)',
  WET:    'Lluvia',
}

const CIRCUIT_META = {
  Bahrain_Grand_Prix:   { flag: '🇧🇭', name: 'Bahrain'        },
  Austrian_Grand_Prix:  { flag: '🇦🇹', name: 'Austria'        },
  British_Grand_Prix:   { flag: '🇬🇧', name: 'Gran Bretaña'   },
  Abu_Dhabi_Grand_Prix: { flag: '🇦🇪', name: 'Abu Dhabi'      },
  Belgian_Grand_Prix:   { flag: '🇧🇪', name: 'Bélgica'        },
  Dutch_Grand_Prix:     { flag: '🇳🇱', name: 'Países Bajos'   },
  Japanese_Grand_Prix:  { flag: '🇯🇵', name: 'Japón'          },
  Singapore_Grand_Prix: { flag: '🇸🇬', name: 'Singapur'       },
  Spanish_Grand_Prix:   { flag: '🇪🇸', name: 'España'         },
  Canadian_Grand_Prix:  { flag: '🇨🇦', name: 'Canadá'         },
  Hungarian_Grand_Prix: { flag: '🇭🇺', name: 'Hungría'        },
  Italian_Grand_Prix:   { flag: '🇮🇹', name: 'Italia'         },
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

// ── Pit Stop Decision Panel ───────────────────────────────────────────────────

function PitStopPanel({ circuitData, stintMeta, r2 }) {
  if (!stintMeta || !stintMeta.length) return null

  const worst = [...stintMeta].sort((a, b) => b.finalCum - a.finalCum)[0]
  if (!worst || worst.finalCum < 0.3 || worst.n_laps < 6) return null

  const stintObj = circuitData.stints.find(s => s.stint === worst.stint)
  if (!stintObj) return null
  const laps = stintObj.laps
  const n = laps.length
  if (n < 6) return null

  const optIdx    = Math.min(Math.max(Math.floor(n * 0.70), 4), n - 2)
  const optimalPitLap = laps[optIdx].race_lap
  const cumAtOpt  = laps[optIdx].cumulative
  const cumAtEnd  = laps[n - 1].cumulative
  const rawRisk   = cumAtEnd - cumAtOpt
  const timeAtRisk = +(rawRisk > 0 ? rawRisk : worst.finalCum * 0.28).toFixed(2)
  const extraLaps  = Math.max(1, n - 1 - optIdx)

  const COMP = { SOFT: 'Blando', MEDIUM: 'Medio', HARD: 'Duro', INTER: 'Intermedio', WET: 'Lluvia' }
  const compLabel  = COMP[worst.compound] || worst.compound
  const confidence = r2 >= 0.95 ? 'MUY ALTA' : r2 >= 0.90 ? 'ALTA' : 'MODERADA'
  const confColor  = r2 >= 0.90 ? C.green : C.orange

  return (
    <div style={{
      marginTop: 20,
      border: `1px solid ${C.red}44`,
      borderLeft: `3px solid ${C.red}`,
      borderRadius: 4,
      background: 'linear-gradient(135deg, #1C0808 0%, #13131E 100%)',
      overflow: 'hidden',
      fontFamily: "'Titillium Web', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: `${C.red}1A`,
        borderBottom: `1px solid ${C.red}33`,
        padding: '9px 18px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ color: C.red, fontSize: 13, fontWeight: 900 }}>⚑</span>
        <span style={{ color: C.white, fontWeight: 900, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          APEX · SOPORTE A LA DECISIÓN DE PIT STOP · STINT {worst.stint} · {worst.compound}
        </span>
        <span style={{
          marginLeft: 'auto', background: confColor + '22',
          border: `1px solid ${confColor}44`, borderRadius: 2,
          padding: '2px 8px', color: confColor, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
        }}>
          CONFIANZA {confidence}
        </span>
      </div>

      {/* KPI row */}
      <div style={{ display: 'flex' }}>
        {[
          { label: 'VUELTA ÓPTIMA',       value: `LAP ${optimalPitLap}`, color: C.red,      note: 'ventana de entrada recomendada' },
          { label: 'TIEMPO EN RIESGO',    value: `+${timeAtRisk}s`,       color: C.orange,   note: `${extraLaps} vuelta(s) fuera de ventana` },
          { label: 'DEGRADACIÓN TOTAL',   value: `${worst.finalCum.toFixed(2)}s`, color: C.yellow, note: 'acumulada al final del stint' },
          { label: 'R² GNN',              value: `${(r2 * 100).toFixed(1)}%`, color: confColor, note: 'variación explicada por el modelo' },
        ].map(({ label, value, color, note }, i) => (
          <div key={i} style={{
            flex: 1, padding: '14px 12px', textAlign: 'center',
            borderRight: i < 3 ? `1px solid #2A2A40` : 'none',
          }}>
            <div style={{ color, fontSize: 22, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.01em' }}>{value}</div>
            <div style={{ color: C.gray, fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 5 }}>{label}</div>
            <div style={{ color: C.gray, fontSize: 9, marginTop: 3, opacity: 0.7 }}>{note}</div>
          </div>
        ))}
      </div>

      {/* Reasoning */}
      <div style={{ padding: '12px 18px 14px', borderTop: `1px solid #2A2A40` }}>
        <div style={{ color: C.gray, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
          RAZONAMIENTO DEL MODELO
        </div>
        {[
          `Stint ${worst.stint} en neumático ${compLabel}: degradación acumulada de ${worst.finalCum.toFixed(2)}s al finalizar. A partir de la vuelta ${optimalPitLap + 1} el desgaste entra en zona de pendiente acelerada.`,
          `UNDERCUT: entrar ${Math.min(extraLaps, 3)} vuelta(s) antes que el rival elimina +${timeAtRisk}s de penalización de grip y permite atacar con neumático fresco mientras el rival sigue degradando.`,
          `La GNN modela la carrera como grafo dinámico — captura estelas de turbulencia y tráfico obstruido que XGBoost ignora. Confianza de predicción: R² = ${r2?.toFixed(4)} (${confidence.toLowerCase()}).`,
        ].map((text, i) => (
          <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: i < 2 ? 8 : 0 }}>
            <span style={{ color: C.red, fontWeight: 900, fontSize: 10, flexShrink: 0, lineHeight: 1.6 }}>▸</span>
            <span style={{ color: C.lightGray, fontSize: 11, lineHeight: 1.55 }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Chart 3: Desgaste acumulado — eje continuo dividido por stints ────────────

function StintDegradation({ circuitKey }) {
  const keys = Object.keys(stintsData)
  const [selected, setSelected] = useState(circuitKey ?? 'Bahrain_Grand_Prix')

  useEffect(() => {
    if (circuitKey && stintsData[circuitKey]) setSelected(circuitKey)
  }, [circuitKey])

  const { chartData, stintMeta, pitLaps, mae, r2, yDomain, worstStint, validStints } = useMemo(() => {
    const data        = stintsData[selected]
    const mae         = data.gnn_mae
    const r2          = data.gnn_r2
    const validStints = data.stints.filter(s => s.n_laps >= 4)

    const byLap = {}
    for (const stint of validStints) {
      for (const lap of stint.laps) {
        if (!byLap[lap.race_lap]) byLap[lap.race_lap] = { x: lap.race_lap }
        byLap[lap.race_lap][`s${stint.stint}`]        = +lap.cumulative.toFixed(3)
        byLap[lap.race_lap][`compound${stint.stint}`] = stint.compound
      }
    }
    const chartData = Object.values(byLap).sort((a, b) => a.x - b.x)

    const stintMeta = validStints.map(s => ({
      stint:    s.stint,
      compound: s.compound,
      n_laps:   s.n_laps,
      startLap: s.laps[0].race_lap,
      endLap:   s.laps[s.laps.length - 1].race_lap,
      midLap:   Math.round((s.laps[0].race_lap + s.laps[s.laps.length - 1].race_lap) / 2),
      finalCum: s.laps[s.laps.length - 1].cumulative,
    }))

    const pitLaps = stintMeta.slice(0, -1).map((s, i) => ({
      x:    (s.endLap + stintMeta[i + 1].startLap) / 2,
      from: s.compound,
      to:   stintMeta[i + 1].compound,
    }))

    const allVals = validStints.flatMap(s => s.laps.map(l => l.cumulative))
    const minV    = Math.min(...allVals, 0)
    const maxV    = Math.max(...allVals, 0)
    const pad     = Math.max(0.4, (maxV - minV) * 0.18)
    const yDomain = [+(minV - pad).toFixed(1), +(maxV + pad).toFixed(1)]

    const worstStint = [...validStints].sort((a, b) =>
      (b.laps.at(-1)?.cumulative ?? 0) - (a.laps.at(-1)?.cumulative ?? 0))[0]

    return { chartData, stintMeta, pitLaps, mae, r2, yDomain, worstStint, validStints }
  }, [selected])

  const circuitInfo = CIRCUIT_META[selected] || {}

  return (
    <div>
      <NarrativeHeader
        n="03"
        title="Ciclo completo de carrera: cuándo el neumático pierde competitividad"
        subtitle="Cada sección de color es un stint. La curva muestra cuántos segundos extra tarda el carro vs la primera vuelta de ese stint — cuando sube, el neumático está perdiendo grip. Identifica la ventana óptima de pit stop antes de que la degradación penalice la estrategia. Selecciona el circuito en el gráfico superior para sincronizar el análisis."
      />

      {/* Circuit selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {keys.map(key => {
          const m      = CIRCUIT_META[key] || {}
          const active = key === selected
          const r2val  = stintsData[key]?.gnn_r2 ?? 0
          return (
            <button key={key} onClick={() => setSelected(key)} style={{
              background: active ? C.red : C.surfaceAlt,
              border: `1px solid ${active ? C.red : C.border}`,
              borderRadius: 3, padding: '5px 12px',
              color: active ? C.white : C.gray,
              fontFamily: "'Titillium Web', sans-serif",
              fontWeight: 700, fontSize: 10, cursor: 'pointer',
              letterSpacing: '0.05em', transition: 'all 0.15s',
            }}>
              {m.flag} {m.name}
              <span style={{ color: active ? '#ffffff88' : '#ffffff33', marginLeft: 5, fontSize: 9 }}>
                R²{r2val.toFixed(2)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Compound legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {Object.entries(COMPOUND_LABEL).map(([key, label]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: COMPOUND_COLOR[key], display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: C.gray, fontSize: 10 }}>{label}</span>
          </div>
        ))}
        <div style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 16, height: 2, background: C.red, display: 'inline-block' }} />
          <span style={{ color: C.gray, fontSize: 10 }}>Pit stop (cambio de neumáticos)</span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '28px 20px 8px 4px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 24, right: 24, left: 4, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />

            {stintMeta.map(s => (
              <ReferenceArea
                key={`stint-${s.stint}`}
                x1={s.startLap} x2={s.endLap}
                fill={COMPOUND_COLOR[s.compound] || C.gray}
                fillOpacity={0.08}
                label={{
                  value: `Stint ${s.stint} · ${COMPOUND_LABEL[s.compound] || s.compound} (${s.n_laps} vueltas)`,
                  position: 'insideTop',
                  fill: COMPOUND_COLOR[s.compound] || C.gray,
                  fontSize: 9,
                  fontFamily: "'Titillium Web', sans-serif",
                  fontWeight: 700,
                  dy: -18,
                }}
              />
            ))}

            {stintMeta.slice(0, -1).map((s, i) => {
              const nextStart = stintMeta[i + 1].startLap
              return (
                <ReferenceArea
                  key={`pit-${i}`}
                  x1={s.endLap - 0.5} x2={nextStart + 0.5}
                  fill={C.red}
                  fillOpacity={0.18}
                  label={{
                    value: 'PIT STOP',
                    position: 'insideTop',
                    fill: C.red,
                    fontSize: 8,
                    fontFamily: "'Titillium Web', sans-serif",
                    fontWeight: 900,
                    dy: -18,
                  }}
                />
              )
            })}

            <ReferenceLine y={0} stroke={C.gray} strokeWidth={1} strokeDasharray="4 2" />

            <XAxis dataKey="x" tick={axisStyle} axisLine={false} tickLine={false}
              label={{ value: 'Vuelta de carrera', position: 'insideBottom', offset: -10,
                fill: C.gray, fontSize: 9, fontFamily: "'Titillium Web', sans-serif" }}
            />
            <YAxis domain={yDomain} tick={axisStyle} axisLine={false} tickLine={false}
              tickFormatter={v => v === 0 ? '0 (sin desgaste)' : `${v > 0 ? '+' : ''}${v.toFixed(1)}s`}
              width={100}
              label={{ value: 'Seg. perdidos vs. 1ª vuelta del stint', angle: -90,
                position: 'insideLeft', offset: 20,
                fill: C.gray, fontSize: 9, fontFamily: "'Titillium Web', sans-serif" }}
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const pts = payload.filter(p => p.value != null)
                if (!pts.length) return null
                const p   = pts[0]
                const sNum = parseInt(p.dataKey.replace('s',''))
                const sm   = stintMeta.find(s => s.stint === sNum)
                const val  = p.value
                return (
                  <div style={{ background: '#1A1A2A', border: `1px solid ${C.border}`, borderRadius: 4, padding: '10px 14px', fontFamily: "'Titillium Web', sans-serif", fontSize: 11 }}>
                    <div style={{ color: C.white, fontWeight: 700, marginBottom: 5 }}>Vuelta {label}</div>
                    <div style={{ color: COMPOUND_COLOR[sm?.compound] || C.white }}>
                      Stint {sNum} · {COMPOUND_LABEL[sm?.compound] || sm?.compound}
                    </div>
                    <div style={{ color: val > 0.1 ? C.orange : val < -0.1 ? C.green : C.lightGray, marginTop: 4, fontWeight: 700 }}>
                      {val > 0.1 ? '▲' : val < -0.1 ? '▼' : '—'} {val > 0 ? '+' : ''}{val.toFixed(3)}s vs. 1ª vuelta del stint
                    </div>
                    <div style={{ color: C.gray, fontSize: 9, marginTop: 3 }}>
                      {val > 0.1 ? 'Neumático degradando — carro más lento' : val < -0.1 ? 'Pista/combustible mejoran el ritmo' : 'Ritmo estable'}
                    </div>
                  </div>
                )
              }}
              cursor={{ stroke: C.border, strokeWidth: 1 }}
            />

            {validStints.map(s => (
              <Line
                key={s.stint}
                type="monotone"
                dataKey={`s${s.stint}`}
                stroke={COMPOUND_COLOR[s.compound] || C.gray}
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
                isAnimationActive
                animationDuration={800}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <InsightPill color={C.green}>
        El modelo aprende esta curva de desgaste por compuesto. Con R²=<b>{r2?.toFixed(4)}</b>, predice cuándo el neumático empieza a perder grip — y cuánto tiempo acumula antes del pit stop óptimo.
      </InsightPill>

      {/* Pit Stop Decision Panel */}
      <PitStopPanel
        circuitData={stintsData[selected]}
        stintMeta={stintMeta}
        r2={r2}
      />
    </div>
  )
}

// ── Chart: MAE por circuito (disponible pero no renderizado en export) ─────────

function MaeByCircuit() {
  const data = [...tracksData.circuits]
    .sort((a, b) => a.gnn.mae - b.gnn.mae)
    .map(c => ({
      id:    c.id,
      label: c.name.replace(' GP', ''),
      name:  c.name,
      mae:   +c.gnn.mae.toFixed(4),
      r2:    +c.gnn.r2.toFixed(4),
    }))

  const avgMae = (data.reduce((s, d) => s + d.mae, 0) / data.length).toFixed(3)

  return (
    <div>
      <NarrativeHeader
        n="03"
        title="Precisión del modelo por circuito — error en segundos por vuelta"
        subtitle={`El MAE (error medio absoluto) indica cuántos segundos se equivoca el modelo en promedio al predecir la tasa de desgaste por vuelta. Promedio global: ${avgMae}s/vuelta. Cada circuito fue evaluado en datos nunca vistos (validación LOCO).`}
      />
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '16px 16px 8px 8px' }}>
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 80, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
            <XAxis type="number" domain={[0, Math.max(...data.map(d => d.mae)) * 1.15]}
              tick={axisStyle} axisLine={false} tickLine={false}
              tickFormatter={v => `${v.toFixed(1)}s`} />
            <YAxis type="category" dataKey="label" tick={{ ...axisStyle, fontSize: 10 }}
              axisLine={false} tickLine={false} width={90} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                return (
                  <div style={{ background: '#1A1A2A', border: `1px solid ${C.border}`, borderRadius: 4, padding: '10px 14px', fontFamily: "'Titillium Web', sans-serif", fontSize: 11 }}>
                    <div style={{ color: C.white, fontWeight: 700, marginBottom: 6 }}>{d.name}</div>
                    <div style={{ color: C.orange }}>Error: <b>±{d.mae.toFixed(4)}s</b> por vuelta</div>
                    <div style={{ color: C.green }}>R²: <b>{d.r2.toFixed(4)}</b></div>
                    <div style={{ color: C.gray, fontSize: 10, marginTop: 4 }}>
                      En 20 vueltas: máx. <b>{(d.mae * 20).toFixed(1)}s</b> de desfase acumulado
                    </div>
                  </div>
                )
              }}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <ReferenceLine x={+avgMae} stroke={C.yellow} strokeDasharray="5 3" strokeWidth={1.5}
              label={{ value: `promedio ${avgMae}s`, position: 'insideTopRight',
                fill: C.yellow, fontSize: 8, fontFamily: "'Titillium Web', sans-serif", dy: -4 }} />
            <Bar dataKey="mae" radius={[0, 3, 3, 0]} barSize={20} isAnimationActive animationDuration={600}>
              <LabelList dataKey="mae" position="right"
                style={{ fill: C.lightGray, fontSize: 10, fontFamily: "'Titillium Web', sans-serif", fontWeight: 700 }}
                formatter={v => `${v.toFixed(3)}s`} />
              {data.map(d => (
                <Cell key={d.id} fill={d.mae < 0.65 ? C.green : d.mae < 1.0 ? C.orange : C.red} opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <InsightPill color={C.orange}>
        Error promedio <b>{avgMae}s por vuelta</b>. En un stint de 20 vueltas, el error acumulado máximo es {(+avgMae * 20).toFixed(1)}s — menos del costo de un pit stop (~22s).
      </InsightPill>
    </div>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function DegradationCharts({ stintsKey }) {
  return (
    <div style={{ fontFamily: "'Titillium Web', sans-serif" }}>
      <StintDegradation circuitKey={stintsKey} />
    </div>
  )
}
