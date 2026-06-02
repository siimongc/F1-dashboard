import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
  ComposedChart, Area, Line,
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

// ── Desgaste acumulado por stint (vuelve a 0 tras cada pit) ──────────────────
// Cada stint arranca desde la base del p50 en la primera vuelta de ese stint.
const p50_s1 = mc[0].p50
const p50_s2 = mc[PIT_1].p50   // lap PIT_1+1, primera vuelta con neumático nuevo
const p50_s3 = mc[PIT_2].p50   // lap PIT_2+1

const wearData = mc.map(d => {
  const base = d.vuelta <= PIT_1 ? p50_s1
             : d.vuelta <= PIT_2 ? p50_s2
             :                     p50_s3
  return {
    vuelta:   d.vuelta,
    wear:     +Math.max(0, d.p50  - base).toFixed(3),
    confHigh: +Math.max(0, d.p90  - base).toFixed(3),
    confLow:  +Math.max(0, d.p10  - base).toFixed(3),
  }
})

// Nivel de desgaste que disparó el primer pit — es el 100% de vida útil
const CRIT_WEAR = wearData[PIT_1 - 1].wear

// Normalizar a % de vida útil (0 = goma nueva, 100 = límite crítico)
const wearPctData = wearData.map(d => ({
  vuelta:      d.vuelta,
  wearPct:     +Math.min(105, (d.wear     / CRIT_WEAR) * 100).toFixed(1),
  confHighPct: +Math.min(110, (d.confHigh / CRIT_WEAR) * 100).toFixed(1),
  confLowPct:  +Math.max(0,   (d.confLow  / CRIT_WEAR) * 100).toFixed(1),
}))

// % al que el GNN ordenó el segundo pit (muestra anticipación)
const PCT_AT_PIT2 = +((wearData[PIT_2 - 1].wear / CRIT_WEAR) * 100).toFixed(0)

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
function WearTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const pct = payload.find(p => p.dataKey === 'wearPct')?.value
  if (pct == null) return null
  const [zone, col] =
    pct >= 100 ? ['LÍMITE ALCANZADO — pit inminente', C.red]    :
    pct >= 72  ? ['ATENCIÓN — desgaste elevado',       C.orange] :
    pct >= 40  ? ['MODERADO',                          C.yellow] :
                 ['NORMAL — neumático fresco',         C.green]
  return (
    <div style={{ background:'#1A1A2A', border:`1px solid ${C.border}`, borderRadius:4, padding:'8px 12px', fontFamily:"'Titillium Web', sans-serif", fontSize:11 }}>
      <div style={{ color:C.white, fontWeight:700, marginBottom:4 }}>Vuelta {label}</div>
      <div style={{ color:C.lightGray }}>Vida útil consumida: <b style={{ color:col }}>{pct.toFixed(0)}%</b></div>
      <div style={{ color:col, fontSize:10, marginTop:3 }}>{zone}</div>
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
            `El eje Y muestra qué porcentaje de vida útil tiene consumido el neumático: 0% = goma nueva, 100% = límite crítico de desgaste. ` +
            `La curva sube vuelta a vuelta y cae en vertical cuando hay un pit (neumático cambiado). ` +
            `En el primer stint el GNN ordena parar al llegar al 100%. En el segundo, para al ${PCT_AT_PIT2}% — porque predice que la degradación se va a acelerar y el neumático cruzaría el límite antes de terminar la carrera.`
          }
        />

        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, padding:'20px 20px 12px 8px' }}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={wearPctData} margin={{ top:24, right:48, left:4, bottom:18 }}>
              <defs>
                <linearGradient id="wearGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={C.red}    stopOpacity={0.60} />
                  <stop offset="50%"  stopColor={C.orange} stopOpacity={0.30} />
                  <stop offset="100%" stopColor={C.green}  stopOpacity={0.06} />
                </linearGradient>
                <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={C.orange} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={C.green}  stopOpacity={0.01} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis
                dataKey="vuelta" tick={axisStyle} axisLine={false} tickLine={false}
                label={{ value:'Vuelta de carrera', position:'insideBottom', offset:-8, fill:C.gray, fontSize:9, fontFamily:"'Titillium Web', sans-serif" }}
              />
              <YAxis
                tick={axisStyle} axisLine={false} tickLine={false} width={44}
                domain={[0, 115]} ticks={[0,25,50,75,100]}
                tickFormatter={v => v + '%'}
                label={{ value:'Vida útil consumida', angle:-90, position:'insideLeft', offset:8, fill:C.gray, fontSize:9, fontFamily:"'Titillium Web', sans-serif" }}
              />
              <Tooltip content={<WearTooltip />} cursor={{ stroke:C.border, strokeWidth:1 }} />

              {/* Límite crítico 100% */}
              <ReferenceLine y={100} stroke={C.red} strokeDasharray="5 3" strokeWidth={1.5}
                label={{ value:'100% — límite crítico', position:'insideTopRight', fill:C.red, fontSize:8.5, fontFamily:"'Titillium Web', sans-serif" }} />

              {/* Pit 1 — al 100% */}
              <ReferenceLine x={PIT_1} stroke={C.green} strokeWidth={2} strokeDasharray="5 3"
                label={{ value:`▼ PIT 1  V${PIT_1} · 100%`, position:'top', fill:C.green, fontSize:8.5, fontFamily:"'Titillium Web', sans-serif", fontWeight:700 }} />

              {/* Pit 2 — anticipado antes del 100% */}
              <ReferenceLine x={PIT_2} stroke={C.yellow} strokeWidth={2} strokeDasharray="5 3"
                label={{ value:`▼ PIT 2  V${PIT_2} · ${PCT_AT_PIT2}% — anticipado`, position:'top', fill:C.yellow, fontSize:8.5, fontFamily:"'Titillium Web', sans-serif", fontWeight:700 }} />

              {/* Banda de confianza P10–P90 */}
              <Area type="monotone" dataKey="confHighPct" fill="url(#confGrad)" stroke="none" isAnimationActive={false} />
              <Area type="monotone" dataKey="confLowPct"  fill={C.surface}      stroke="none" isAnimationActive={false} />

              {/* Curva principal de desgaste */}
              <Area
                type="monotone" dataKey="wearPct"
                fill="url(#wearGrad)" stroke={C.orange} strokeWidth={2.5}
                dot={false} isAnimationActive animationDuration={900}
              />

              {/* Dot activo al hover */}
              <Line
                type="monotone" dataKey="wearPct" stroke="none" dot={false}
                activeDot={{ r:5, fill:C.orange, stroke:C.white, strokeWidth:2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Leyenda */}
          <div style={{ display:'flex', gap:24, justifyContent:'center', paddingTop:4, flexWrap:'wrap' }}>
            {[
              { color:C.green,  label:'0% — neumático nuevo' },
              { color:C.orange, label:'Desgaste creciente' },
              { color:C.red,    label:'100% — límite crítico' },
              { color:C.yellow, label:'Pit anticipado por el GNN' },
            ].map(({ color, label }) => (
              <span key={label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:9.5, color:C.gray, fontFamily:"'Titillium Web', sans-serif" }}>
                <span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:color, flexShrink:0 }} />
                {label}
              </span>
            ))}
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
