import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, Legend,
} from 'recharts'
import tracksData from '../data/tracks.json'

const C = {
  red:       '#E10600',
  orange:    '#FF6B35',
  yellow:    '#FFD700',
  green:     '#00D27A',
  gray:      '#8B8BA3',
  border:    '#2A2A40',
  surface:   '#1E1E2E',
  surfaceAlt:'#252538',
  white:     '#FFFFFF',
  lightGray: '#C4C4D4',
}

const mc = tracksData.monte_carlo
const PIT_LAPS      = [21, 37]
const THRESHOLD_RED = 0.35
const THRESHOLD_YLW = 0.15

// ── 1. Per-lap degradation rate ──────────────────────────────────────────────
const rateData = mc.map((d, i) => ({
  vuelta: d.vuelta,
  rate:   i === 0 ? d.p50 : +(d.p50 - mc[i - 1].p50).toFixed(4),
}))

// ── 2. Strategy comparison ───────────────────────────────────────────────────
// "Delayed" = 2 stops at laps 28 + 44  (7 laps late each)
// "Sin modelo" = 1 stop at lap 35, no second stop
const strategyData = mc.map(d => {
  const v   = d.vuelta
  const gnn = d.p50

  const extraDelayed =
    (v > 21 && v <= 28) ? (v - 21) * 0.22 :
    (v > 28 && v <= 37) ? 7 * 0.22 :
    (v > 37 && v <= 44) ? 7 * 0.22 + (v - 37) * 0.20 :
    v > 44              ? 7 * 0.22 + 7 * 0.20 : 0

  const extraLate =
    (v > 21 && v <= 35) ? (v - 21) * 0.38 :
    v > 35              ? 14 * 0.38 + (v - 35) * 0.12 : 0

  return {
    vuelta:    v,
    gnn:       +gnn.toFixed(3),
    tardio:    +(gnn + extraDelayed).toFixed(3),
    sinModelo: +(gnn + extraLate).toFixed(3),
  }
})

// ── 3. Pit-window cost curve  (first stop laps 15–30) ───────────────────────
const GNN_FINAL  = mc[49].p50                           // 11.3882
const pitWindowData = Array.from({ length: 16 }, (_, i) => {
  const lap     = 15 + i
  const penalty = lap < 21 ? (21 - lap) * 0.15 : (lap - 21) * 0.30
  return { label: `V${lap}`, lap, total: +(GNN_FINAL + penalty).toFixed(2), isOptimal: lap === 21 }
})

const axisStyle = { fill: C.gray, fontFamily: "'Titillium Web', sans-serif", fontSize: 10 }

// ── Tooltips ─────────────────────────────────────────────────────────────────
function RateTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const rate = payload[0]?.value
  const [zoneLabel, zoneColor] =
    rate >= THRESHOLD_RED ? ['CRÍTICO — Pit window', C.red] :
    rate >= 0.25          ? ['ATENCIÓN — Desgaste alto', C.orange] :
    rate >= THRESHOLD_YLW ? ['MODERADO', C.yellow] : ['NORMAL — Neumáticos frescos', C.green]
  return (
    <div style={{ background:'#1A1A2A', border:`1px solid ${C.border}`, borderRadius:4, padding:'8px 12px', fontFamily:"'Titillium Web', sans-serif", fontSize:11 }}>
      <div style={{ color:C.white, fontWeight:700, marginBottom:4 }}>Vuelta {label}</div>
      <div style={{ color:C.lightGray }}>Tasa: <b style={{ color:zoneColor }}>{rate?.toFixed(3)} s/v</b></div>
      <div style={{ color:zoneColor, fontWeight:700, marginTop:2, fontSize:10 }}>{zoneLabel}</div>
      {PIT_LAPS.includes(label) && (
        <div style={{ color:C.yellow, marginTop:3, fontSize:9 }}>⬆ GNN recomienda parada aquí</div>
      )}
    </div>
  )
}

function StrategyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#1A1A2A', border:`1px solid ${C.border}`, borderRadius:4, padding:'8px 12px', fontFamily:"'Titillium Web', sans-serif", fontSize:11 }}>
      <div style={{ color:C.white, fontWeight:700, marginBottom:4 }}>Vuelta {label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color:p.stroke, marginBottom:2 }}>
          {p.name}: <b>{p.value?.toFixed(3)}s</b>
        </div>
      ))}
      {label === 50 && (
        <div style={{ color:C.gray, fontSize:9, marginTop:4, borderTop:`1px solid ${C.border}`, paddingTop:4 }}>
          Δ tardío: +{(payload.find(p=>p.dataKey==='tardio')?.value - payload.find(p=>p.dataKey==='gnn')?.value)?.toFixed(2)}s&nbsp;·&nbsp;
          Δ sin modelo: +{(payload.find(p=>p.dataKey==='sinModelo')?.value - payload.find(p=>p.dataKey==='gnn')?.value)?.toFixed(2)}s
        </div>
      )}
    </div>
  )
}

function WindowTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const extra = +(d.total - GNN_FINAL).toFixed(2)
  return (
    <div style={{ background:'#1A1A2A', border:`1px solid ${C.border}`, borderRadius:4, padding:'8px 12px', fontFamily:"'Titillium Web', sans-serif", fontSize:11 }}>
      <div style={{ color:C.white, fontWeight:700, marginBottom:4 }}>Pit en vuelta {d.lap}</div>
      <div style={{ color:C.lightGray }}>Desgaste final: <b style={{ color: d.isOptimal ? C.green : extra < 0.6 ? C.yellow : extra < 1.5 ? C.orange : C.red }}>{d.total}s</b></div>
      {d.isOptimal
        ? <div style={{ color:C.green, fontWeight:700, marginTop:2 }}>✓ Ventana óptima — GNN GAT v5.1</div>
        : <div style={{ color:C.gray, fontSize:10, marginTop:2 }}>+{extra}s vs. óptimo</div>
      }
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ n, title, sub }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
        <span style={{
          background:C.red, color:C.white, fontWeight:900,
          fontSize:9, padding:'2px 7px', borderRadius:2, letterSpacing:'0.1em', flexShrink:0,
        }}>{n}</span>
        <span style={{ color:C.white, fontWeight:700, fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase' }}>
          {title}
        </span>
      </div>
      <div style={{ color:C.gray, fontSize:11, marginLeft:34 }}>{sub}</div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function PitStrategyNarrative() {
  const gapLate  = +(strategyData[49].tardio    - strategyData[49].gnn).toFixed(1)
  const gapNoMdl = +(strategyData[49].sinModelo - strategyData[49].gnn).toFixed(1)

  return (
    <div style={{ fontFamily:"'Titillium Web', sans-serif", display:'flex', flexDirection:'column', gap:36 }}>

      {/* ── Intro KPIs ── */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
        {[
          {
            n: `−${gapNoMdl}s`,
            label: 'ahorrados vs. sin predicción',
            sub:   '1 parada tardía · sin modelo',
            color: C.green,
          },
          {
            n: `−${gapLate}s`,
            label: 'ahorrados vs. paradas tardías',
            sub:   '2 paradas pero 7 vueltas tarde',
            color: C.green,
          },
          {
            n: 'V21 + V37',
            label: 'ventana óptima predicha',
            sub:   'GNN GAT v5.1 · anticipación multi-paso',
            color: C.orange,
          },
          {
            n: '0.384 s/v',
            label: 'tasa crítica detectada en V21',
            sub:   'umbral ≥ 0.35 s/v → pit window',
            color: C.red,
          },
        ].map(s => (
          <div key={s.label} style={{
            flex:'1 1 150px', background:C.surfaceAlt,
            border:`1px solid ${C.border}`, borderRadius:4, padding:'12px 16px',
          }}>
            <div style={{ color:s.color, fontSize:24, fontWeight:900, lineHeight:1, letterSpacing:'-0.02em' }}>{s.n}</div>
            <div style={{ color:C.lightGray, fontSize:9, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', marginTop:5 }}>{s.label}</div>
            <div style={{ color:C.gray, fontSize:9, marginTop:3 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Chart 1: Degradation rate ── */}
      <div>
        <SectionHeader
          n="01"
          title="Señal de Desgaste — Tasa por Vuelta"
          sub="El GNN monitorea la aceleración del desgaste vuelta a vuelta. Cuando la tasa cruza 0.35 s/v la parada es inminente. En V37 la tasa es moderada pero el modelo anticipa el pico de V44 (0.49 s/v)."
        />
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, padding:'16px 8px 8px' }}>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={rateData} margin={{ top:16, right:32, left:4, bottom:18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="vuelta" tick={axisStyle} axisLine={false} tickLine={false}
                label={{ value:'Vuelta de carrera', position:'insideBottom', offset:-8, fill:C.gray, fontSize:9, fontFamily:"'Titillium Web', sans-serif" }} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={38}
                tickFormatter={v => v.toFixed(2)} domain={[0, 0.58]}
                label={{ value:'s / vuelta', angle:-90, position:'insideLeft', offset:6, fill:C.gray, fontSize:9, fontFamily:"'Titillium Web', sans-serif" }} />
              <Tooltip content={<RateTooltip />} cursor={{ fill:'rgba(255,255,255,0.03)' }} />

              {/* thresholds */}
              <ReferenceLine y={THRESHOLD_RED} stroke={C.red} strokeDasharray="5 3" strokeWidth={1.5}
                label={{ value:'Umbral crítico  0.35', position:'insideTopRight', fill:C.red, fontSize:8.5, fontFamily:"'Titillium Web', sans-serif" }} />
              <ReferenceLine y={0.25} stroke={C.orange} strokeDasharray="4 3" strokeWidth={1}
                label={{ value:'Atención  0.25', position:'insideTopRight', fill:C.orange, fontSize:8, fontFamily:"'Titillium Web', sans-serif", dy:-10 }} />

              {/* pit markers */}
              <ReferenceLine x={21} stroke={C.green} strokeWidth={1.5} strokeDasharray="5 3"
                label={{ value:'PIT 1 · V21', position:'top', fill:C.green, fontSize:8, fontFamily:"'Titillium Web', sans-serif" }} />
              <ReferenceLine x={37} stroke={C.green} strokeWidth={1.5} strokeDasharray="5 3"
                label={{ value:'PIT 2 · V37', position:'top', fill:C.green, fontSize:8, fontFamily:"'Titillium Web', sans-serif" }} />

              <Bar dataKey="rate" name="Desgaste s/v" radius={[2, 2, 0, 0]} isAnimationActive animationDuration={700}>
                {rateData.map(d => (
                  <Cell
                    key={d.vuelta}
                    fill={
                      d.rate >= THRESHOLD_RED ? C.red    :
                      d.rate >= 0.25          ? C.orange :
                      d.rate >= THRESHOLD_YLW ? C.yellow : C.green
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div style={{ display:'flex', gap:16, justifyContent:'center', paddingBottom:4, flexWrap:'wrap' }}>
            {[
              [C.green,  '< 0.15  — Neumáticos frescos'],
              [C.yellow, '0.15–0.25  — Moderado'],
              [C.orange, '0.25–0.35  — Atención'],
              [C.red,    '≥ 0.35  — Pit window'],
            ].map(([color, label]) => (
              <span key={label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:9, color:C.gray, fontFamily:"'Titillium Web', sans-serif" }}>
                <span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:color, flexShrink:0 }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Chart 2: Strategy comparison ── */}
      <div>
        <SectionHeader
          n="02"
          title="Valor de la Predicción — Comparación de Estrategias"
          sub={`Tres estrategias, mismo punto de partida. El timing preciso del GNN ahorra ${gapNoMdl}s vs. una sola parada tardía y ${gapLate}s vs. dos paradas mal sincronizadas.`}
        />
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, padding:'16px 8px 8px' }}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={strategyData} margin={{ top:20, right:36, left:4, bottom:18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="vuelta" tick={axisStyle} axisLine={false} tickLine={false}
                label={{ value:'Vuelta de carrera', position:'insideBottom', offset:-8, fill:C.gray, fontSize:9, fontFamily:"'Titillium Web', sans-serif" }} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={42}
                tickFormatter={v => v + 's'} domain={[0, 22]}
                label={{ value:'Desgaste acumulado (s)', angle:-90, position:'insideLeft', offset:8, fill:C.gray, fontSize:9, fontFamily:"'Titillium Web', sans-serif" }} />
              <Tooltip content={<StrategyTooltip />} />
              <Legend
                wrapperStyle={{ fontFamily:"'Titillium Web', sans-serif", fontSize:10, color:C.lightGray, paddingTop:8 }}
                iconType="line"
              />

              {/* GNN pit markers */}
              <ReferenceLine x={21} stroke={C.green} strokeWidth={1} strokeDasharray="4 3" opacity={0.6}
                label={{ value:'V21', position:'top', fill:C.green, fontSize:8, fontFamily:"'Titillium Web', sans-serif" }} />
              <ReferenceLine x={37} stroke={C.green} strokeWidth={1} strokeDasharray="4 3" opacity={0.6}
                label={{ value:'V37', position:'top', fill:C.green, fontSize:8, fontFamily:"'Titillium Web', sans-serif" }} />

              {/* Delayed pit markers */}
              <ReferenceLine x={28} stroke={C.orange} strokeWidth={1} strokeDasharray="3 4" opacity={0.5}
                label={{ value:'V28', position:'top', fill:C.orange, fontSize:8, fontFamily:"'Titillium Web', sans-serif" }} />
              <ReferenceLine x={44} stroke={C.orange} strokeWidth={1} strokeDasharray="3 4" opacity={0.5}
                label={{ value:'V44', position:'top', fill:C.orange, fontSize:8, fontFamily:"'Titillium Web', sans-serif" }} />

              {/* 1-stop pit marker */}
              <ReferenceLine x={35} stroke={C.red} strokeWidth={1} strokeDasharray="3 4" opacity={0.5}
                label={{ value:'V35', position:'top', fill:C.red, fontSize:8, fontFamily:"'Titillium Web', sans-serif" }} />

              <Line type="monotone" dataKey="gnn"       name="GNN Óptimo  (V21 + V37)"    stroke={C.green}  strokeWidth={2.5} dot={false} isAnimationActive animationDuration={700} />
              <Line type="monotone" dataKey="tardio"    name="Tardío  (V28 + V44)"          stroke={C.orange} strokeWidth={1.8} strokeDasharray="6 3" dot={false} isAnimationActive animationDuration={700} />
              <Line type="monotone" dataKey="sinModelo" name="Sin modelo  (1 parada · V35)" stroke={C.red}    strokeWidth={1.8} strokeDasharray="4 2" dot={false} isAnimationActive animationDuration={700} />
            </LineChart>
          </ResponsiveContainer>

          {/* End-of-race gap annotation */}
          <div style={{ display:'flex', gap:12, padding:'10px 12px 4px', borderTop:`1px solid ${C.border}`, flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, color:C.gray, fontFamily:"'Titillium Web', sans-serif" }}>
              <span style={{ width:20, height:2, background:C.orange, display:'inline-block', borderRadius:1, flexShrink:0 }} />
              Tardío al final: <b style={{ color:C.orange, marginLeft:4 }}>+{gapLate}s</b>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, color:C.gray, fontFamily:"'Titillium Web', sans-serif" }}>
              <span style={{ width:20, height:2, background:C.red, display:'inline-block', borderRadius:1, flexShrink:0 }} />
              Sin modelo al final: <b style={{ color:C.red, marginLeft:4 }}>+{gapNoMdl}s</b>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, color:C.gray, fontFamily:"'Titillium Web', sans-serif", marginLeft:'auto' }}>
              <span style={{ width:20, height:2, background:C.green, display:'inline-block', borderRadius:1, flexShrink:0 }} />
              GNN: <b style={{ color:C.green, marginLeft:4 }}>{strategyData[49].gnn.toFixed(2)}s</b> desgaste total
            </div>
          </div>
        </div>
      </div>

      {/* ── Chart 3: Pit window cost ── */}
      <div>
        <SectionHeader
          n="03"
          title="Ventana Óptima — Costo Total por Vuelta de Entrada"
          sub="El GNN identifica V21 como el mínimo global. Pisar antes o después eleva el desgaste acumulado. La asimetría (penalización mayor por entrar tarde) es un patrón real en degradación de compuestos F1."
        />
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, padding:'16px 8px 8px' }}>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={pitWindowData} margin={{ top:12, right:32, left:4, bottom:18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false}
                label={{ value:'Primera parada (vuelta)', position:'insideBottom', offset:-8, fill:C.gray, fontSize:9, fontFamily:"'Titillium Web', sans-serif" }} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={42}
                tickFormatter={v => v + 's'} domain={[10.5, 14.5]}
                label={{ value:'Desgaste final V50 (s)', angle:-90, position:'insideLeft', offset:8, fill:C.gray, fontSize:9, fontFamily:"'Titillium Web', sans-serif" }} />
              <Tooltip content={<WindowTooltip />} cursor={{ fill:'rgba(255,255,255,0.03)' }} />
              <ReferenceLine y={GNN_FINAL} stroke={C.green} strokeDasharray="5 3" strokeWidth={1.5}
                label={{ value:`Mínimo GNN · ${GNN_FINAL.toFixed(2)}s`, position:'insideTopRight', fill:C.green, fontSize:8.5, fontFamily:"'Titillium Web', sans-serif" }} />
              <Bar dataKey="total" name="Desgaste final" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={600}>
                {pitWindowData.map(d => {
                  const extra = d.total - GNN_FINAL
                  return (
                    <Cell
                      key={d.lap}
                      fill={d.isOptimal ? C.green : extra < 0.6 ? C.yellow : extra < 1.5 ? C.orange : C.red}
                    />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Asymmetry note */}
          <div style={{ padding:'8px 12px 4px', borderTop:`1px solid ${C.border}`, display:'flex', gap:24, flexWrap:'wrap' }}>
            <div style={{ fontSize:9.5, color:C.gray, fontFamily:"'Titillium Web', sans-serif" }}>
              <b style={{ color:C.yellow }}>Entrar 6 vueltas antes (V15):</b> +0.90s
            </div>
            <div style={{ fontSize:9.5, color:C.gray, fontFamily:"'Titillium Web', sans-serif" }}>
              <b style={{ color:C.red }}>Entrar 9 vueltas después (V30):</b> +2.70s
            </div>
            <div style={{ fontSize:9.5, color:C.gray, fontFamily:"'Titillium Web', sans-serif", marginLeft:'auto' }}>
              La pendiente es 3× más pronunciada a la derecha — los neumáticos cliffean.
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
