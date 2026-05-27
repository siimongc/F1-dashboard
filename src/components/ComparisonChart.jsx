import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const METRICS = [
  { key: 'accuracy',  label: 'Accuracy'  },
  { key: 'precision', label: 'Precision' },
  { key: 'recall',    label: 'Recall'    },
  { key: 'f1_score',  label: 'F1'        },
  { key: 'auc_roc',   label: 'AUC-ROC'  },
]

const chartFont = { fontFamily: "'Titillium Web', sans-serif" }

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1E1E2E',
      border: '1px solid #2A2A40',
      borderRadius: '4px',
      padding: '10px 14px',
      ...chartFont,
    }}>
      <div style={{ fontSize: '10px', letterSpacing: '2px', color: '#8B8BA3', marginBottom: '6px', textTransform: 'uppercase' }}>
        {label}
      </div>
      {payload.map((p) => (
        <div key={p.name} style={{ fontSize: '13px', color: p.color, marginBottom: '2px', fontWeight: '600' }}>
          {p.name}: {(p.value * 100).toFixed(1)}%
        </div>
      ))}
    </div>
  )
}

export default function ComparisonChart({ before, after }) {
  const data = METRICS.map((m) => ({
    metric:    m.label,
    Baseline:  before[m.key],
    Optimized: after[m.key],
  }))

  const axisProps = {
    tick: { fill: '#8B8BA3', fontSize: 11, ...chartFont },
    axisLine: false,
    tickLine: false,
  }

  return (
    <div style={{
      background: '#1E1E2E',
      border: '1px solid #2A2A40',
      borderRadius: '4px',
      padding: '24px',
    }}>
      <div style={{
        fontSize: '11px', fontWeight: '600', letterSpacing: '2px',
        color: '#8B8BA3', textTransform: 'uppercase', marginBottom: '20px',
      }}>
        PERFORMANCE COMPARISON — BASELINE VS OPTIMIZED
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barCategoryGap="30%" barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A40" vertical={false} />
          <XAxis dataKey="metric" {...axisProps} />
          <YAxis
            domain={[0, 1]}
            tickFormatter={(v) => (v * 100).toFixed(0) + '%'}
            {...axisProps}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '14px', ...chartFont }}
          />
          <Bar
            dataKey="Baseline"
            fill="#8B8BA3"
            radius={[2, 2, 0, 0]}
            isAnimationActive
            animationDuration={800}
            animationEasing="ease-out"
          />
          <Bar
            dataKey="Optimized"
            fill="#E10600"
            radius={[2, 2, 0, 0]}
            isAnimationActive
            animationDuration={800}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
