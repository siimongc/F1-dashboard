import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'

const C = {
  red:       '#E10600',
  orange:    '#FF6B35',
  yellow:    '#FFD700',
  green:     '#00D27A',
  gray:      '#8B8BA3',
  grayPurple:'#4A4A65',
  surface:   '#1E1E2E',
  surfaceAlt:'#252538',
  border:    '#2A2A40',
  white:     '#FFFFFF',
  lightGray: '#C4C4D4',
}

function r2Color(r2) {
  if (r2 > 0.90) return C.green
  if (r2 > 0.80) return C.yellow
  return C.orange
}

const CustomTooltipR2 = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null
  const xgb = payload.find(p => p.dataKey === 'xgb_r2')
  const gnn = payload.find(p => p.dataKey === 'gnn_r2')
  const delta = gnn && xgb ? (gnn.value - xgb.value) : null
  return (
    <div style={{
      background: '#1A1A2A', border: `1px solid ${C.border}`, borderRadius: 4,
      padding: '10px 14px', fontFamily: "'Titillium Web', sans-serif", fontSize: 12,
    }}>
      <div style={{ color: C.white, fontWeight: 700, marginBottom: 6, letterSpacing: '0.06em' }}>{label}</div>
      {xgb && <div style={{ color: C.grayPurple, marginBottom: 2 }}>XGBoost: <b style={{ color: xgb.value < 0 ? C.red : C.lightGray }}>{xgb.value.toFixed(4)}</b></div>}
      {gnn  && <div style={{ color: C.red,       marginBottom: 2 }}>GNN GAT: <b style={{ color: r2Color(gnn.value) }}>{gnn.value.toFixed(4)}</b></div>}
      {delta != null && <div style={{ color: C.green, fontWeight: 700, marginTop: 4 }}>Δ +{delta.toFixed(4)}</div>}
    </div>
  )
}

const CustomTooltipMAE = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null
  const xgb = payload.find(p => p.dataKey === 'xgb_mae')
  const gnn = payload.find(p => p.dataKey === 'gnn_mae')
  const pct = gnn && xgb ? ((xgb.value - gnn.value) / xgb.value * 100) : null
  return (
    <div style={{
      background: '#1A1A2A', border: `1px solid ${C.border}`, borderRadius: 4,
      padding: '10px 14px', fontFamily: "'Titillium Web', sans-serif", fontSize: 12,
    }}>
      <div style={{ color: C.white, fontWeight: 700, marginBottom: 6, letterSpacing: '0.06em' }}>{label}</div>
      {xgb && <div style={{ color: C.grayPurple, marginBottom: 2 }}>XGBoost MAE: <b style={{ color: C.lightGray }}>{xgb.value.toFixed(4)}s</b></div>}
      {gnn  && <div style={{ color: C.red,       marginBottom: 2 }}>GNN MAE: <b style={{ color: C.green }}>{gnn.value.toFixed(4)}s</b></div>}
      {pct != null && <div style={{ color: C.green, fontWeight: 700, marginTop: 4 }}>▲ −{pct.toFixed(1)}% mejora</div>}
    </div>
  )
}

const axisStyle = { fill: C.gray, fontFamily: "'Titillium Web', sans-serif", fontSize: 11 }

