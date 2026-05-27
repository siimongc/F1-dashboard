import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, Legend, Tooltip, ResponsiveContainer,
} from 'recharts'

const METRICS = [
  { key: 'accuracy',  label: 'Accuracy'  },
  { key: 'precision', label: 'Precision' },
  { key: 'recall',    label: 'Recall'    },
  { key: 'f1_score',  label: 'F1 Score'  },
  { key: 'auc_roc',   label: 'AUC-ROC'  },
  { key: 'r2',        label: 'R²'        },
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

export default function RadarPerformance({ before, after }) {
  const data = METRICS.map((m) => ({
    metric:    m.label,
    Baseline:  before[m.key] ?? 0,
    Optimized: after[m.key] ?? 0,
  }))

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
        PERFORMANCE RADAR — MULTI-METRIC
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data} outerRadius="68%">
          <PolarGrid stroke="#2A2A40" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: '#8B8BA3', fontSize: 11, ...chartFont }}
          />
          <PolarRadiusAxis
            domain={[0, 1]}
            tickCount={4}
            tick={{ fill: '#8B8BA3', fontSize: 9 }}
            tickFormatter={(v) => (v * 100).toFixed(0) + '%'}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '14px', ...chartFont }} />
          <Radar
            name="Baseline"
            dataKey="Baseline"
            stroke="#8B8BA3"
            fill="#8B8BA3"
            fillOpacity={0.18}
            isAnimationActive
            animationDuration={800}
            animationEasing="ease-out"
          />
          <Radar
            name="Optimized"
            dataKey="Optimized"
            stroke="#E10600"
            fill="#E10600"
            fillOpacity={0.28}
            isAnimationActive
            animationDuration={800}
            animationEasing="ease-out"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
