import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
  ComposedChart, Area,
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

const mc      = tracksData.monte_carlo
const PIT_1   = 21
const PIT_2   = 37
const NO_PIT  = 35   // 1-stop sin modelo

// ── Tasa de degradación por vuelta (delta del P50 acumulado) ─────────────────
const rateData = mc.map((d, i) => ({
  vuelta: d.vuelta,
  rate:   i === 0 ? d.p50 : +(d.p50 - mc[i - 1].p50).toFixed(4),
}))

// ── Ventaja acumulada GNN vs. estrategia sin modelo (1 parada en V35) ────────
// Sin modelo: sigue degradándose sin parar en V21; para en V35 una sola vez.
// extraLate[v] = segundos extra de desgaste que acumula vs. la estrategia GNN.
const savingsData = mc.map(d => {
  const v = d.vuelta
  const extraLate =
    v > PIT_1 && v <= NO_PIT ? (v - PIT_1) * 0.38 :
    v > NO_PIT               ? (NO_PIT - PIT_1) * 0.38 + (v - NO_PIT) * 0.12 : 0
  return { vuelta: v, ahorro: +extraLate.toFixed(3) }
})

const FINAL_SAVING = savingsData[49].ahorro   // 7.12s

const axisStyle = { fill: C.gray, fontFamily: "'Titillium Web', sans-serif", fontSize: 10 }

// ── Tooltips ─────────────────────────────────────────────────────────────────
function RateTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const rate = payload[0]?.value
  const [zoneLabel, zoneColor] =
    rate >= 0.35 ? ['CRÍTICO — Pit window activado', C.red]  :
    rate >= 0.25 ? ['ATENCIÓN — Desgaste elevado',   C.orange] :
    rate >= 0.15 ? ['MODERADO',                       C.yellow] :
                   ['NORMAL — Neumático fresco',      C.green]
  return (
    <div style={{ background:'#1A1A2A', border:`1px solid ${C.border}`, borderRadius:4, padding:'8px 12px', fontFamily:"'Titillium Web', sans-serif", fontSize:11 }}>
      <div style={{ color:C.white, fontWeight:700, marginBottom:4 }}>Vuelta {label}</div>
      <div style={{ color:C.lightGray }}>Tasa: <b style={{ color:zoneColor }}>{rate?.toFixed(3)} s/v</b></div>
      <div style={{ color:zoneColor, fontSize:10, marginTop:2 }}>{zoneLabel}</div>
    </div>
  )
}

function SavingsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const ahorro = payload[0]?.value
  return (
    <div style={{ background:'#1A1A2A', border:`1px solid ${C.border}`, borderRadius:4, padding:'8px 12px', fontFamily:"'Titillium Web', sans-serif", fontSize:11 }}>
      <div style={{ color:C.white, fontWeight:700, marginBottom:4 }}>Vuelta {label}</div>
      <div style={{ color:C.green }}>
        Ventaja acumulada: <b>{ahorro?.toFixed(2)}s</b>
      </div>
      <div style={{ color:C.gray, fontSize:10, marginTop:2 }}>
        {ahorro < 0.1   ? 'Estrategias iguales — neumáticos frescos'  :
         ahorro < 3     ? 'Ventaja creciendo — rival con neumático desgastado' :
         label <= NO_PIT ? 'Ventaja máxima antes de la parada del rival'       :
                           'Ventaja consolidada — neumático fresco GNN vs. rival'}
      </div>
    </div>
  )
}

