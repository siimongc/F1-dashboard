import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const chartFont = { fontFamily: "'Titillium Web', sans-serif" }

const axisProps = {
  tick: { fill: '#8B8BA3', fontSize: 11, ...chartFont },
  axisLine: false,
  tickLine: false,
}

function LossTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1E1E2E', border: '1px solid #2A2A40', borderRadius: '4px', padding: '10px 14px', ...chartFont }}>
      <div style={{ fontSize: '10px', letterSpacing: '2px', color: '#8B8BA3', marginBottom: '6px', textTransform: 'uppercase' }}>
        EPOCH {label}
      </div>
      {payload.map((p) => (
        <div key={p.name} style={{ fontSize: '13px', color: p.color, marginBottom: '2px', fontWeight: '600' }}>
          {p.name}: {Number(p.value).toFixed(4)}
        </div>
      ))}
    </div>
  )
}

function AccTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1E1E2E', border: '1px solid #2A2A40', borderRadius: '4px', padding: '10px 14px', ...chartFont }}>
      <div style={{ fontSize: '10px', letterSpacing: '2px', color: '#8B8BA3', marginBottom: '6px', textTransform: 'uppercase' }}>
        EPOCH {label}
      </div>
      {payload.map((p) => (
        <div key={p.name} style={{ fontSize: '13px', color: p.color, marginBottom: '2px', fontWeight: '600' }}>
          {p.name}: {(Number(p.value) * 100).toFixed(1)}%
        </div>
      ))}
    </div>
  )
}

const panelStyle = {
  background: '#1E1E2E',
  border: '1px solid #2A2A40',
  borderRadius: '4px',
  padding: '24px',
}

const sectionLabel = {
  fontSize: '11px', fontWeight: '600', letterSpacing: '2px',
  color: '#8B8BA3', textTransform: 'uppercase', marginBottom: '20px',
}

export default function TrainingCurves({ history }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
      gap: '16px',
    }}>
      {/* Loss */}
      <div style={panelStyle}>
        <div style={sectionLabel}>LOSS CURVES</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A40" />
            <XAxis dataKey="epoch" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip content={<LossTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px', ...chartFont }} />
            <Line
              type="monotone" dataKey="train_loss" name="Train Loss"
              stroke="#E10600" strokeWidth={2} dot={{ fill: '#E10600', r: 3 }}
              activeDot={{ r: 5 }}
              isAnimationActive animationDuration={1000} animationEasing="ease-out"
            />
            <Line
              type="monotone" dataKey="val_loss" name="Val Loss"
              stroke="#00E5FF" strokeWidth={2} dot={{ fill: '#00E5FF', r: 3 }}
              activeDot={{ r: 5 }}
              isAnimationActive animationDuration={1000} animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Accuracy */}
      <div style={panelStyle}>
        <div style={sectionLabel}>ACCURACY CURVES</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A40" />
            <XAxis dataKey="epoch" {...axisProps} />
            <YAxis
              domain={[0, 1]}
              tickFormatter={(v) => (v * 100).toFixed(0) + '%'}
              {...axisProps}
            />
            <Tooltip content={<AccTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px', ...chartFont }} />
            <Line
              type="monotone" dataKey="train_acc" name="Train Acc"
              stroke="#00D27A" strokeWidth={2} dot={{ fill: '#00D27A', r: 3 }}
              activeDot={{ r: 5 }}
              isAnimationActive animationDuration={1000} animationEasing="ease-out"
            />
            <Line
              type="monotone" dataKey="val_acc" name="Val Acc"
              stroke="#FFD700" strokeWidth={2} dot={{ fill: '#FFD700', r: 3 }}
              activeDot={{ r: 5 }}
              isAnimationActive animationDuration={1000} animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
