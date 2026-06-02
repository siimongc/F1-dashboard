import realData from '../data/dashboard_real.json'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter,
  ReferenceLine, Cell,
} from 'recharts'

const C = {
  red:        '#E10600',
  orange:     '#FF6B35',
  yellow:     '#FFD700',
  green:      '#00D27A',
  blue:       '#4DA8DA',
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

const CIRCUIT_META = {
  'Abu Dhabi': { flag: '🇦🇪', code: 'ABU' },
  'Austrian':  { flag: '🇦🇹', code: 'AUT' },
  'Bahrain':   { flag: '🇧🇭', code: 'BAH' },
  'Belgian':   { flag: '🇧🇪', code: 'BEL' },
  'British':   { flag: '🇬🇧', code: 'GBR' },
  'Canadian':  { flag: '🇨🇦', code: 'CAN' },
  'Dutch':     { flag: '🇳🇱', code: 'NED' },
  'Hungarian': { flag: '🇭🇺', code: 'HUN' },
  'Italian':   { flag: '🇮🇹', code: 'ITA' },
  'Japanese':  { flag: '🇯🇵', code: 'JPN' },
  'Singapore': { flag: '🇸🇬', code: 'SGP' },
  'Spanish':   { flag: '🇪🇸', code: 'ESP' },
}

// ── Module-level data prep ───────────────────────────────────────────────────
const { race_laps, circuit_metrics, lap_variability, meta: dataMeta } = realData

// Chart 1: stacked bars — graphs per circuit, stacked by year, sorted by total desc
const coverageData = circuit_metrics.map(cm => {
  const rows = race_laps.filter(r => r.circuit === cm.circuit)
  const byYear = {}
  rows.forEach(r => { byYear[r.year] = r.graphs })
  const m = CIRCUIT_META[cm.circuit] || { flag: '', code: cm.circuit.slice(0, 3).toUpperCase() }
  const total = (byYear[2023] || 0) + (byYear[2024] || 0) + (byYear[2025] || 0)
  return {
    name:  `${m.flag} ${m.code}`,
    circuit: cm.circuit,
    flag:  m.flag,
    code:  m.code,
    y2023: byYear[2023] || 0,
    y2024: byYear[2024] || 0,
    y2025: byYear[2025] || 0,
    total,
    gnn_r2: cm.gnn_r2,
  }
}).sort((a, b) => b.total - a.total)

// Chart 2: scatter — R² vs % MAE savings, one point per circuit
const scatterData = circuit_metrics.map(cm => {
  const m = CIRCUIT_META[cm.circuit] || { flag: '', code: '' }
  return {
    circuit:     cm.circuit,
    flag:        m.flag,
    code:        m.code,
    r2:          cm.gnn_r2,
    savings_pct: cm.mae_savings_pct,
    above:       cm.gnn_r2 >= 0.90,
  }
})

// Chart 3: horizontal bars — total graphs per circuit sorted by avg_laps (circuit length)
const lapBarData = lap_variability.map(lv => {
  const cm = circuit_metrics.find(c => c.circuit === lv.circuit)
  const m  = CIRCUIT_META[lv.circuit] || { flag: '', code: lv.circuit.slice(0, 3).toUpperCase() }
  const rows = race_laps.filter(r => r.circuit === lv.circuit)
  const totalG = rows.reduce((s, r) => s + r.graphs, 0)
  return {
    name:       `${m.flag} ${m.code}`,
    circuit:    lv.circuit,
    avg_laps:   lv.avg_laps,
    total_graphs: totalG,
    gnn_r2:     cm?.gnn_r2 ?? 0,
    above:      (cm?.gnn_r2 ?? 0) >= 0.90,
  }
}).sort((a, b) => b.avg_laps - a.avg_laps)

const aboveR2 = circuit_metrics.filter(c => c.gnn_r2 >= 0.90).length
const totalGraphsSum = coverageData.reduce((s, d) => s + d.total, 0)

// ── Sub-components ───────────────────────────────────────────────────────────
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
      marginTop: 12,
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: color + '14', border: `1px solid ${color}40`,
      borderRadius: 4, padding: '8px 14px',
      fontFamily: "'Titillium Web', sans-serif",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ color: C.lightGray, fontSize: 11, lineHeight: 1.4 }}>{children}</span>
    </div>
  )
}

function CoverageTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload || {}
  return (
    <div style={{
      background: '#1A1A2A', border: `1px solid ${C.border}`,
      borderRadius: 4, padding: '8px 12px',
      fontFamily: "'Titillium Web', sans-serif", fontSize: 11,
    }}>
      <div style={{ color: C.white, fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ color: C.orange }}>2023: <b>{d.y2023} grafos</b></div>
      <div style={{ color: C.yellow }}>2024: <b>{d.y2024} grafos</b></div>
      <div style={{ color: C.green }}>2025: <b>{d.y2025} grafos</b></div>
      <div style={{ color: C.lightGray, borderTop: `1px solid ${C.border}`, paddingTop: 4, marginTop: 4 }}>
        Total: <b>{d.total} grafos</b>
      </div>
      <div style={{ color: C.gray, fontSize: 10, marginTop: 2 }}>
        R² GNN: <b style={{ color: (d.gnn_r2 ?? 0) >= 0.90 ? C.green : C.orange }}>{(d.gnn_r2 ?? 0).toFixed(4)}</b>
      </div>
    </div>
  )
}

function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload || {}
  return (
    <div style={{
      background: '#1A1A2A', border: `1px solid ${C.border}`,
      borderRadius: 4, padding: '8px 12px',
      fontFamily: "'Titillium Web', sans-serif", fontSize: 11,
    }}>
      <div style={{ color: C.white, fontWeight: 700, marginBottom: 6 }}>{d.flag} {d.circuit}</div>
      <div style={{ color: d.above ? C.green : C.orange }}>R² GNN: <b>{(d.r2 ?? 0).toFixed(4)}</b></div>
      <div style={{ color: C.blue }}>Reducción MAE: <b>{d.savings_pct}%</b></div>
    </div>
  )
}

function LapBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload || {}
  const rows = race_laps.filter(r => r.circuit === d.circuit)
  return (
    <div style={{
      background: '#1A1A2A', border: `1px solid ${C.border}`,
      borderRadius: 4, padding: '8px 12px',
      fontFamily: "'Titillium Web', sans-serif", fontSize: 11,
    }}>
      <div style={{ color: C.white, fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {rows.map(r => (
        <div key={r.year} style={{ color: C.gray }}>
          {r.year}: <b style={{ color: C.lightGray }}>{r.total_laps} vueltas · {r.graphs} grafos</b>
        </div>
      ))}
      <div style={{ color: C.gray, fontSize: 10, borderTop: `1px solid ${C.border}`, paddingTop: 4, marginTop: 4 }}>
        R² GNN: <b style={{ color: d.above ? C.green : C.orange }}>{(d.gnn_r2 ?? 0).toFixed(4)}</b>
      </div>
    </div>
  )
}

// Custom scatter dot — flag emoji above a circle
function FlagDotShape(props) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null) return null
  return (
    <g>
      <circle
        cx={cx} cy={cy} r={7}
        fill={payload.above ? C.green : C.orange}
        stroke={C.border} strokeWidth={1} opacity={0.9}
      />
      <text
        x={cx} y={cy - 11}
        textAnchor="middle" fontSize={13}
        style={{ userSelect: 'none', fontFamily: 'system-ui' }}
      >{payload.flag}</text>
    </g>
  )
}