export default function CircuitComparison({ circuits }) {
  const data = circuits.map(c => ({
    code:    c.code,
    name:    c.name,
    xgb_r2:  c.xgb.r2,
    gnn_r2:  c.gnn.r2,
    xgb_mae: c.xgb.mae,
    gnn_mae: c.gnn.mae,
    n_graphs: c.gnn.n_graphs,
  }))

  const sorted = [...circuits].sort((a, b) => b.gnn.r2 - a.gnn.r2)

  return (
    <div style={{ fontFamily: "'Titillium Web', sans-serif" }}>

      {/* ─── R² Chart ─── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ marginBottom: 4 }}>
          <div style={{ color: C.white, fontWeight: 700, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            R² POR CIRCUITO — XGBOOST vs GNN
          </div>
          <div style={{ color: C.gray, fontSize: 11, marginTop: 2 }}>
            Valores negativos = peor que predecir la media
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 12, right: 24, left: 0, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
            <XAxis dataKey="code" tick={axisStyle} axisLine={{ stroke: C.border }} tickLine={false} />
            <YAxis domain={[-4, 1.2]} tick={axisStyle} axisLine={false} tickLine={false}
              tickFormatter={v => v.toFixed(1)} width={38} />
            <Tooltip content={<CustomTooltipR2 />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Legend
              wrapperStyle={{ fontFamily: "'Titillium Web', sans-serif", fontSize: 11, color: C.lightGray, paddingTop: 8 }}
              iconType="square" iconSize={10}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.28)" strokeWidth={1} />
            <ReferenceLine y={0.8} stroke={C.yellow} strokeDasharray="5 3" strokeWidth={1}
              label={{ value: 'R² = 0.80', position: 'insideTopRight', fill: C.yellow, fontSize: 10, fontFamily: "'Titillium Web', sans-serif" }} />
            <Bar dataKey="xgb_r2" name="XGBoost" fill={C.grayPurple}
              radius={[2,2,0,0]} isAnimationActive animationDuration={800} animationEasing="ease-out">
              {data.map((entry) => (
                <Cell key={entry.code} fill={entry.code === 'SGP' ? '#6A4A6A' : C.grayPurple} />
              ))}
            </Bar>
            <Bar dataKey="gnn_r2" name="GNN GAT v5.1" fill={C.red}
              radius={[2,2,0,0]} isAnimationActive animationDuration={800} animationEasing="ease-out">
              {data.map((entry) => (
                <Cell key={entry.code} fill={entry.code === 'SGP' ? '#FF3020' : C.red} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ marginTop: 6, fontSize: 10, color: C.gray, textAlign: 'right' }}>
          * SGP (Singapore) resaltado: XGBoost R² = −3.36 → GNN R² = +0.91
        </div>
      </div>

      {/* ─── MAE Chart ─── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ marginBottom: 4 }}>
          <div style={{ color: C.white, fontWeight: 700, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            MAE POR CIRCUITO (segundos) — menor es mejor
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 12, right: 24, left: 0, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
            <XAxis dataKey="code" tick={axisStyle} axisLine={{ stroke: C.border }} tickLine={false} />
            <YAxis domain={[0, 8]} tick={axisStyle} axisLine={false} tickLine={false}
              tickFormatter={v => v.toFixed(0) + 's'} width={38} />
            <Tooltip content={<CustomTooltipMAE />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Legend
              wrapperStyle={{ fontFamily: "'Titillium Web', sans-serif", fontSize: 11, color: C.lightGray, paddingTop: 8 }}
              iconType="square" iconSize={10}
            />
            <ReferenceLine y={1} stroke={C.yellow} strokeDasharray="5 3" strokeWidth={1}
              label={{ value: 'MAE = 1.0s', position: 'insideTopRight', fill: C.yellow, fontSize: 10, fontFamily: "'Titillium Web', sans-serif" }} />
            <Bar dataKey="xgb_mae" name="XGBoost MAE" fill={C.grayPurple}
              radius={[2,2,0,0]} isAnimationActive animationDuration={800} animationEasing="ease-out">
              {data.map((entry) => (
                <Cell key={entry.code} fill={entry.code === 'SGP' ? '#6A4A6A' : C.grayPurple} />
              ))}
            </Bar>
            <Bar dataKey="gnn_mae" name="GNN GAT v5.1 MAE" fill={C.red}
              radius={[2,2,0,0]} isAnimationActive animationDuration={800} animationEasing="ease-out">
              {data.map((entry) => (
                <Cell key={entry.code} fill={entry.code === 'SGP' ? '#FF3020' : C.red} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ─── Data Table ─── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%', borderCollapse: 'collapse',
          fontFamily: "'Titillium Web', sans-serif", fontSize: 12,
        }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border}` }}>
              {['Circuito','XGB R²','GNN R²','ΔR²','XGB MAE','GNN MAE','ΔMAE%','Grafos'].map(h => (
                <th key={h} style={{
                  padding: '8px 12px', textAlign: h === 'Circuito' ? 'left' : 'right',
                  color: C.gray, fontWeight: 700, letterSpacing: '0.06em', fontSize: 10,
                  textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => {
              const deltaR2  = c.gnn.r2 - c.xgb.r2
              const deltaMae = ((c.xgb.mae - c.gnn.mae) / c.xgb.mae * 100)
              const isAlt    = i % 2 === 1
              return (
                <tr key={c.id} style={{
                  background: isAlt ? C.surfaceAlt : 'transparent',
                  borderBottom: `1px solid ${C.border}`,
                }}>
                  <td style={{ padding: '8px 12px', color: C.white, fontWeight: 600 }}>
                    <span style={{ marginRight: 6 }}>{c.flag}</span>{c.name}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right',
                    color: c.xgb.r2 < 0 ? C.red : c.xgb.r2 > 0.8 ? C.green : C.yellow, fontWeight: 700 }}>
                    {c.xgb.r2.toFixed(4)}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right',
                    color: r2Color(c.gnn.r2), fontWeight: 700 }}>
                    {c.gnn.r2.toFixed(4)}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right',
                    color: deltaR2 > 0 ? C.green : C.red, fontWeight: 700 }}>
                    {deltaR2 > 0 ? '+' : ''}{deltaR2.toFixed(4)}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: C.lightGray }}>
                    {c.xgb.mae.toFixed(4)}s
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: C.green, fontWeight: 700 }}>
                    {c.gnn.mae.toFixed(4)}s
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right',
                    color: deltaMae > 0 ? C.green : C.red, fontWeight: 700 }}>
                    −{deltaMae.toFixed(1)}%
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: C.gray }}>
                    {c.gnn.n_graphs}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
