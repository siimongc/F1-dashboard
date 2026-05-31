import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, LabelList,
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

// Tasa media de degradación del MC de Bahrain: 11.3882s / 50 vueltas
const DEG_RATE = 11.3882 / 50


const axisStyle = {
  fill: C.gray,
  fontFamily: "'Titillium Web', sans-serif",
  fontSize: 10,
}

// ── Section header with narrative title ──────────────────────────────────────
function NarrativeHeader({ n, title, subtitle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
        <span style={{
          background: C.red, color: C.white, fontSize: 9, fontWeight: 900,
          padding: '3px 8px', borderRadius: 2, letterSpacing: '0.1em',
          flexShrink: 0, marginTop: 2,
        }}>{n}</span>
        <span style={{
          color: C.white, fontWeight: 700, fontSize: 14,
          letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.35,
        }}>
          {title}
        </span>
      </div>
      <div style={{ color: C.gray, fontSize: 11, marginLeft: 36, lineHeight: 1.6 }}>
        {subtitle}
      </div>
    </div>
  )
}

// ── Insight pill ─────────────────────────────────────────────────────────────
function InsightPill({ color, children }) {
  return (
    <div style={{
      marginTop: 12,
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: color + '14',
      border: `1px solid ${color}40`,
      borderRadius: 4, padding: '8px 14px',
      fontFamily: "'Titillium Web', sans-serif",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ color: C.lightGray, fontSize: 11, lineHeight: 1.4 }}>{children}</span>
    </div>
  )
}

// ── Custom tooltips ───────────────────────────────────────────────────────────
function R2Tooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: '#1A1A2A', border: `1px solid ${C.border}`, borderRadius: 4, padding: '8px 12px', fontFamily: "'Titillium Web', sans-serif", fontSize: 11 }}>
      <div style={{ color: C.white, fontWeight: 700, marginBottom: 4 }}>{d.label}</div>
      <div style={{ color: d.r2 >= 0.90 ? C.green : C.gray }}>R² GNN: <b>{d.r2.toFixed(4)}</b></div>
      <div style={{ color: C.gray, fontSize: 10, marginTop: 3 }}>
        {d.r2 >= 0.90 ? '✓ Por encima del umbral objetivo' : '⚠ Por debajo del umbral — circuito atípico'}
      </div>
    </div>
  )
}

function MaeTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const reduction = +((d.xgb - d.gnn) / d.xgb * 100).toFixed(1)
  return (
    <div style={{ background: '#1A1A2A', border: `1px solid ${C.border}`, borderRadius: 4, padding: '8px 12px', fontFamily: "'Titillium Web', sans-serif", fontSize: 11 }}>
      <div style={{ color: C.white, fontWeight: 700, marginBottom: 6 }}>{d.label}</div>
      <div style={{ color: C.gray,  marginBottom: 2 }}>XGBoost MAE: <b>{d.xgb.toFixed(3)}s</b></div>
      <div style={{ color: C.green, marginBottom: 4 }}>GNN MAE: <b>{d.gnn.toFixed(3)}s</b></div>
      <div style={{ color: C.green, fontWeight: 700, borderTop: `1px solid ${C.border}`, paddingTop: 4 }}>
        ▼ Error reducido un {reduction}%
      </div>
    </div>
  )
}

function PitTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: '#1A1A2A', border: `1px solid ${C.border}`, borderRadius: 4, padding: '8px 12px', fontFamily: "'Titillium Web', sans-serif", fontSize: 11 }}>
      <div style={{ color: C.white, fontWeight: 700, marginBottom: 6 }}>{d.label}</div>
      <div style={{ color: C.green,  marginBottom: 2 }}>GNN: <b>±{d.gnn} vueltas</b> de margen</div>
      <div style={{ color: C.gray,   marginBottom: 4 }}>
        XGBoost: <b>±{d.xgbReal} vueltas</b>{d.xgbIsOver ? ' (fuera de escala)' : ''}
      </div>
      <div style={{ color: C.gray, fontSize: 10, borderTop: `1px solid ${C.border}`, paddingTop: 4 }}>
        {d.gnn <= 3
          ? '✓ Precisión alta — accionable en carrera'
          : d.gnn <= 5
            ? '~ Precisión aceptable — útil con contexto'
            : '⚠ Circuito con alta variabilidad de desgaste'}
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function CircuitComparison({ circuits }) {

  // Chart 1 — R² por circuito (sorted best → worst, top to bottom)
  const r2Data = [...circuits]
    .sort((a, b) => a.gnn.r2 - b.gnn.r2)
    .map(c => ({ label: `${c.flag} ${c.code}`, r2: +c.gnn.r2.toFixed(4) }))

  // Chart 2 — MAE en segundos GNN vs XGB (sorted by XGB MAE desc)
  const maeData = [...circuits]
    .sort((a, b) => b.xgb.mae - a.xgb.mae)
    .map(c => ({
      label: `${c.flag} ${c.code}`,
      gnn:   +c.gnn.mae.toFixed(3),
      xgb:   +c.xgb.mae.toFixed(3),
    }))

  // Chart 3 — Ventana de pit en vueltas (sorted by GNN laps asc)
  const pitData = [...circuits]
    .sort((a, b) => (a.gnn.mae / DEG_RATE) - (b.gnn.mae / DEG_RATE))
    .map(c => {
      const gnn    = +(c.gnn.mae / DEG_RATE).toFixed(1)
      const xgbReal = +(c.xgb.mae / DEG_RATE).toFixed(1)
      return {
        label:    `${c.flag} ${c.code}`,
        gnn,
        xgb:      Math.min(xgbReal, 22),
        xgbReal,
        xgbIsOver: xgbReal > 22,
      }
    })

  // Summary stats
  const above90   = circuits.filter(c => c.gnn.r2 >= 0.90).length
  const avgGnnPit = +(circuits.reduce((s, c) => s + c.gnn.mae, 0) / circuits.length / DEG_RATE).toFixed(1)
  const bestReduction = circuits.reduce((best, c) => {
    const pct = (c.xgb.mae - c.gnn.mae) / c.xgb.mae * 100
    return pct > best.pct ? { pct: +pct.toFixed(1), name: c.code, flag: c.flag } : best
  }, { pct: 0, name: '', flag: '' })

  return (
    <div style={{ fontFamily: "'Titillium Web', sans-serif", display: 'flex', flexDirection: 'column', gap: 44 }}>

      {/* ── Summary stat cards ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          {
            n: `${above90} / ${circuits.length}`,
            label: 'circuitos con R² ≥ 0.90',
            sub:   'umbral de confianza para decisiones de pit',
            color: C.green,
          },
          {
            n: `±${avgGnnPit} vueltas`,
            label: 'margen de anticipación promedio',
            sub:   'con qué antelación puede predecirse el pit',
            color: C.orange,
          },
          {
            n: `${bestReduction.flag} ${bestReduction.name} −${bestReduction.pct}%`,
            label: 'mayor reducción de error',
            sub:   'circuito donde el GNN más supera al baseline',
            color: C.green,
          },
        ].map(s => (
          <div key={s.label} style={{
            flex: '1 1 180px', background: C.surfaceAlt,
            border: `1px solid ${C.border}`, borderRadius: 4, padding: '14px 18px',
          }}>
            <div style={{ color: s.color, fontSize: 22, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}>{s.n}</div>
            <div style={{ color: C.lightGray, fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: 6 }}>{s.label}</div>
            <div style={{ color: C.gray, fontSize: 9.5, marginTop: 3 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Chart 1 ── */}
      <div>
        <NarrativeHeader
          n="01"
          title="El modelo predice con precisión independientemente del circuito"
          subtitle={`R² mide qué tan bien el modelo explica la variación real en el desgaste de neumáticos. Por encima de 0.90 la predicción es suficientemente precisa para decidir cuándo entrar a los pits. ${above90} de ${circuits.length} circuitos superan ese umbral con el GNN GAT.`}
        />
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '16px 20px 8px 8px' }}>
          <ResponsiveContainer width="100%" height={420}>
            <BarChart data={r2Data} layout="vertical" margin={{ top: 4, right: 60, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
              <XAxis
                type="number" domain={[0, 1.05]} tick={axisStyle}
                axisLine={false} tickLine={false}
                tickFormatter={v => v.toFixed(1)}
                label={{ value: 'R² (coeficiente de determinación)', position: 'insideBottom', offset: -2, fill: C.gray, fontSize: 9, fontFamily: "'Titillium Web', sans-serif" }}
              />
              <YAxis
                type="category" dataKey="label" tick={{ ...axisStyle, fontSize: 11 }}
                axisLine={false} tickLine={false} width={68}
              />
              <Tooltip content={<R2Tooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <ReferenceLine x={0.90} stroke={C.green} strokeDasharray="6 3" strokeWidth={1.5}
                label={{ value: 'Umbral objetivo  0.90', position: 'insideTopRight', fill: C.green, fontSize: 8.5, fontFamily: "'Titillium Web', sans-serif", dy: -4 }} />
              <Bar dataKey="r2" name="R² GNN" radius={[0, 3, 3, 0]} barSize={22} isAnimationActive animationDuration={700}>
                <LabelList
                  dataKey="r2"
                  position="right"
                  style={{ fill: C.lightGray, fontSize: 10, fontFamily: "'Titillium Web', sans-serif", fontWeight: 700 }}
                  formatter={v => v.toFixed(3)}
                />
                {r2Data.map(d => <Cell key={d.label} fill={d.r2 >= 0.90 ? C.green : '#3A3A58'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <InsightPill color={C.green}>
          <b>{above90} circuitos</b> superan R² ≥ 0.90 — el modelo captura correctamente la dinámica de desgaste sin importar el trazado. Los 2 circuitos más bajos (Hungría y Monza) tienen patrones de desgaste atípicamente bajos que reducen la varianza explicable.
        </InsightPill>
      </div>

      {/* ── Chart 2 ── */}
      <div>
        <NarrativeHeader
          n="02"
          title="El error del modelo en segundos reales — cada segundo mal predicho cuesta posiciones"
          subtitle="MAE (Error Absoluto Medio) es el error promedio del modelo en segundos por vuelta. Un MAE alto en el baseline XGBoost significa que sus recomendaciones de pit serían incorrectas en varios segundos — suficiente para perder la ventana óptima de parada."
        />
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '16px 20px 8px 8px' }}>
          <ResponsiveContainer width="100%" height={460}>
            <BarChart data={maeData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
              <XAxis
                type="number" domain={[0, 8.5]} tick={axisStyle}
                axisLine={false} tickLine={false} tickFormatter={v => v + 's'}
                label={{ value: 'Error absoluto medio — MAE (segundos)', position: 'insideBottom', offset: -8, fill: C.gray, fontSize: 9, fontFamily: "'Titillium Web', sans-serif" }}
              />
              <YAxis
                type="category" dataKey="label" tick={{ ...axisStyle, fontSize: 11 }}
                axisLine={false} tickLine={false} width={68}
              />
              <Tooltip content={<MaeTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="xgb" name="XGBoost (baseline)" fill={'#3A3A58'} radius={[0, 3, 3, 0]} barSize={14} isAnimationActive animationDuration={700} opacity={0.85} />
              <Bar dataKey="gnn" name="GNN GAT v5.1"        fill={C.green}  radius={[0, 3, 3, 0]} barSize={14} isAnimationActive animationDuration={700} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <InsightPill color={C.red}>
          En <b>Singapore</b> el XGBoost acumulaba un error de <b>7.5s por vuelta</b>. Con ese margen de error, una recomendación de pit llegaría tarde o temprano por varios laps — sin valor estratégico real. El GNN lo reduce a <b>0.84s</b>.
        </InsightPill>
      </div>

      {/* ── Chart 3 ── */}
      <div>
        <NarrativeHeader
          n="03"
          title="¿Con cuántas vueltas de antelación puede anticiparse el pit? — de inútil a accionable"
          subtitle="Traducimos el MAE a vueltas de margen usando la tasa media de degradación del modelo (0.23 s/vuelta). Este número responde la pregunta clave del negocio: ¿cuántas vueltas antes puedo saber que el carro debe entrar? Con el GNN, la respuesta es 2–5 vueltas. Con el XGBoost, en la mayoría de circuitos la incertidumbre supera toda la carrera."
        />
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '16px 20px 8px 8px' }}>
          <ResponsiveContainer width="100%" height={460}>
            <BarChart data={pitData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
              <XAxis
                type="number" domain={[0, 24]} tick={axisStyle}
                axisLine={false} tickLine={false}
                label={{ value: 'Vueltas de incertidumbre en el pit (menos es mejor)', position: 'insideBottom', offset: -8, fill: C.gray, fontSize: 9, fontFamily: "'Titillium Web', sans-serif" }}
              />
              <YAxis
                type="category" dataKey="label" tick={{ ...axisStyle, fontSize: 11 }}
                axisLine={false} tickLine={false} width={68}
              />
              <Tooltip content={<PitTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <ReferenceLine x={5} stroke={C.yellow} strokeDasharray="5 3" strokeWidth={1}
                label={{ value: 'Límite accionable  5v', position: 'insideTopRight', fill: C.yellow, fontSize: 8.5, fontFamily: "'Titillium Web', sans-serif", dy: -4 }} />
              <Bar dataKey="xgb" name="XGBoost (baseline)" fill={'#3A3A58'} radius={[0, 3, 3, 0]} barSize={14} isAnimationActive animationDuration={700} opacity={0.75} />
              <Bar dataKey="gnn" name="GNN GAT v5.1"        fill={C.green}  radius={[0, 3, 3, 0]} barSize={14} isAnimationActive animationDuration={700}>
                <LabelList
                  dataKey="gnn"
                  position="right"
                  style={{ fill: C.lightGray, fontSize: 9.5, fontFamily: "'Titillium Web', sans-serif", fontWeight: 700 }}
                  formatter={v => `±${v}v`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <InsightPill color={C.green}>
          Con el GNN el equipo puede anticipar el pit con <b>±{avgGnnPit} vueltas de margen en promedio</b>. Eso equivale a tiempo suficiente para preparar el undercut, negociar con el piloto y coordinar el box — algo imposible con el baseline.
        </InsightPill>
      </div>

    </div>
  )
}
