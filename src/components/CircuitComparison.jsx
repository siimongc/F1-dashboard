import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'

const C = {
  red:       '#E10600',
  orange:    '#FF6B35',
  yellow:    '#FFD700',
  green:     '#00D27A',
  gray:      '#8B8BA3',
  surface:   '#1E1E2E',
  surfaceAlt:'#252538',
  border:    '#2A2A40',
  white:     '#FFFFFF',
  lightGray: '#C4C4D4',
}

function gnnDotColor(r2) {
  if (r2 >= 0.90) return C.green
  if (r2 >= 0.80) return C.yellow
  return C.orange
}

function maePctColor(pct) {
  if (pct >= 70) return C.green
  if (pct >= 50) return C.yellow
  return C.orange
}

function r2Color(r2) {
  if (r2 >= 0.90) return C.green
  if (r2 >= 0.80) return C.yellow
  if (r2 >= 0)    return C.orange
  return C.red
}

// ── Chart 1: Dot/Lollipop ───────────────────────────────────────────────────
function DotPlot({ circuits }) {
  const sorted = [...circuits].sort((a, b) => b.gnn.r2 - a.gnn.r2)

  const VW    = 640
  const ROW_H = 36
  const TOP   = 50
  const VH    = TOP + sorted.length * ROW_H + 30
  const LPAD  = 110
  const RPAD  = 55
  const CW    = VW - LPAD - RPAD

  const xMin = -4, xMax = 1.0
  const xs  = v => LPAD + (v - xMin) / (xMax - xMin) * CW
  const x0  = xs(0)
  const x09 = xs(0.9)
  const ticks = [-3, -2, -1, 0, 0.5, 1.0]

  if (!sorted.length) return (
    <div style={{ textAlign: 'center', color: C.gray, padding: '40px 0', fontSize: 12 }}>
      Selecciona al menos un circuito
    </div>
  )

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: '100%', display: 'block' }}>
      <rect x={LPAD} y={TOP - 22} width={x0 - LPAD} height={VH - TOP + 14}
        fill="rgba(225,6,0,0.06)" />

      {ticks.map(t => (
        <line key={t} x1={xs(t)} y1={TOP - 22} x2={xs(t)} y2={VH - 22}
          stroke={t === 0 ? 'rgba(255,255,255,0.22)' : C.border}
          strokeWidth={t === 0 ? 1.5 : 1}
          strokeDasharray={t === 0 ? '' : '3 4'} />
      ))}

      <line x1={x09} y1={TOP - 22} x2={x09} y2={VH - 22}
        stroke={C.green} strokeWidth={1} strokeDasharray="4 3" opacity={0.4} />
      <text x={x09 + 3} y={TOP - 26} fill={C.green} fontSize={7.5}
        fontFamily="'Titillium Web', sans-serif" opacity={0.65}>R²= 0.9</text>

      {ticks.map(t => (
        <text key={t} x={xs(t)} y={TOP - 27} textAnchor="middle"
          fill={t === 0 ? C.white : C.gray} fontSize={9}
          fontFamily="'Titillium Web', sans-serif" fontWeight={t === 0 ? 700 : 400}>
          {t === 0 ? '0' : t.toFixed(1)}
        </text>
      ))}

      <text x={(LPAD + x0) / 2} y={TOP - 12} textAnchor="middle"
        fill={C.red} fontSize={8} fontWeight={700}
        fontFamily="'Titillium Web', sans-serif" letterSpacing={0.8}>
        XGB NEGATIVO
      </text>

      {sorted.map((c, i) => {
        const rawXgb  = c.xgb.r2
        const clipped = rawXgb < xMin + 0.1
        const xgbX    = xs(clipped ? xMin + 0.1 : rawXgb)
        const gnnX    = xs(c.gnn.r2)
        const cy      = TOP + i * ROW_H + ROW_H / 2
        const neg     = rawXgb < 0
        const col     = gnnDotColor(c.gnn.r2)

        return (
          <g key={c.id}>
            <line x1={LPAD} x2={VW - 10} y1={cy + ROW_H / 2} y2={cy + ROW_H / 2}
              stroke={C.border} strokeWidth={0.4} opacity={0.5} />
            <text x={LPAD - 8} y={cy + 4} textAnchor="end"
              fill={C.lightGray} fontSize={10} fontWeight={600}
              fontFamily="'Titillium Web', sans-serif">
              {c.flag} {c.code}
            </text>
            <line x1={xgbX} x2={gnnX} y1={cy} y2={cy}
              stroke={neg ? 'rgba(225,6,0,0.4)' : 'rgba(139,139,163,0.3)'}
              strokeWidth={2} />
            {clipped ? (
              <>
                <polygon points={`${LPAD+4},${cy} ${LPAD+13},${cy-5} ${LPAD+13},${cy+5}`}
                  fill={C.red} opacity={0.85} />
                <text x={LPAD + 17} y={cy + 4} fill={C.red} fontSize={7.5}
                  fontFamily="'Titillium Web', sans-serif" fontWeight={700}>
                  {rawXgb.toFixed(2)}
                </text>
              </>
            ) : (
              <>
                <circle cx={xgbX} cy={cy} r={5} fill={neg ? C.red : '#4A4A65'} opacity={0.9} />
                <text x={xgbX} y={cy - 8} textAnchor="middle"
                  fill={neg ? C.red : C.gray} fontSize={7.5}
                  fontFamily="'Titillium Web', sans-serif">
                  {rawXgb.toFixed(2)}
                </text>
              </>
            )}
            <circle cx={gnnX} cy={cy} r={7} fill={col}
              style={{ filter: `drop-shadow(0 0 4px ${col}66)` }} />
            <text x={gnnX + 12} y={cy + 4} fill={col} fontSize={9} fontWeight={700}
              fontFamily="'Titillium Web', sans-serif">
              {c.gnn.r2.toFixed(3)}
            </text>
          </g>
        )
      })}

      <circle cx={LPAD} cy={VH - 10} r={4} fill="#4A4A65" />
      <text x={LPAD + 9} y={VH - 6} fill={C.gray} fontSize={9}
        fontFamily="'Titillium Web', sans-serif">XGBoost R²</text>
      <circle cx={LPAD + 95} cy={VH - 10} r={6} fill={C.green}
        style={{ filter: `drop-shadow(0 0 3px ${C.green}66)` }} />
      <text x={LPAD + 106} y={VH - 6} fill={C.green} fontSize={9}
        fontFamily="'Titillium Web', sans-serif">GNN GAT v5.1</text>
    </svg>
  )
}