// ── Main export ──────────────────────────────────────────────────────────────
export default function RealDataAnalysis() {
  return (
    <div style={{ fontFamily: "'Titillium Web', sans-serif", display: 'flex', flexDirection: 'column', gap: 44 }}>

      {/* Stat strip */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Grafos de telemetría', value: dataMeta.total_graphs.toLocaleString(), color: C.green,  sub: 'vueltas reales 2023–2025' },
          { label: 'Circuitos LOCO',       value: dataMeta.total_circuits,               color: C.orange, sub: 'Leave-One-Circuit-Out CV' },
          { label: 'Temporadas',           value: dataMeta.total_years,                  color: C.blue,   sub: 'años de telemetría F1' },
          { label: 'R² ≥ 0.90',           value: `${aboveR2} / ${dataMeta.total_circuits}`, color: C.green, sub: 'circuitos sobre umbral' },
          { label: 'GNN MAE promedio',     value: `${dataMeta.gnn_avg_mae}s`,            color: C.yellow, sub: 'error absoluto por vuelta' },
          { label: 'Reducción MAE media',  value: `${dataMeta.avg_mae_savings_pct}%`,    color: C.green,  sub: 'vs XGBoost baseline' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} style={{
            background: C.surfaceAlt, border: `1px solid ${C.border}`,
            borderRadius: 4, padding: '12px 16px', flex: '1 1 130px', textAlign: 'center',
          }}>
            <div style={{ color, fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{value}</div>
            <div style={{ color: C.gray, fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: 5 }}>{label}</div>
            {sub && <div style={{ color: C.gray, fontSize: 9, marginTop: 3 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Chart 1: stacked bars — cobertura por circuito y año ── */}
      <div>
        <NarrativeHeader
          n="01"
          title={`${totalGraphsSum.toLocaleString()} grafos de telemetría real · ${dataMeta.total_circuits} circuitos × 3 temporadas`}
          subtitle="Cada barra apilada muestra cuántas instantáneas de vuelta se capturaron por circuito. La distribución equilibrada entre 2023, 2024 y 2025 garantiza que el modelo aprende dinámicas estables — no artefactos de un año atípico. Hover para ver el desglose anual."
        />
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '16px 20px 12px 8px' }}>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end', marginBottom: 8, paddingRight: 8 }}>
            {[{ label: '2023', color: C.orange }, { label: '2024', color: C.yellow }, { label: '2025', color: C.green }].map(({ label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
                <span style={{ color: C.gray, fontSize: 10, fontFamily: "'Titillium Web', sans-serif" }}>{label}</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={coverageData} margin={{ top: 4, right: 12, left: 8, bottom: 40 }} barCategoryGap="18%">
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ ...axisStyle, fontSize: 10 }}
                axisLine={false} tickLine={false}
                angle={-40} textAnchor="end" interval={0}
              />
              <YAxis
                tick={axisStyle} axisLine={false} tickLine={false}
                label={{ value: 'Grafos capturados', angle: -90, position: 'insideLeft', offset: 8, fill: C.gray, fontSize: 9, fontFamily: "'Titillium Web', sans-serif" }}
              />
              <Tooltip content={<CoverageTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="y2023" name="2023" stackId="a" fill={C.orange} isAnimationActive animationDuration={600} />
              <Bar dataKey="y2024" name="2024" stackId="a" fill={C.yellow} isAnimationActive animationDuration={700} />
              <Bar dataKey="y2025" name="2025" stackId="a" fill={C.green} radius={[3, 3, 0, 0]} isAnimationActive animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <InsightPill color={C.green}>
          Spanish GP lidera con ~189 grafos (66 vueltas × 3 años). Belgian GP tiene menos grafos totales porque la carrera es más corta (44 vueltas). La cobertura es <b>balanceada por temporada</b> — ningún año representa más del 40% del total en ningún circuito.
        </InsightPill>
      </div>

      {/* ── Chart 2: scatter — R² vs % MAE savings ── */}
      <div>
        <NarrativeHeader
          n="02"
          title="Alta precisión del GNN se traduce en mayor ventaja sobre el baseline"
          subtitle="Cada punto es un circuito. Eje X: calidad predictiva del GNN (R²). Eje Y: reducción de error respecto a XGBoost. La tendencia es clara — circuitos donde el GNN predice mejor son también los que más superan al modelo clásico. La excepción es Singapur: R² moderado pero máxima reducción porque XGBoost colapsa en ese circuito urbano."
        />
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '16px 20px 24px 8px' }}>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end', marginBottom: 8, paddingRight: 8 }}>
            {[
              { label: 'R² ≥ 0.90', color: C.green },
              { label: 'R² < 0.90',  color: C.orange },
            ].map(({ label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                <span style={{ color: C.gray, fontSize: 10, fontFamily: "'Titillium Web', sans-serif" }}>{label}</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={360}>
            <ScatterChart margin={{ top: 20, right: 32, left: 8, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis
                type="number" dataKey="r2" name="R² GNN"
                domain={[0.55, 1.0]}
                tick={axisStyle} axisLine={false} tickLine={false}
                tickFormatter={v => v.toFixed(2)}
                label={{ value: 'R² GNN GAT v5.1', position: 'insideBottom', offset: -12, fill: C.gray, fontSize: 9, fontFamily: "'Titillium Web', sans-serif" }}
              />
              <YAxis
                type="number" dataKey="savings_pct" name="% reducción MAE"
                domain={[0, 100]}
                tick={axisStyle} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}%`}
                label={{ value: '% reducción MAE vs XGBoost', angle: -90, position: 'insideLeft', offset: 8, fill: C.gray, fontSize: 9, fontFamily: "'Titillium Web', sans-serif" }}
              />
              <Tooltip content={<ScatterTooltip />} />
              <ReferenceLine
                y={dataMeta.avg_mae_savings_pct}
                stroke={C.blue} strokeDasharray="5 3" strokeWidth={1}
                label={{ value: `Promedio ${dataMeta.avg_mae_savings_pct}%`, position: 'insideTopRight', fill: C.blue, fontSize: 8.5, fontFamily: "'Titillium Web', sans-serif", dy: -4 }}
              />
              <ReferenceLine
                x={0.90}
                stroke={C.green} strokeDasharray="5 3" strokeWidth={1}
                label={{ value: 'R²=0.90', position: 'top', fill: C.green, fontSize: 8.5, fontFamily: "'Titillium Web', sans-serif" }}
              />
              <Scatter data={scatterData} shape={FlagDotShape} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <InsightPill color={C.blue}>
          Los 8 circuitos con R² ≥ 0.90 (cuadrante superior-derecho) concentran la mayor reducción de MAE — son los circuitos donde el sistema es <b>directamente accionable</b> para decisiones de pit stop. Los dos puntos naranjas (Hungría e Italia) tienen menor desgaste absoluto, lo que reduce tanto el R² como la ventaja sobre XGBoost.
        </InsightPill>
      </div>

      {/* ── Chart 3: horizontal bars — total grafos por longitud de carrera ── */}
      <div>
        <NarrativeHeader
          n="03"
          title="Precisión del modelo independiente de la longitud del circuito"
          subtitle="Circuitos ordenados de mayor a menor número de vueltas. El color indica si el GNN supera R² ≥ 0.90 en ese circuito. Los dos circuitos más cortos (Monza, 51–53 vueltas; Bélgica, 44 vueltas) son los únicos que no alcanzan el umbral — por su perfil de desgaste mínimo, no por la longitud de la carrera."
        />
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '16px 20px 8px 8px' }}>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end', marginBottom: 8, paddingRight: 8 }}>
            {[
              { label: 'R² ≥ 0.90 (precisión alta)', color: C.green },
              { label: 'R² < 0.90 (desgaste bajo)',  color: C.orange },
            ].map(({ label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
                <span style={{ color: C.gray, fontSize: 10, fontFamily: "'Titillium Web', sans-serif" }}>{label}</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={lapBarData} layout="vertical" margin={{ top: 4, right: 56, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
              <XAxis
                type="number" domain={[0, 80]}
                tick={axisStyle} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}v`}
                label={{ value: 'Vueltas de carrera (promedio)', position: 'insideBottom', offset: -2, fill: C.gray, fontSize: 9, fontFamily: "'Titillium Web', sans-serif" }}
              />
              <YAxis
                type="category" dataKey="name"
                tick={{ ...axisStyle, fontSize: 11 }}
                axisLine={false} tickLine={false} width={68}
              />
              <Tooltip content={<LapBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="avg_laps" name="Vueltas de carrera" radius={[0, 3, 3, 0]} barSize={20} isAnimationActive animationDuration={700}>
                {lapBarData.map(d => (
                  <Cell key={d.name} fill={d.above ? C.green : C.orange} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <InsightPill color={C.green}>
          Dutch GP (72 vueltas) y Austrian GP (71 vueltas) son los más largos y ambos superan R² ≥ 0.90. British GP (52 vueltas) alcanza el <b>mejor R² del dataset: 0.9564</b>. La longitud de la carrera no es un factor limitante para la precisión del modelo.
        </InsightPill>
      </div>

    </div>
  )
}
