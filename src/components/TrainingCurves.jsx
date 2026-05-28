import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'

const C = {
  red:       '#E10600',
  orange:    '#FF6B35',
  cyan:      '#00E5FF',
  yellow:    '#FFD700',
  green:     '#00D27A',
  gray:      '#8B8BA3',
  border:    '#2A2A40',
  surfaceAlt:'#252538',
  white:     '#FFFFFF',
  lightGray: '#C4C4D4',
}

const axisStyle = { fill: C.gray, fontFamily: "'Titillium Web', sans-serif", fontSize: 11 }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div style={{
      background: '#1A1A2A', border: `1px solid ${C.border}`, borderRadius: 4,
      padding: '8px 12px', fontFamily: "'Titillium Web', sans-serif", fontSize: 12,
    }}>
      <div style={{ color: C.white, fontWeight: 700, marginBottom: 4 }}>Epoch {label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.stroke, marginBottom: 2 }}>
          {p.name}: <b>{typeof p.value === 'number' ? p.value.toFixed(4) : p.value}</b>
        </div>
      ))}
    </div>
  )
}

const panelStyle = {
  background: C.surfaceAlt,
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  padding: '16px 12px 8px',
}

const panelTitle = {
  color: C.white,
  fontFamily: "'Titillium Web', sans-serif",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 12,
}

export default function TrainingCurves({ history }) {
  const lrTickFormatter = (v) => {
    if (v >= 0.001) return '1e-3'
    if (v >= 0.0001) return '1e-4'
    return '1e-5'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Titillium Web', sans-serif" }}>

      {/* Panel 1 — Loss Curves */}
      <div style={panelStyle}>
        <div style={panelTitle}>CURVAS DE LOSS · HUBER</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={history} margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="epoch" tick={axisStyle} axisLine={{ stroke: C.border }} tickLine={false}
              label={{ value: 'Epoch', position: 'insideBottom', offset: -4, fill: C.gray, fontSize: 10, fontFamily: "'Titillium Web', sans-serif" }} />
            <YAxis domain={[0.35, 1.25]} tick={axisStyle} axisLine={false} tickLine={false}
              tickFormatter={v => v.toFixed(2)} width={40}
              label={{ value: 'Huber Loss', angle: -90, position: 'insideLeft', fill: C.gray, fontSize: 10, fontFamily: "'Titillium Web', sans-serif" }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontFamily: "'Titillium Web', sans-serif", fontSize: 11, color: C.lightGray, paddingTop: 6 }} iconType="line" />
            <ReferenceLine x={155} stroke={C.yellow} strokeDasharray="4 2" strokeWidth={1}
              label={{ value: 'LR ÷10', position: 'top', fill: C.yellow, fontSize: 9, fontFamily: "'Titillium Web', sans-serif" }} />
            <ReferenceLine x={260} stroke={C.yellow} strokeDasharray="4 2" strokeWidth={1}
              label={{ value: 'LR ÷10', position: 'top', fill: C.yellow, fontSize: 9, fontFamily: "'Titillium Web', sans-serif" }} />
            <Line type="monotone" dataKey="train_loss" name="Train Loss" stroke={C.red}
              strokeWidth={2} dot={false} isAnimationActive animationDuration={800} animationEasing="ease-out" />
            <Line type="monotone" dataKey="val_loss" name="Val Loss" stroke={C.cyan}
              strokeWidth={2} strokeDasharray="4 2" dot={false} isAnimationActive animationDuration={800} animationEasing="ease-out" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Panel 2 — Val MAE */}
      <div style={panelStyle}>
        <div style={panelTitle}>ERROR ABSOLUTO MEDIO (VAL)</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={history} margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="epoch" tick={axisStyle} axisLine={{ stroke: C.border }} tickLine={false}
              label={{ value: 'Epoch', position: 'insideBottom', offset: -4, fill: C.gray, fontSize: 10, fontFamily: "'Titillium Web', sans-serif" }} />
            <YAxis domain={[0.75, 1.6]} tick={axisStyle} axisLine={false} tickLine={false}
              tickFormatter={v => v.toFixed(2) + 's'} width={48}
              label={{ value: 'MAE (s)', angle: -90, position: 'insideLeft', fill: C.gray, fontSize: 10, fontFamily: "'Titillium Web', sans-serif" }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontFamily: "'Titillium Web', sans-serif", fontSize: 11, color: C.lightGray, paddingTop: 6 }} iconType="line" />
            <ReferenceLine y={0.80} stroke={C.green} strokeDasharray="4 2" strokeWidth={1}
              label={{ value: 'Final ~0.80s', position: 'insideTopRight', fill: C.green, fontSize: 9, fontFamily: "'Titillium Web', sans-serif" }} />
            <Line type="monotone" dataKey="val_mae" name="Val MAE (s)" stroke={C.orange}
              strokeWidth={2} dot={false} isAnimationActive animationDuration={800} animationEasing="ease-out" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Panel 3 — Learning Rate */}
      <div style={panelStyle}>
        <div style={panelTitle}>LEARNING RATE SCHEDULE</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={history} margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="epoch" tick={axisStyle} axisLine={{ stroke: C.border }} tickLine={false}
              label={{ value: 'Epoch', position: 'insideBottom', offset: -4, fill: C.gray, fontSize: 10, fontFamily: "'Titillium Web', sans-serif" }} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false}
              tickFormatter={lrTickFormatter} width={44} domain={[0.000005, 0.0015]}
              label={{ value: 'LR', angle: -90, position: 'insideLeft', fill: C.gray, fontSize: 10, fontFamily: "'Titillium Web', sans-serif" }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontFamily: "'Titillium Web', sans-serif", fontSize: 11, color: C.lightGray, paddingTop: 6 }} iconType="line" />
            <ReferenceLine x={155} stroke={C.yellow} strokeDasharray="4 2" strokeWidth={1}
              label={{ value: '÷10', position: 'top', fill: C.yellow, fontSize: 9, fontFamily: "'Titillium Web', sans-serif" }} />
            <ReferenceLine x={260} stroke={C.yellow} strokeDasharray="4 2" strokeWidth={1}
              label={{ value: '÷10', position: 'top', fill: C.yellow, fontSize: 9, fontFamily: "'Titillium Web', sans-serif" }} />
            <Line type="stepAfter" dataKey="lr" name="LR" stroke={C.cyan}
              strokeWidth={2} dot={false} isAnimationActive animationDuration={800} animationEasing="ease-out" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