// ── Tooltip MAE ──────────────────────────────────────────────────────────────
const MaeTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: '#1A1A2A', border: `1px solid ${C.border}`, borderRadius: 4,
      padding: '10px 14px', fontFamily: "'Titillium Web', sans-serif", fontSize: 12,
    }}>
      <div style={{ color: C.white, fontWeight: 700, marginBottom: 6 }}>{d.flag} {d.name}</div>
      <div style={{ color: C.gray, marginBottom: 2 }}>XGB: <b style={{ color: C.lightGray }}>{d.xgb_mae.toFixed(3)}s</b></div>
      <div style={{ color: C.gray, marginBottom: 4 }}>GNN: <b style={{ color: C.green }}>{d.gnn_mae.toFixed(3)}s</b></div>
      <div style={{ color: C.green, fontWeight: 700 }}>▲ −{d.pct.toFixed(1)}% de error</div>
    </div>
  )
}

// ── Panel lateral de filtros ─────────────────────────────────────────────────
function FilterPanel({ circuits, selected, onToggle, onAll, onNone }) {
  return (
    <div style={{
      width: 172, flexShrink: 0,
      background: C.surfaceAlt, border: `1px solid ${C.border}`,
      borderRadius: 4, padding: '14px 12px',
      fontFamily: "'Titillium Web', sans-serif",
      alignSelf: 'flex-start',
      position: 'sticky', top: 16,
    }}>
      <div style={{
        color: C.gray, fontSize: 9, fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10,
      }}>
        Circuitos
      </div>

      {/* Botones Todos / Ninguno */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {[['Todos', onAll], ['Ninguno', onNone]].map(([label, fn]) => (
          <button key={label} onClick={fn} style={{
            flex: 1, background: 'transparent',
            border: `1px solid ${C.border}`, borderRadius: 3,
            color: C.gray, fontSize: 9, fontWeight: 700,
            letterSpacing: '0.06em', cursor: 'pointer', padding: '4px 0',
            transition: 'all 0.12s',
          }}
            onMouseEnter={e => { e.target.style.borderColor = C.orange; e.target.style.color = C.orange }}
            onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.gray }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista de circuitos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {circuits.map(c => {
          const on = selected.has(c.id)
          const neg = c.xgb.r2 < 0
          return (
            <label key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 7px', borderRadius: 3, cursor: 'pointer',
              background: on ? 'rgba(255,255,255,0.04)' : 'transparent',
              border: `1px solid ${on ? C.border : 'transparent'}`,
              transition: 'all 0.1s',
            }}>
              <input
                type="checkbox"
                checked={on}
                onChange={() => onToggle(c.id)}
                style={{ accentColor: C.red, cursor: 'pointer', width: 12, height: 12 }}
              />
              <span style={{ fontSize: 10, color: on ? C.lightGray : C.gray, flex: 1 }}>
                {c.flag} {c.code}
              </span>
              {neg && (
                <span style={{
                  fontSize: 7.5, color: C.red, fontWeight: 700,
                  background: 'rgba(225,6,0,0.12)', padding: '1px 4px', borderRadius: 2,
                }}>−</span>
              )}
            </label>
          )
        })}
      </div>

      {/* Contador */}
      <div style={{
        marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}`,
        color: C.gray, fontSize: 9, textAlign: 'center',
      }}>
        <span style={{ color: C.white, fontWeight: 700 }}>{selected.size}</span>
        {' / '}{circuits.length} seleccionados
      </div>

      {/* Leyenda negativo */}
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{
          fontSize: 7.5, color: C.red, fontWeight: 700,
          background: 'rgba(225,6,0,0.12)', padding: '1px 4px', borderRadius: 2,
        }}>−</span>
        <span style={{ color: C.gray, fontSize: 8 }}>XGB R² negativo</span>
      </div>
    </div>
  )
}

// ── Main export ──────────────────────────────────────────────────────────────
export default function CircuitComparison({ circuits }) {
  const [selected, setSelected] = useState(new Set(circuits.map(c => c.id)))

  const toggle = id =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const filtered = circuits.filter(c => selected.has(c.id))
  const sorted   = [...filtered].sort((a, b) => b.gnn.r2 - a.gnn.r2)

  const maePctData = [...filtered]
    .map(c => ({
      code:    c.code,
      flag:    c.flag,
      name:    c.name,
      pct:     (c.xgb.mae - c.gnn.mae) / c.xgb.mae * 100,
      xgb_mae: c.xgb.mae,
      gnn_mae: c.gnn.mae,
    }))
    .sort((a, b) => b.pct - a.pct)

  const negCount = filtered.filter(c => c.xgb.r2 < 0).length
  const gnnBelow = filtered.filter(c => c.gnn.r2 < 0.86).length
  const avgMaeRed = filtered.length
    ? (filtered.reduce((s, c) => s + (c.xgb.mae - c.gnn.mae) / c.xgb.mae * 100, 0) / filtered.length)
    : 0
  const avgMaeRedAll = circuits.reduce((s, c) => s + (c.xgb.mae - c.gnn.mae) / c.xgb.mae * 100, 0) / circuits.length

  const axisStyle = { fill: C.gray, fontFamily: "'Titillium Web', sans-serif", fontSize: 10 }

  return (
    <div style={{ fontFamily: "'Titillium Web', sans-serif", display: 'flex', gap: 20, alignItems: 'flex-start' }}>

      {/* ── Panel de filtros ── */}
      <FilterPanel
        circuits={circuits}
        selected={selected}
        onToggle={toggle}
        onAll={() => setSelected(new Set(circuits.map(c => c.id)))}
        onNone={() => setSelected(new Set())}
      />

      {/* ── Contenido principal ── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Hero stats — se recalculan con la selección */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            {
              n: `${negCount} / ${filtered.length}`,
              color: negCount > 0 ? C.red : C.green,
              label: 'circuitos con XGBoost R² negativo',
              sub: 'el modelo era peor que predecir la media',
            },
            {
              n: `${gnnBelow} / ${filtered.length}`,
              color: gnnBelow === 0 ? C.green : C.orange,
              label: 'circuitos con GNN R² por debajo de 0.86',
              sub: 'consistente en todos los circuitos',
            },
            {
              n: filtered.length ? `−${avgMaeRed.toFixed(1)}%` : '—',
              color: C.green,
              label: 'reducción media del error de predicción',
              sub: `promedio global: −${avgMaeRedAll.toFixed(1)}%`,
            },
          ].map(s => (
            <div key={s.label} style={{
              flex: '1 1 150px',
              background: C.surfaceAlt, border: `1px solid ${C.border}`,
              borderRadius: 4, padding: '12px 16px',
            }}>
              <div style={{
                color: s.color, fontSize: 26, fontWeight: 900,
                lineHeight: 1, letterSpacing: '-0.02em',
              }}>{s.n}</div>
              <div style={{
                color: C.lightGray, fontSize: 9.5, fontWeight: 700,
                letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: 5,
              }}>{s.label}</div>
              <div style={{ color: C.gray, fontSize: 9.5, marginTop: 3 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Chart 1: Dot plot */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: C.white, fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              R² por circuito — XGBoost vs GNN
            </div>
            <div style={{ color: C.gray, fontSize: 11, marginTop: 2 }}>
              Cada línea muestra cuánto mejoró el GNN. Los puntos rojos estaban en terreno negativo.
            </div>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '16px 8px' }}>
            <DotPlot circuits={filtered} />
          </div>
        </div>

        {/* Chart 2: MAE reduction */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: C.white, fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Reducción de error de predicción (MAE)
            </div>
            <div style={{ color: C.gray, fontSize: 11, marginTop: 2 }}>
              Ordenado de mayor a menor mejora. Línea naranja = promedio de la selección.
            </div>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '16px 8px' }}>
            {filtered.length ? (
              <ResponsiveContainer width="100%" height={Math.max(180, filtered.length * 30 + 40)}>
                <BarChart data={maePctData} layout="vertical"
                  margin={{ top: 4, right: 56, left: 60, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={axisStyle}
                    axisLine={false} tickLine={false} tickFormatter={v => v + '%'} />
                  <YAxis type="category" dataKey="code" tick={axisStyle}
                    axisLine={false} tickLine={false} width={34} />
                  <Tooltip content={<MaeTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <ReferenceLine x={avgMaeRed} stroke={C.orange} strokeDasharray="5 3" strokeWidth={1.5}
                    label={{
                      value: `avg ${avgMaeRed.toFixed(1)}%`,
                      position: 'insideTopRight',
                      fill: C.orange, fontSize: 9,
                      fontFamily: "'Titillium Web', sans-serif",
                    }} />
                  <Bar dataKey="pct" name="Reducción MAE"
                    radius={[0, 3, 3, 0]} isAnimationActive animationDuration={500}>
                    {maePctData.map(d => (
                      <Cell key={d.code} fill={maePctColor(d.pct)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', color: C.gray, padding: '40px 0', fontSize: 12 }}>
                Selecciona al menos un circuito
              </div>
            )}
          </div>
        </div>

        {/* Tabla */}
        {sorted.length > 0 && (
          <div>
            <div style={{
              color: C.gray, fontSize: 9, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10,
            }}>
              DETALLE POR CIRCUITO
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['Circuito', 'XGB R²', 'GNN R²', 'ΔR²', 'XGB MAE', 'GNN MAE', 'Mejora', 'Grafos'].map(h => (
                      <th key={h} style={{
                        padding: '7px 10px',
                        textAlign: h === 'Circuito' ? 'left' : 'right',
                        color: C.gray, fontWeight: 700, fontSize: 9,
                        letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((c, i) => {
                    const dR2  = c.gnn.r2 - c.xgb.r2
                    const dMae = (c.xgb.mae - c.gnn.mae) / c.xgb.mae * 100
                    return (
                      <tr key={c.id} style={{
                        background: i % 2 === 1 ? C.surfaceAlt : 'transparent',
                        borderBottom: `1px solid ${C.border}`,
                      }}>
                        <td style={{ padding: '7px 10px', color: C.white, fontWeight: 600 }}>
                          {c.flag} {c.name}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: r2Color(c.xgb.r2), fontWeight: 700 }}>
                          {c.xgb.r2.toFixed(4)}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: r2Color(c.gnn.r2), fontWeight: 700 }}>
                          {c.gnn.r2.toFixed(4)}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: C.green, fontWeight: 700 }}>
                          +{dR2.toFixed(4)}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: C.lightGray }}>
                          {c.xgb.mae.toFixed(3)}s
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: C.green, fontWeight: 700 }}>
                          {c.gnn.mae.toFixed(3)}s
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: maePctColor(dMae), fontWeight: 700 }}>
                          −{dMae.toFixed(1)}%
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: C.gray }}>
                          {c.gnn.n_graphs}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
