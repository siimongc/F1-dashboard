import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'

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

const axisStyle = { fill: C.gray, fontFamily: "'Titillium Web', sans-serif", fontSize: 11 }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null
  const p10 = payload.find(p => p.dataKey === 'p10')
  const p50 = payload.find(p => p.dataKey === 'p50')
  const p90 = payload.find(p => p.dataKey === 'p90')
  return (
    <div style={{
      background: '#1A1A2A', border: `1px solid ${C.border}`, borderRadius: 4,
      padding: '10px 14px', fontFamily: "'Titillium Web', sans-serif", fontSize: 12,
    }}>
      <div style={{ color: C.white, fontWeight: 700, marginBottom: 6 }}>Vuelta {label}</div>
      {p90 && <div style={{ color: C.yellow, marginBottom: 2 }}>P90 (Crítico): <b>{p90.value?.toFixed(4)}s</b></div>}
      {p50 && <div style={{ color: C.red,    marginBottom: 2 }}>P50 (Esperado): <b>{p50.value?.toFixed(4)}s</b></div>}
      {p10 && <div style={{ color: C.green,  marginBottom: 2 }}>P10 (Optimista): <b>{p10.value?.toFixed(4)}s</b></div>}
    </div>
  )
}

export default function MonteCarloChart({ data }) {
  const lap50 = data.find(d => d.vuelta === 50) || { p10: 7.7615, p50: 11.3882, p90: 15.3427 }

  return (
    <div style={{ fontFamily: "'Titillium Web', sans-serif" }}>
      <div style={{ marginBottom: 6 }}>
        <div style={{ color: C.white, fontWeight: 700, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          SIMULACIÓN MONTE CARLO — ESTRATEGIA DE PARADAS
        </div>
        <div style={{ color: C.gray, fontSize: 11, marginTop: 2 }}>
          Bandas de confianza P10/P50/P90 · 50 vueltas · Degradación acumulada
        </div>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={data} margin={{ top: 12, right: 28, left: 8, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="vuelta" tick={axisStyle} axisLine={{ stroke: C.border }} tickLine={false}
            label={{ value: 'Vuelta de carrera', position: 'insideBottom', offset: -12, fill: C.gray, fontSize: 11, fontFamily: "'Titillium Web', sans-serif" }} />
          <YAxis domain={[0, 17]} tick={axisStyle} axisLine={false} tickLine={false}
            tickFormatter={v => v + 's'} width={42}
            label={{ value: 'Tiempo acumulado (s)', angle: -90, position: 'insideLeft', offset: 10, fill: C.gray, fontSize: 11, fontFamily: "'Titillium Web', sans-serif" }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontFamily: "'Titillium Web', sans-serif", fontSize: 11, color: C.lightGray, paddingTop: 8 }}
            iconType="line"
          />

          {/* confidence band — fill area between p10 and p90 */}
          <Area
            type="monotone" dataKey="p90"
            fill="rgba(255,107,53,0.18)" stroke="none"
            isAnimationActive animationDuration={800} animationEasing="ease-out"
            legendType="none" name="__hidden_p90_area"
          />
          <Area
            type="monotone" dataKey="p10"
            fill={C.surface} stroke="none"
            isAnimationActive animationDuration={800} animationEasing="ease-out"
            legendType="none" name="__hidden_p10_mask"
          />

          {/* actual lines */}
          <Line type="monotone" dataKey="p90" name="Límite Crítico (P90)"
            stroke={C.yellow} strokeDasharray="5 3" strokeWidth={1.5} dot={false}
            isAnimationActive animationDuration={800} animationEasing="ease-out" />
          <Line type="monotone" dataKey="p50" name="Estrategia Esperada (P50)"
            stroke={C.red} strokeWidth={2.5} dot={false}
            isAnimationActive animationDuration={800} animationEasing="ease-out" />
          <Line type="monotone" dataKey="p10" name="Escenario Optimista (P10)"
            stroke={C.green} strokeDasharray="5 3" strokeWidth={1.5} dot={false}
            isAnimationActive animationDuration={800} animationEasing="ease-out" />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Lap 50 summary cards */}
      <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'ESCENARIO OPTIMISTA (P10)', value: lap50.p10.toFixed(2) + 's', color: C.green },
          { label: 'ESTRATEGIA ESPERADA (P50)', value: lap50.p50.toFixed(2) + 's', color: C.red   },
          { label: 'LÍMITE CRÍTICO (P90)',       value: lap50.p90.toFixed(2) + 's', color: C.yellow },
        ].map(card => (
          <div key={card.label} style={{
            flex: '1 1 160px',
            background: C.surfaceAlt,
            border: `1px solid ${C.border}`,
            borderRadius: 4,
            padding: '14px 18px',
            textAlign: 'center',
          }}>
            <div style={{ color: C.gray, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              {card.label}
            </div>
            <div style={{ color: card.color, fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {card.value}
            </div>
            <div style={{ color: C.gray, fontSize: 10, marginTop: 4 }}>acumulado · Vuelta 50</div>
          </div>
        ))}
      </div>
    </div>
  )
}
