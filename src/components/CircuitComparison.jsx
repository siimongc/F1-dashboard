import { useState } from 'react'
import DegradationCharts from './DegradationCharts'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea, Cell, LabelList,
} from 'recharts'


const C = {
  red:       '#E10600',
  orange:    '#FF6B35',
  yellow:    '#FFD700',
  green:     '#00D27A',
  gray:      '#8B8BA3',
  surface:   '#1E1E2E',
  surfaceAlt:'#252538',
  border:    '#2A2A40',
  white:     '#FFFFFF',
  lightGray: '#C4C4D4',
}

const axisStyle = {
  fill: C.gray,
  fontFamily: "'Titillium Web', sans-serif",
  fontSize: 10,
}

function NarrativeHeader({ n, title, subtitle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
        <span style={{
          background: C.red, color: C.white, fontSize: 9, fontWeight: 900,
          padding: '3px 8px', borderRadius: 2, letterSpacing: '0.1em', flexShrink: 0, marginTop: 2,
        }}>{n}</span>
        <span style={{
          color: C.white, fontWeight: 700, fontSize: 14,
          letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.35,
        }}>{title}</span>
      </div>
      <div style={{ color: C.gray, fontSize: 11, marginLeft: 36, lineHeight: 1.6 }}>{subtitle}</div>
    </div>
  )
}

function InsightPill({ color, children }) {
  return (
    <div style={{
      marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8,
      background: color + '14', border: `1px solid ${color}40`,
      borderRadius: 4, padding: '8px 14px', fontFamily: "'Titillium Web', sans-serif",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ color: C.lightGray, fontSize: 11, lineHeight: 1.4 }}>{children}</span>
    </div>
  )
}