// ── Cabecera narrativa ────────────────────────────────────────────────────────
function NarrativeHeader({ n, title, subtitle }) {
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:6 }}>
        <span style={{
          background:C.red, color:C.white, fontSize:9, fontWeight:900,
          padding:'3px 8px', borderRadius:2, letterSpacing:'0.1em', flexShrink:0, marginTop:2,
        }}>{n}</span>
        <span style={{ color:C.white, fontWeight:700, fontSize:14, letterSpacing:'0.05em', textTransform:'uppercase', lineHeight:1.35 }}>
          {title}
        </span>
      </div>
      <div style={{ color:C.gray, fontSize:11, marginLeft:36, lineHeight:1.65 }}>{subtitle}</div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function StrategyStory() {
  return (
    <div style={{ fontFamily:"'Titillium Web', sans-serif", display:'flex', flexDirection:'column', gap:48 }}>

      {/* ═══════════════════════════════════════════════════════════════════════
          CHART 1 — La señal
      ═══════════════════════════════════════════════════════════════════════ */}
      <div>
        <NarrativeHeader
          n="01"
          title="La señal — el GNN detecta cuándo el neumático alcanza el punto de quiebre"
          subtitle={
            `Cada barra muestra cuántos segundos de degradación se acumulan por vuelta. ` +
            `Cuando la tasa supera 0.35 s/v (rojo), el neumático ha alcanzado su umbral crítico y la parada es inminente. ` +
            `En la vuelta ${PIT_1} la tasa llega a 0.384 s/v — el GNN activa el pit. ` +
            `En la vuelta ${PIT_2} la tasa aún es moderada, pero el modelo anticipa el pico de V44 (0.49 s/v) y ordena la segunda parada antes de que ocurra.`
          }
        />

        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, padding:'20px 20px 12px 8px' }}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={rateData} margin={{ top:18, right:36, left:4, bottom:18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis
                dataKey="vuelta" tick={axisStyle} axisLine={false} tickLine={false}
                label={{ value:'Vuelta de carrera', position:'insideBottom', offset:-8, fill:C.gray, fontSize:9, fontFamily:"'Titillium Web', sans-serif" }}
              />
              <YAxis
                tick={axisStyle} axisLine={false} tickLine={false} width={38}
                domain={[0, 0.60]} tickFormatter={v => v.toFixed(2)}
                label={{ value:'s / vuelta', angle:-90, position:'insideLeft', offset:6, fill:C.gray, fontSize:9, fontFamily:"'Titillium Web', sans-serif" }}
              />
              <Tooltip content={<RateTooltip />} cursor={{ fill:'rgba(255,255,255,0.03)' }} />

              {/* Umbral crítico */}
              <ReferenceLine y={0.35} stroke={C.red} strokeDasharray="5 3" strokeWidth={1.5}
                label={{ value:'Umbral crítico  0.35 s/v', position:'insideTopRight', fill:C.red, fontSize:8.5, fontFamily:"'Titillium Web', sans-serif" }} />

              {/* Pit 1 */}
              <ReferenceLine x={PIT_1} stroke={C.green} strokeWidth={2} strokeDasharray="5 3"
                label={{ value:`▼ GNN: PIT 1  ·  V${PIT_1}`, position:'top', fill:C.green, fontSize:8.5, fontFamily:"'Titillium Web', sans-serif", fontWeight:700 }} />

              {/* Pit 2 */}
              <ReferenceLine x={PIT_2} stroke={C.green} strokeWidth={2} strokeDasharray="5 3"
                label={{ value:`▼ GNN: PIT 2  ·  V${PIT_2}`, position:'top', fill:C.green, fontSize:8.5, fontFamily:"'Titillium Web', sans-serif", fontWeight:700 }} />

              <Bar dataKey="rate" radius={[2,2,0,0]} isAnimationActive animationDuration={700}>
                {rateData.map(d => (
                  <Cell
                    key={d.vuelta}
                    fill={d.rate >= 0.35 ? C.red : '#3A3A58'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Leyenda simplificada */}
          <div style={{ display:'flex', gap:24, justifyContent:'center', paddingTop:4 }}>
            <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:9.5, color:C.gray, fontFamily:"'Titillium Web', sans-serif" }}>
              <span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:'#3A3A58', flexShrink:0 }} />
              Desgaste normal
            </span>
            <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:9.5, color:C.lightGray, fontFamily:"'Titillium Web', sans-serif" }}>
              <span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:C.red, flexShrink:0 }} />
              Umbral crítico ≥ 0.35 s/v — el GNN activa el pit
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          CHART 2 — El resultado
      ═══════════════════════════════════════════════════════════════════════ */}
      <div>
        <NarrativeHeader
          n="02"
          title={`El resultado — ${FINAL_SAVING.toFixed(1)} segundos ganados sobre una estrategia sin modelo`}
          subtitle={
            `El área verde muestra la ventaja acumulada del GNN sobre un equipo que no usa predicción y para una sola vez en V${NO_PIT}. ` +
            `La ventaja empieza a crecer en V${PIT_1} cuando el GNN entra con neumático fresco mientras el rival sigue desgastando. ` +
            `En V${NO_PIT} el rival finalmente para, pero ya acumuló ${((NO_PIT - PIT_1) * 0.38).toFixed(1)}s de penalización. ` +
            `Al final de la carrera, la diferencia total es de ${FINAL_SAVING.toFixed(1)} segundos — suficiente para ganar o perder una posición en carrera.`
          }
        />

        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, padding:'20px 20px 12px 8px' }}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={savingsData} margin={{ top:18, right:36, left:4, bottom:18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis
                dataKey="vuelta" tick={axisStyle} axisLine={false} tickLine={false}
                label={{ value:'Vuelta de carrera', position:'insideBottom', offset:-8, fill:C.gray, fontSize:9, fontFamily:"'Titillium Web', sans-serif" }}
              />
              <YAxis
                tick={axisStyle} axisLine={false} tickLine={false} width={42}
                domain={[0, 9]} tickFormatter={v => v + 's'}
                label={{ value:'Ventaja acumulada (s)', angle:-90, position:'insideLeft', offset:8, fill:C.gray, fontSize:9, fontFamily:"'Titillium Web', sans-serif" }}
              />
              <Tooltip content={<SavingsTooltip />} />

              {/* Línea final de ventaja */}
              <ReferenceLine y={FINAL_SAVING} stroke={C.green} strokeDasharray="5 3" strokeWidth={1.5}
                label={{ value:`${FINAL_SAVING.toFixed(1)}s al final de carrera`, position:'insideTopRight', fill:C.green, fontSize:9, fontFamily:"'Titillium Web', sans-serif", fontWeight:700 }} />

              {/* GNN pits */}
              <ReferenceLine x={PIT_1} stroke={C.green} strokeWidth={1.5} strokeDasharray="4 3"
                label={{ value:`GNN PIT 1  V${PIT_1}`, position:'insideTopRight', fill:C.green, fontSize:8, fontFamily:"'Titillium Web', sans-serif", dy:12 }} />
              <ReferenceLine x={PIT_2} stroke={C.green} strokeWidth={1.5} strokeDasharray="4 3"
                label={{ value:`GNN PIT 2  V${PIT_2}`, position:'insideTopRight', fill:C.green, fontSize:8, fontFamily:"'Titillium Web', sans-serif", dy:12 }} />

              {/* Rival entra */}
              <ReferenceLine x={NO_PIT} stroke={C.red} strokeWidth={1.5} strokeDasharray="4 3"
                label={{ value:`Rival entra  V${NO_PIT}`, position:'insideTopLeft', fill:C.red, fontSize:8, fontFamily:"'Titillium Web', sans-serif", dy:12 }} />

              {/* Área de ventaja */}
              <Area
                type="monotone" dataKey="ahorro" name="Ventaja GNN"
                stroke={C.green} strokeWidth={2.5}
                fill="rgba(0,210,122,0.18)"
                isAnimationActive animationDuration={900} animationEasing="ease-out"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Fases anotadas */}
        <div style={{ display:'flex', gap:0, marginTop:12, borderRadius:4, overflow:'hidden', border:`1px solid ${C.border}` }}>
          {[
            { rango:`V1–${PIT_1}`,          label:'Estrategias iguales',                          color:C.gray,   desc:'Mismo neumático, mismo desgaste.' },
            { rango:`V${PIT_1}–${NO_PIT}`,  label:'Ventaja abierta',                              color:C.green,  desc:'GNN con neumático fresco, rival sigue desgastando.' },
            { rango:`V${NO_PIT}–${PIT_2}`,  label:'Rival intenta recuperar',                      color:C.orange, desc:'Rival para en V35, pero ya lleva 5.3s de penalización.' },
            { rango:`V${PIT_2}–50`,          label:`${FINAL_SAVING.toFixed(1)}s consolidados`,    color:C.green,  desc:'GNN segunda parada, ventaja mínima pero suficiente.' },
          ].map(f => (
            <div key={f.rango} style={{ flex:1, padding:'10px 12px', background:C.surfaceAlt, borderRight:`1px solid ${C.border}` }}>
              <div style={{ color:f.color, fontSize:9.5, fontWeight:700, letterSpacing:'0.06em', marginBottom:3 }}>{f.rango}</div>
              <div style={{ color:C.white, fontSize:10, fontWeight:700, marginBottom:2 }}>{f.label}</div>
              <div style={{ color:C.gray, fontSize:9.5, lineHeight:1.4 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          Conclusión
      ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        background:'rgba(0,210,122,0.06)',
        border:`1px solid rgba(0,210,122,0.30)`,
        borderRadius:4, padding:'20px 24px',
        display:'flex', gap:24, alignItems:'center', flexWrap:'wrap',
      }}>
        <div style={{ flex:'0 0 auto' }}>
          <div style={{ color:C.green, fontSize:48, fontWeight:900, lineHeight:1, letterSpacing:'-0.03em' }}>
            {FINAL_SAVING.toFixed(1)}s
          </div>
          <div style={{ color:C.green, fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginTop:4 }}>
            ganados en carrera
          </div>
        </div>
        <div style={{ flex:1, minWidth:240, borderLeft:`1px solid rgba(0,210,122,0.20)`, paddingLeft:24 }}>
          <div style={{ color:C.white, fontSize:13, fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:8, lineHeight:1.4 }}>
            Midiendo el desgaste en tiempo real, el GNN identifica el momento exacto del pit
          </div>
          <div style={{ color:C.gray, fontSize:11, lineHeight:1.65 }}>
            Con solo las variables de condición del neumático — vida útil, temperatura, combustible —
            el modelo predice cuándo se cruza el umbral de degradación crítica y recomienda la parada.
            Esa información convierte una decisión reactiva en una ventaja estratégica planificada.
          </div>
        </div>
      </div>

    </div>
  )
}
