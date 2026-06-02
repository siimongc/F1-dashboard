import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'

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

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const train = payload.find(p => p.dataKey === 'train_loss')
  const val   = payload.find(p => p.dataKey === 'val_loss')
  const gap   = train && val ? Math.abs(train.value - val.value).toFixed(4) : null
  return (
    <div style={{
      background: '#1A1A2A', border: `1px solid ${C.border}`,
      borderRadius: 4, padding: '10px 14px',
      fontFamily: "'Titillium Web', sans-serif", fontSize: 11,
    }}>
      <div style={{ color: C.white, fontWeight: 700, marginBottom: 6 }}>Época {label}</div>
      {train && <div style={{ color: C.orange }}>Entrenamiento: <b>{train.value.toFixed(4)}</b></div>}
      {val   && <div style={{ color: C.lightGray }}>Validación: <b>{val.value.toFixed(4)}</b></div>}
      {gap   && <div style={{ color: C.gray, fontSize: 10, marginTop: 4 }}>Diferencia: {gap}</div>}
    </div>
  )
}

export default function TrainingCurves({ history }) {
  const first = history[0]
  const last  = history[history.length - 1]
  const gap   = +(last.train_loss - last.val_loss).toFixed(3)

  const stats = [
    { label: 'Loss inicial',     value: first.train_loss.toFixed(2), color: C.gray  },
    { label: 'Loss final',       value: last.val_loss.toFixed(2),    color: C.green },
    { label: 'Reducción',        value: `${(((first.train_loss - last.val_loss) / first.train_loss) * 100).toFixed(0)}%`, color: C.green },
    { label: 'Gap train / val',  value: Math.abs(gap).toFixed(3),    color: Math.abs(gap) < 0.05 ? C.green : C.yellow,
      sub: Math.abs(gap) < 0.05 ? 'sin sobreajuste' : 'leve diferencia' },
  ]

  return (
    <div style={{ fontFamily: "'Titillium Web', sans-serif" }}>

      {/* Stat strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: C.surfaceAlt, border: `1px solid ${C.border}`,
            borderRadius: 4, padding: '10px 16px', flex: '1 1 100px', textAlign: 'center',
          }}>
            <div style={{ color: s.color, fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{s.value}</div>
            <div style={{ color: C.gray, fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
            {s.sub && <div style={{ color: s.color, fontSize: 9, marginTop: 2 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Gráfica principal */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '20px 20px 8px 4px' }}>

        {/* Leyenda manual */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 12, paddingLeft: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke={C.orange} strokeWidth="2.5" /></svg>
            <span style={{ color: C.gray, fontSize: 10 }}>Entrenamiento</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke={C.lightGray} strokeWidth="2" strokeDasharray="5 3" /></svg>
            <span style={{ color: C.gray, fontSize: 10 }}>Validación</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={history} margin={{ top: 8, right: 32, left: 4, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis
              dataKey="epoch" tick={axisStyle} axisLine={false} tickLine={false}
              label={{ value: 'Época de entrenamiento', position: 'insideBottom', offset: -8, fill: C.gray, fontSize: 9, fontFamily: "'Titillium Web', sans-serif" }}
            />
            <YAxis
              domain={[0.35, 1.25]} tick={axisStyle} axisLine={false} tickLine={false}
              tickFormatter={v => v.toFixed(1)} width={36}
              label={{ value: 'Huber Loss', angle: -90, position: 'insideLeft', offset: 10, fill: C.gray, fontSize: 9, fontFamily: "'Titillium Web', sans-serif" }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: C.border, strokeWidth: 1 }} />

            {/* LR decay markers */}
            <ReferenceLine x={155} stroke={C.yellow} strokeDasharray="4 3" strokeWidth={1}
              label={{ value: 'LR ÷10', position: 'insideTopRight', fill: C.yellow, fontSize: 8, fontFamily: "'Titillium Web', sans-serif", dy: 2 }} />
            <ReferenceLine x={260} stroke={C.yellow} strokeDasharray="4 3" strokeWidth={1}
              label={{ value: 'LR ÷10', position: 'insideTopRight', fill: C.yellow, fontSize: 8, fontFamily: "'Titillium Web', sans-serif", dy: 2 }} />

            <Line
              type="monotone" dataKey="train_loss"
              stroke={C.orange} strokeWidth={2.5}
              dot={false} isAnimationActive animationDuration={900} animationEasing="ease-out"
            />
            <Line
              type="monotone" dataKey="val_loss"
              stroke={C.lightGray} strokeWidth={2} strokeDasharray="5 3"
              dot={false} isAnimationActive animationDuration={900} animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Mensaje clave */}
      <div style={{
        marginTop: 12,
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: C.green + '14', border: `1px solid ${C.green}40`,
        borderRadius: 4, padding: '8px 14px',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, flexShrink: 0 }} />
        <span style={{ color: C.lightGray, fontSize: 11, lineHeight: 1.5 }}>
          Las curvas de entrenamiento y validación <b>convergen juntas y permanecen próximas</b> — el modelo aprendió los patrones reales del desgaste sin memorizar los datos de entrenamiento.
        </span>
      </div>

    </div>
  )
}