export default function CircuitComparison({ circuits }) {
  const [selectedId, setSelectedId] = useState('bahrain')

  const selected  = circuits.find(c => c.id === selectedId) || circuits[0]
  const above90   = circuits.filter(c => c.gnn.r2 >= 0.90).length
  const accentCol = selected.gnn.r2 >= 0.90 ? C.green : C.orange

  const r2Data = [...circuits]
    .sort((a, b) => a.gnn.r2 - b.gnn.r2)
    .map(c => ({ id: c.id, label: c.name.replace(' GP', ''), r2: +c.gnn.r2.toFixed(4) }))

  return (
    <div style={{ fontFamily: "'Titillium Web', sans-serif", display: 'flex', flexDirection: 'column', gap: 44 }}>

      {/* ── Chart 1 ── */}
      <div>
        <NarrativeHeader
          n="01"
          title="Precisión del modelo en cada circuito — validación en datos nunca vistos"
          subtitle={`R² mide qué porcentaje de la variación real en el desgaste explica el modelo. El modelo se prueba en cada circuito sin haberlo visto en entrenamiento (validación LOCO). ${above90} de ${circuits.length} circuitos superan el 90%.`}
        />

        <div style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>

          {/* Barras */}
          <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '16px 16px 8px 8px' }}>
            <ResponsiveContainer width="100%" height={420}>
              <BarChart
                data={r2Data}
                layout="vertical"
                margin={{ top: 4, right: 56, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                <XAxis
                  type="number" domain={[0, 1.05]} tick={axisStyle}
                  axisLine={false} tickLine={false} tickFormatter={v => v.toFixed(1)}
                />
                <YAxis
                  type="category" dataKey="label" tick={{ ...axisStyle, fontSize: 10 }}
                  axisLine={false} tickLine={false} width={90}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div style={{ background: '#1A1A2A', border: `1px solid ${C.border}`, borderRadius: 4, padding: '8px 12px', fontFamily: "'Titillium Web', sans-serif", fontSize: 11 }}>
                        <div style={{ color: C.white, fontWeight: 700, marginBottom: 4 }}>{d.label}</div>
                        <div style={{ color: d.r2 >= 0.90 ? C.green : C.orange }}>R²: <b>{d.r2.toFixed(4)}</b></div>
                        <div style={{ color: C.gray, fontSize: 9.5, marginTop: 2 }}>Click para ver detalle</div>
                      </div>
                    )
                  }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <ReferenceLine x={0.90} stroke={C.green} strokeDasharray="6 3" strokeWidth={1.5}
                  label={{ value: '0.90', position: 'insideTopRight', fill: C.green, fontSize: 8.5, fontFamily: "'Titillium Web', sans-serif", dy: -4 }} />
                <Bar
                  dataKey="r2"
                  radius={[0, 3, 3, 0]}
                  barSize={22}
                  isAnimationActive
                  animationDuration={600}
                  onClick={d => setSelectedId(d.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <LabelList
                    dataKey="r2" position="right"
                    style={{ fill: C.lightGray, fontSize: 10, fontFamily: "'Titillium Web', sans-serif", fontWeight: 700 }}
                    formatter={v => v.toFixed(3)}
                  />
                  {r2Data.map(d => (
                    <Cell
                      key={d.id}
                      fill={d.id === selectedId ? C.white : d.r2 >= 0.90 ? C.green : '#3A3A58'}
                      opacity={d.id === selectedId ? 1 : 0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Panel derecho — número grande */}
          <div style={{
            width: 240,
            flexShrink: 0,
            background: C.surfaceAlt,
            border: `1px solid ${accentCol}`,
            borderRadius: 4,
            padding: '28px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 16,
            transition: 'border-color 0.3s',
          }}>
            {/* Circuito */}
            <div>
              <div style={{ fontSize: 36, lineHeight: 1 }}>{selected.flag}</div>
              <div style={{ color: C.lightGray, fontSize: 13, fontWeight: 700, marginTop: 6 }}>
                {selected.name}
              </div>
              <div style={{ color: C.gray, fontSize: 9.5, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Circuito de prueba
              </div>
            </div>

            {/* R² grande */}
            <div>
              <div style={{ color: accentCol, fontSize: 60, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', transition: 'color 0.3s' }}>
                {selected.gnn.r2.toFixed(4)}
              </div>
            </div>

            {/* Frase */}
            <div style={{
              color: C.lightGray,
              fontSize: 12,
              lineHeight: 1.6,
              borderTop: `1px solid ${C.border}`,
              paddingTop: 14,
            }}>
              El modelo explica el{' '}
              <span style={{ color: accentCol, fontWeight: 700 }}>
                {(selected.gnn.r2 * 100).toFixed(1)}%
              </span>{' '}
              de la variación real en el desgaste
            </div>
          </div>
        </div>

        <InsightPill color={C.green}>
          <b>{above90} de {circuits.length} circuitos</b> superan el 90% — sin haber visto esos circuitos durante el entrenamiento.
        </InsightPill>
      </div>

      {/* ── Chart 2: GNN vs XGBoost ── */}
      <div>
        <NarrativeHeader
          n="02"
          title="GNN vs XGBoost — comparación de R² en validación LOCO"
          subtitle="Métrica comparada: R² (coeficiente de determinación) — qué tan bien predice cada modelo el desgaste en circuitos nunca vistos. R² = 1 es predicción perfecta; R² < 0 significa que el modelo es peor que predecir el promedio."
        />

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '16px 16px 8px 4px' }}>

          {/* Leyenda */}
          <div style={{ display: 'flex', gap: 20, paddingLeft: 16, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: C.green, display: 'inline-block' }} />
              <span style={{ color: C.gray, fontSize: 14 }}>GNN GAT v5.1 <span style={{ color: C.white, fontWeight: 700 }}>· R²</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: '#4A4A68', display: 'inline-block' }} />
              <span style={{ color: C.gray, fontSize: 14 }}>XGBoost <span style={{ color: C.white, fontWeight: 700 }}>· R²</span></span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.red, opacity: 0.5, display: 'inline-block' }} />
                <span style={{ color: C.gray, fontSize: 9 }}>Peor que predecir el promedio (R² &lt; 0)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.green, opacity: 0.3, display: 'inline-block' }} />
                <span style={{ color: C.gray, fontSize: 9 }}>Alta precisión (R² ≥ 0.90)</span>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={340}>
            <BarChart
              data={[...circuits]
                .sort((a, b) => b.gnn.r2 - a.gnn.r2)
                .map(c => ({
                  id:    c.id,
                  label: c.name.replace(' GP', ''),
                  name:  c.name,
                  gnn:   +c.gnn.r2.toFixed(4),
                  xgb:   +c.xgb.r2.toFixed(4),
                }))}
              margin={{ top: 8, right: 16, left: 8, bottom: 20 }}
              barCategoryGap="8%"
              barGap={2}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />

              {/* Zona roja: R² negativo */}
              <ReferenceArea y1={-4.5} y2={0} fill={C.red} fillOpacity={0.06} />
              {/* Zona verde: R² alto */}
              <ReferenceArea y1={0.90} y2={1.05} fill={C.green} fillOpacity={0.06} />

              <XAxis
                dataKey="label"
                tick={{ ...axisStyle, fontSize: 9 }}
                axisLine={false} tickLine={false}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={60}
              />
              <YAxis
                domain={[-4.5, 1.05]}
                tick={axisStyle} axisLine={false} tickLine={false}
                tickFormatter={v => v.toFixed(1)} width={36}
                label={{ value: 'R²', angle: -90, position: 'insideLeft', offset: 12, fill: C.gray, fontSize: 9, fontFamily: "'Titillium Web', sans-serif" }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  return (
                    <div style={{ background: '#1A1A2A', border: `1px solid ${C.border}`, borderRadius: 4, padding: '10px 14px', fontFamily: "'Titillium Web', sans-serif", fontSize: 11 }}>
                      <div style={{ color: C.white, fontWeight: 700, marginBottom: 8 }}>{d?.name}</div>
                      <div style={{ color: C.green, marginBottom: 3 }}>
                        GNN: <b>{d?.gnn?.toFixed(4)}</b>
                        <span style={{ color: C.gray, fontSize: 9, marginLeft: 6 }}>
                          {d?.gnn >= 0.90 ? '✓ Alta precisión' : ''}
                        </span>
                      </div>
                      <div style={{ color: d?.xgb < 0 ? C.red : C.lightGray }}>
                        XGBoost: <b>{d?.xgb?.toFixed(4)}</b>
                        <span style={{ fontSize: 9, marginLeft: 6 }}>
                          {d?.xgb < 0 ? '✗ Peor que el promedio' : ''}
                        </span>
                      </div>
                      {d?.xgb < 0 && d?.gnn >= 0.90 && (
                        <div style={{ color: C.orange, fontSize: 10, marginTop: 6, borderTop: `1px solid ${C.border}`, paddingTop: 6 }}>
                          Diferencia: +{(d.gnn - d.xgb).toFixed(3)} puntos de R²
                        </div>
                      )}
                    </div>
                  )
                }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />

              {/* Línea de 0 */}
              <ReferenceLine y={0} stroke={C.lightGray} strokeWidth={1.5}
                label={{ value: 'R² = 0', position: 'insideTopRight', fill: C.lightGray, fontSize: 8, fontFamily: "'Titillium Web', sans-serif", dy: 4, dx: -4 }}
              />
              {/* Línea de 0.90 */}
              <ReferenceLine y={0.90} stroke={C.green} strokeDasharray="6 3" strokeWidth={1}
                label={{ value: '0.90', position: 'insideTopRight', fill: C.green, fontSize: 8, fontFamily: "'Titillium Web', sans-serif", dy: 4, dx: -4 }}
              />

              <Bar dataKey="gnn" fill={C.green}  radius={[3, 3, 0, 0]} barSize={16} isAnimationActive animationDuration={700} />
              <Bar dataKey="xgb" fill="#4A4A68" radius={[3, 3, 0, 0]} barSize={16} isAnimationActive animationDuration={700}>
                {[...circuits]
                  .sort((a, b) => b.gnn.r2 - a.gnn.r2)
                  .map(c => (
                    <Cell key={c.id} fill={c.xgb.r2 < 0 ? C.red : '#4A4A68'} opacity={c.xgb.r2 < 0 ? 0.7 : 0.8} />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <InsightPill color={C.red}>
          XGBoost obtiene <b>R² negativo en {circuits.filter(c => c.xgb.r2 < 0).length} circuitos</b> — el modelo no generaliza a pistas desconocidas.
          El GNN supera 0.90 en <b>{circuits.filter(c => c.gnn.r2 >= 0.90).length} de {circuits.length}</b>.
        </InsightPill>
      </div>

      <DegradationCharts />

    </div>
  )
}
