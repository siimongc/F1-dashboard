import { useEffect, useRef, useState } from 'react'
import tracksData from '../data/tracks.json'

const C = {
  red:       '#E10600',
  orange:    '#FF6B35',
  yellow:    '#FFD700',
  green:     '#00D27A',
  cyan:      '#00E5FF',
  gray:      '#8B8BA3',
  border:    '#2A2A40',
  surface:   '#1E1E2E',
  surfaceAlt:'#252538',
  white:     '#FFFFFF',
  lightGray: '#C4C4D4',
}

// Monte Carlo P50 data from GNN model output
const MC = tracksData.monte_carlo  // [{vuelta, p10, p50, p90}, ...]

// Pit stop laps derived from MC P50 — 1/3 and 2/3 of total cumulative degradation
// lap 21 → P50=4.12s, lap 37 → P50=7.67s
const PIT_LAPS           = [21, 37]
const PIT_STOP_DURATION  = 2.4  // animation seconds at pit box
const POST_PIT_PROGRESS  = 0.03 // circuit progress after pit exit (just past S/F)

const COMPOUNDS      = ['MEDIUM', 'HARD', 'SOFT']
const COMPOUND_COLORS = { MEDIUM: '#FFD700', HARD: '#CCCCCC', SOFT: '#E10600' }

// Main circuit path — Bahrain (viewBox 0 0 560 315)
const PATH_D = `
  M 392,272
  C 315,280 222,280 155,271
  C 98,263 54,238 44,202
  C 34,166 48,124 74,98
  C 100,72 138,57 176,50
  C 214,43 256,44 290,50
  C 324,56 348,44 374,32
  C 412,16 458,52 474,98
  C 492,148 476,198 450,230
  C 432,254 414,267 398,272
  Z
`

// Pit lane paths — run below the main straight at y≈298
// Entry: S/F point (392,272) → curves right-down → across to pit box (280,298)
// Exit:  pit box (280,298) → across left → curves up → circuit rejoin (148,271)
const PIT_ENTRY_D = `M 392,272 C 415,272 428,278 429,290 C 430,300 405,300 280,300`
const PIT_EXIT_D  = `M 280,300 C 205,300 155,300 148,291 C 141,282 143,272 148,271`

// Telemetry zones [progress, speed_kmh, gear, drs, sector, corner_name]
const ZONES = [
  [0.00, 318, 8, true,  'S1', 'S/F Straight'],
  [0.09, 92,  2, false, 'S1', 'Turn 1'],
  [0.17, 170, 5, false, 'S1', 'Turn 2–3'],
  [0.28, 290, 8, false, 'S2', 'Back Straight'],
  [0.40, 240, 7, false, 'S2', 'Outer Loop T4'],
  [0.52, 205, 6, false, 'S2', 'Outer Loop T7'],
  [0.62, 88,  2, false, 'S3', 'Turn 10'],
  [0.71, 150, 4, false, 'S3', 'Chicane T11–13'],
  [0.82, 258, 7, true,  'S3', 'Turn 14–15'],
  [0.95, 318, 8, true,  'S1', 'S/F Straight'],
]

function getTelemetry(p) {
  for (let i = 0; i < ZONES.length - 1; i++) {
    const [t0, s0, g0, d0, sec0, c0] = ZONES[i]
    const [t1, s1] = ZONES[i + 1]
    if (p >= t0 && p < t1) {
      const f = (p - t0) / (t1 - t0)
      return { speed: Math.round(s0 + (s1 - s0) * f), gear: g0, drs: d0, sector: sec0, corner: c0 }
    }
  }
  const z = ZONES[ZONES.length - 1]
  return { speed: z[1], gear: z[2], drs: z[3], sector: z[4], corner: z[5] }
}

function getP50(lap) {
  if (lap < 1) return 0
  return MC[Math.min(lap - 1, 49)].p50
}

// Tire wear 0-100% based on MC P50 degradation within the current stint
function getTireWear(lap, stint) {
  const p_start = stint === 0 ? 0 : getP50(PIT_LAPS[stint - 1])
  const p_end   = getP50(stint < 2 ? PIT_LAPS[stint] : 50)
  const p_now   = getP50(Math.min(lap, stint < 2 ? PIT_LAPS[stint] : 50))
  if (p_end <= p_start) return 0
  return Math.min(((p_now - p_start) / (p_end - p_start)) * 100, 100)
}

// ─── Feature simulation ─────────────────────────────────────────────────────
// Realistic Bahrain GP ambient values; each changes gently per lap/progress
// SHAP values from XGBoost analysis (app.py)
const SHAP_MAX = 0.1193  // TyreLife is the top feature

const SHAP = {
  tyreLife:        0.1193,
  tyrelifeSquared: 0.0626,
  humidity:        0.0893,
  fuelLoad:        0.0746,
  pressure:        0.0744,
  airTemp:         0.0552,
  trackTemp:       0.0509,
  windDir:         0.0459,
  windSpeed:       0.0324,
  rainfall:        0.0089,
  compound:        0.0069,
}

function getFeatureValues(lap, progress, stint) {
  const stintStart  = stint === 0 ? 1 : PIT_LAPS[stint - 1] + 1
  const tyreLife    = Math.max(1, lap - stintStart + 1)
  const s           = Math.sin
  const c           = Math.cos
  return {
    tyreLife,
    tyrelifeSquared:  tyreLife * tyreLife,
    trackTemp:        (38.2 + s(lap * 0.28) * 2.1 + s(progress * 6.28) * 0.8).toFixed(1),
    airTemp:          (30.1 + s(lap * 0.19) * 1.4 + c(progress * 3.14) * 0.4).toFixed(1),
    humidity:         Math.round(44 + s(lap * 0.35) * 9 + s(progress * 2) * 3),
    pressure:         (1012.8 + c(lap * 0.22) * 1.8).toFixed(1),
    windDir:          Math.round((lap * 12 + progress * 28) % 360),
    windSpeed:        (9.4 + s(lap * 0.44) * 4.2).toFixed(1),
    rainfall:         0,
    fuelLoad:         Math.max(2, (105 - lap * 1.92)).toFixed(1),
    compound:         COMPOUNDS[Math.min(stint, 2)],
  }
}

// ─── Feature panel sub-components ───────────────────────────────────────────

function ShapBar({ shap }) {
  const pct = (shap / SHAP_MAX) * 100
  const color = pct > 80 ? C.red : pct > 55 ? C.orange : pct > 35 ? C.yellow : C.gray
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
      <div style={{ flex: 1, height: 3, background: C.border, borderRadius: 2 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ color: C.gray, fontSize: 8, minWidth: 28, textAlign: 'right' }}>
        {shap.toFixed(3)}
      </span>
    </div>
  )
}

function FeatureRow({ label, value, unit = '', shap }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
      <div style={{ flex: '0 0 88px' }}>
        <div style={{ color: C.lightGray, fontSize: 9.5, fontWeight: 600, lineHeight: 1.2 }}>{label}</div>
        <ShapBar shap={shap} />
      </div>
      <div style={{ flex: '0 0 52px', textAlign: 'right' }}>
        <span style={{ color: C.white, fontSize: 12, fontWeight: 700 }}>{value}</span>
        {unit && <span style={{ color: C.gray, fontSize: 9, marginLeft: 2 }}>{unit}</span>}
      </div>
    </div>
  )
}

function FeatureGroup({ title, color, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        color, fontSize: 8, fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', marginBottom: 6,
        borderBottom: `1px solid ${C.border}`, paddingBottom: 4,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

// ─── Existing bar component ──────────────────────────────────────────────────
function Bar({ label, value, max, color }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ color: C.gray, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <span style={{ color, fontSize: 10, fontWeight: 700 }}>{Math.round(value)}</span>
      </div>
      <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${Math.min(value / max, 1) * 100}%`,
          background: color, borderRadius: 2, boxShadow: `0 0 5px ${color}99`,
          transition: 'width 0.08s linear',
        }} />
      </div>
    </div>
  )
}

export default function BahrainTrackAnim() {
  const mainPathRef  = useRef(null)
  const pitEntryRef  = useRef(null)
  const pitExitRef   = useRef(null)
  const frameRef     = useRef(null)
  const lastTsRef    = useRef(null)

  // All mutable animation state in refs to avoid closure stale issues
  const progressRef    = useRef(0)
  const lapRef         = useRef(1)
  const stintRef       = useRef(0)   // 0=M, 1=H, 2=S
  const phaseRef       = useRef('racing') // 'racing'|'pit_entry'|'pit_stop'|'pit_exit'
  const pitProgressRef = useRef(0)
  const pitTimerRef    = useRef(0)
  const stopCountRef   = useRef(0)

  const [disp, setDisp] = useState({
    x: 0, y: 0, angle: 0,
    progress: 0, lap: 1,
    phase: 'racing', pitTimer: 0,
    stopCount: 0, stint: 0,
  })

  useEffect(() => {
    const RACE_SPEED      = 0.044  // laps/sec on circuit
    const PIT_LANE_SPEED  = 0.75   // fraction/sec on pit paths

    const tick = (ts) => {
      if (!lastTsRef.current) lastTsRef.current = ts
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.05)
      lastTsRef.current = ts

      let x = 0, y = 0, angle = 0
      const phase = phaseRef.current

      // ── racing ──────────────────────────────────────────
      if (phase === 'racing') {
        progressRef.current += RACE_SPEED * dt
        if (progressRef.current >= 1) {
          progressRef.current -= 1
          lapRef.current++

          if (lapRef.current > 50) {
            lapRef.current = 1
            stintRef.current = 0
            stopCountRef.current = 0
          }

          const justFinished = lapRef.current - 1
          if (PIT_LAPS.includes(justFinished) && stopCountRef.current < 2) {
            phaseRef.current = 'pit_entry'
            pitProgressRef.current = 0
          }
        }

        if (mainPathRef.current) {
          const len = mainPathRef.current.getTotalLength()
          const p   = progressRef.current
          const pt  = mainPathRef.current.getPointAtLength(p * len)
          const ptF = mainPathRef.current.getPointAtLength(((p + 0.007) % 1) * len)
          x = pt.x; y = pt.y
          angle = Math.atan2(ptF.y - pt.y, ptF.x - pt.x) * 180 / Math.PI
        }

      // ── pit entry ────────────────────────────────────────
      } else if (phase === 'pit_entry') {
        pitProgressRef.current += PIT_LANE_SPEED * dt
        if (pitProgressRef.current >= 1) {
          pitProgressRef.current = 1
          phaseRef.current = 'pit_stop'
          pitTimerRef.current = 0
        }
        if (pitEntryRef.current) {
          const len = pitEntryRef.current.getTotalLength()
          const pp  = pitProgressRef.current
          const pt  = pitEntryRef.current.getPointAtLength(pp * len)
          const ptF = pitEntryRef.current.getPointAtLength(Math.min(pp + 0.06, 1) * len)
          x = pt.x; y = pt.y
          angle = Math.atan2(ptF.y - pt.y, ptF.x - pt.x) * 180 / Math.PI
        }

      // ── pit stop ─────────────────────────────────────────
      } else if (phase === 'pit_stop') {
        pitTimerRef.current += dt
        x = 280; y = 300; angle = 180

        if (pitTimerRef.current >= PIT_STOP_DURATION) {
          stopCountRef.current++
          stintRef.current++
          phaseRef.current = 'pit_exit'
          pitProgressRef.current = 0
        }

      // ── pit exit ─────────────────────────────────────────
      } else if (phase === 'pit_exit') {
        pitProgressRef.current += PIT_LANE_SPEED * dt
        if (pitProgressRef.current >= 1) {
          pitProgressRef.current = 1
          phaseRef.current = 'racing'
          progressRef.current = POST_PIT_PROGRESS
        }
        if (pitExitRef.current) {
          const len = pitExitRef.current.getTotalLength()
          const pp  = pitProgressRef.current
          const pt  = pitExitRef.current.getPointAtLength(pp * len)
          const ptF = pitExitRef.current.getPointAtLength(Math.min(pp + 0.06, 1) * len)
          x = pt.x; y = pt.y
          angle = Math.atan2(ptF.y - pt.y, ptF.x - pt.x) * 180 / Math.PI
        }
      }

      setDisp({
        x, y, angle,
        progress: progressRef.current,
        lap: lapRef.current,
        phase: phaseRef.current,
        pitTimer: pitTimerRef.current,
        stopCount: stopCountRef.current,
        stint: stintRef.current,
        features: getFeatureValues(lapRef.current, progressRef.current, stintRef.current),
      })

      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  const { x, y, angle, progress, lap, phase, pitTimer, stopCount, stint, features = {} } = disp

  // Telemetry
  const telem = phase === 'racing'
    ? getTelemetry(progress)
    : phase === 'pit_stop'
      ? { speed: 0,  gear: 1, drs: false, sector: 'PIT', corner: 'Pit Box'  }
      : { speed: 58, gear: 2, drs: false, sector: 'PIT', corner: 'Pit Lane' }

  // Tire wear
  let tireWear
  if (phase === 'pit_stop') {
    tireWear = Math.round(100 * Math.max(0, 1 - pitTimer / PIT_STOP_DURATION))
  } else {
    tireWear = Math.round(getTireWear(lap, Math.min(stint, 2)))
  }

  const compound      = COMPOUNDS[Math.min(stint, 2)]
  const nextCompound  = COMPOUNDS[Math.min(stint + 1, 2)]
  const compoundColor = COMPOUND_COLORS[compound]
  const wearColor     = tireWear > 70 ? C.red : tireWear > 40 ? C.orange : C.yellow

  const SC = { S1: C.cyan, S2: C.yellow, S3: C.orange }

  return (
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start', fontFamily: "'Titillium Web', sans-serif" }}>

      {/* ── Circuit SVG ── */}
      <div style={{ flex: '1 1 360px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, overflow: 'hidden' }}>
        <svg viewBox="0 0 560 315" style={{ width: '100%', display: 'block' }}>

          {/* Invisible reference paths for getPointAtLength */}
          <path ref={mainPathRef} d={PATH_D}      fill="none" stroke="none" />
          <path ref={pitEntryRef} d={PIT_ENTRY_D} fill="none" stroke="none" />
          <path ref={pitExitRef}  d={PIT_EXIT_D}  fill="none" stroke="none" />

          {/* Main circuit — glow + asphalt + white line */}
          <path d={PATH_D} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={18} />
          <path d={PATH_D} fill="none" stroke="rgba(30,30,46,0.9)"     strokeWidth={10} />
          <path d={PATH_D} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={8}  />
          <path d={PATH_D} fill="none" stroke="rgba(255,255,255,0.52)" strokeWidth={3}  />

          {/* Pit lane visuals — dashed yellow lines */}
          <path d={PIT_ENTRY_D} fill="none" stroke="rgba(255,215,0,0.12)" strokeWidth={10} />
          <path d={PIT_ENTRY_D} fill="none" stroke="rgba(255,215,0,0.5)"  strokeWidth={2} strokeDasharray="5 3" />
          <path d={PIT_EXIT_D}  fill="none" stroke="rgba(255,215,0,0.12)" strokeWidth={10} />
          <path d={PIT_EXIT_D}  fill="none" stroke="rgba(255,215,0,0.5)"  strokeWidth={2} strokeDasharray="5 3" />

          {/* Pit box marker */}
          <rect x={258} y={295} width={44} height={10} rx={2}
            fill="rgba(255,215,0,0.1)" stroke="rgba(255,215,0,0.55)" strokeWidth={1} />
          <text x={280} y={303} textAnchor="middle" fill={C.yellow}
            fontSize={6.5} fontFamily="'Titillium Web'" fontWeight={700} letterSpacing={1.2}>
            BOX 1
          </text>

          {/* PIT IN / PIT OUT labels */}
          <text x={398} y={288} fill="rgba(255,215,0,0.7)" fontSize={6.5} fontFamily="'Titillium Web'" fontWeight={700} letterSpacing={0.8}>PIT IN</text>
          <text x={126} y={288} fill="rgba(255,215,0,0.7)" fontSize={6.5} fontFamily="'Titillium Web'" fontWeight={700} letterSpacing={0.8}>PIT OUT</text>

          {/* S/F line */}
          <line x1={387} y1={263} x2={396} y2={277} stroke={C.white} strokeWidth={3} strokeLinecap="round" />
          <line x1={388} y1={264} x2={395} y2={276} stroke={C.red}   strokeWidth={1.5} strokeLinecap="round" />

          {/* Sector dots */}
          <circle cx={46}  cy={202} r={4} fill={SC.S1} />
          <circle cx={450} cy={230} r={4} fill={SC.S2} />
          <text x={20}  y={200} fill={SC.S1} fontSize={9} fontFamily="'Titillium Web'" fontWeight={700}>S1</text>
          <text x={456} y={229} fill={SC.S2} fontSize={9} fontFamily="'Titillium Web'" fontWeight={700}>S2</text>
          <text x={398} y={291} fill={SC.S3} fontSize={8} fontFamily="'Titillium Web'" fontWeight={700}>S3</text>

          {/* Corner labels */}
          <text x={50}  y={96} fill={C.gray} fontSize={8} fontFamily="'Titillium Web'">T1</text>
          <text x={366} y={26} fill={C.gray} fontSize={8} fontFamily="'Titillium Web'">T4–T7</text>
          <text x={454} y={240} fill={C.gray} fontSize={8} fontFamily="'Titillium Web'">T10</text>

          {/* Header info */}
          <text x={12} y={22} fill={C.white} fontSize={12} fontWeight={700} fontFamily="'Titillium Web'" letterSpacing={1.5}>
            🇧🇭 BAHRAIN GRAND PRIX
          </text>
          <text x={12} y={36} fill={C.gray} fontSize={9} fontFamily="'Titillium Web'">
            {phase === 'pit_stop' ? '🔧 Pit Box — Cambiando neumáticos' : phase !== 'racing' ? 'Pit Lane' : telem.corner}
            {'  ·  Vuelta '}{lap}{ ' / 50'}
          </text>

          {/* Active PIT STOP banner */}
          {phase === 'pit_stop' && (
            <>
              <rect x={198} y={280} width={164} height={22} rx={3}
                fill="rgba(255,215,0,0.12)" stroke={C.yellow} strokeWidth={1} />
              <text x={280} y={295} textAnchor="middle" fill={C.yellow} fontSize={10}
                fontWeight={700} fontFamily="'Titillium Web'" letterSpacing={1.5}>
                PARADA {stopCount + 1}  ·  {Math.max(0, PIT_STOP_DURATION - pitTimer).toFixed(1)}s
              </text>
            </>
          )}

          {/* Compound change banner during pit_stop */}
          {phase === 'pit_stop' && (
            <text x={280} y={314} textAnchor="middle"
              fill="rgba(255,255,255,0.5)" fontSize={8} fontFamily="'Titillium Web'" letterSpacing={1}>
              {compound} → {nextCompound}
            </text>
          )}

          {/* Car */}
          {x !== 0 && (
            <g transform={`translate(${x},${y}) rotate(${angle})`}>
              <ellipse cx={-14} cy={0} rx={8} ry={4} fill={C.orange} opacity={phase === 'pit_stop' ? 0 : 0.35} />
              <circle r={11} fill={C.red} opacity={0.18} />
              <rect x={-13} y={-5}   width={4.5} height={10}  rx={1}   fill={C.red} />
              <rect x={-8}  y={-3.5} width={18}  height={7}   rx={2.5} fill={C.red} />
              <rect x={-2}  y={-2}   width={7}   height={4}   rx={1.5} fill="#990000" />
              <path d="M 10,-1.5 L 14,0 L 10,1.5 Z" fill={C.red} />
              <rect x={9}  y={-5}   width={3.5} height={10}  rx={1}   fill={C.red} />
              {/* wheels */}
              <rect x={-9} y={-6}  width={5} height={3.5} rx={1} fill="#111" stroke="#555" strokeWidth={0.5} />
              <rect x={4}  y={-6}  width={5} height={3.5} rx={1} fill="#111" stroke="#555" strokeWidth={0.5} />
              <rect x={-9} y={2.5} width={5} height={3.5} rx={1} fill="#111" stroke="#555" strokeWidth={0.5} />
              <rect x={4}  y={2.5} width={5} height={3.5} rx={1} fill="#111" stroke="#555" strokeWidth={0.5} />
              {/* new compound highlight during pit_stop */}
              {phase === 'pit_stop' && (
                <>
                  <rect x={-10} y={-7}  width={7} height={5}   rx={1.5} fill="none" stroke={COMPOUND_COLORS[nextCompound]} strokeWidth={1.5} />
                  <rect x={3.5} y={-7}  width={7} height={5}   rx={1.5} fill="none" stroke={COMPOUND_COLORS[nextCompound]} strokeWidth={1.5} />
                  <rect x={-10} y={2}   width={7} height={5}   rx={1.5} fill="none" stroke={COMPOUND_COLORS[nextCompound]} strokeWidth={1.5} />
                  <rect x={3.5} y={2}   width={7} height={5}   rx={1.5} fill="none" stroke={COMPOUND_COLORS[nextCompound]} strokeWidth={1.5} />
                </>
              )}
            </g>
          )}
        </svg>
      </div>

      {/* ── Telemetry panel ── */}
      <div style={{ flex: '0 0 205px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Sector */}
        <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 4, padding: '10px 14px' }}>
          <div style={{ color: C.gray, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
            SECTOR
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['S1','S2','S3'].map(s => {
              const sc = SC[s]
              const active = telem.sector === s
              return (
                <div key={s} style={{
                  flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 3,
                  background: active ? sc + '22' : 'transparent',
                  border: `1px solid ${active ? sc : C.border}`,
                  color: active ? sc : C.gray,
                  fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
                  transition: 'all 0.12s',
                }}>
                  {s}
                </div>
              )
            })}
          </div>
          {telem.sector === 'PIT' && (
            <div style={{
              marginTop: 6, textAlign: 'center', padding: '5px 0', borderRadius: 3,
              background: 'rgba(255,215,0,0.1)', border: `1px solid ${C.yellow}`,
              color: C.yellow, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            }}>
              PIT LANE
            </div>
          )}
        </div>

        {/* Speed + Gear */}
        <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 4, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: C.gray, fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>VELOCIDAD</div>
              <div style={{ color: C.white, fontSize: 36, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}>
                {telem.speed}
              </div>
              <div style={{ color: C.gray, fontSize: 9 }}>km/h</div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 2 }}>
              <div style={{ color: C.gray, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>MARCHA</div>
              <div style={{
                background: C.border, borderRadius: 4, width: 42, height: 42,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.white, fontSize: 26, fontWeight: 900,
              }}>
                {telem.gear}
              </div>
            </div>
          </div>
          <Bar label="Speed" value={telem.speed} max={340} color={C.red} />
        </div>

        {/* DRS */}
        <div style={{
          background: C.surfaceAlt,
          border: `1px solid ${telem.drs ? C.green : C.border}`,
          borderRadius: 4, padding: '9px 14px',
          display: 'flex', alignItems: 'center', gap: 8,
          transition: 'border-color 0.15s',
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: telem.drs ? C.green : C.gray,
            boxShadow: telem.drs ? `0 0 7px ${C.green}` : 'none',
            flexShrink: 0, transition: 'all 0.15s',
          }} />
          <span style={{ color: telem.drs ? C.green : C.gray, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}>
            DRS {telem.drs ? 'ACTIVO' : 'CERRADO'}
          </span>
          {telem.drs && <span style={{ marginLeft: 'auto', color: C.green, fontSize: 10, fontWeight: 900 }}>▶▶</span>}
        </div>

        {/* Tire */}
        <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 4, padding: '10px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: C.gray, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>NEUMÁTICO</span>
            <span style={{
              background: compound === 'SOFT' ? 'rgba(225,6,0,0.2)' : compound === 'HARD' ? 'rgba(200,200,200,0.08)' : 'rgba(255,215,0,0.12)',
              color: compoundColor, fontSize: 8, fontWeight: 900,
              padding: '2px 6px', borderRadius: 2, letterSpacing: '0.08em',
              border: `1px solid ${compoundColor}55`,
              transition: 'all 0.3s',
            }}>
              {compound}
            </span>
          </div>
          <Bar label={`Desgaste ${tireWear}%`} value={tireWear} max={100} color={wearColor} />
          {phase === 'pit_stop' && (
            <div style={{ marginTop: 8, textAlign: 'center', color: C.yellow, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>
              🔧 Montando {nextCompound}...
            </div>
          )}
        </div>

        {/* Lap / Stint */}
        <div style={{
          background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 4, padding: '10px 14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ color: C.gray, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>VUELTA</div>
            <div style={{ color: C.gray, fontSize: 8, marginTop: 2 }}>Stint {Math.min(stint, 2) + 1} · Parada {stopCount}/2</div>
          </div>
          <span style={{ color: C.white, fontSize: 24, fontWeight: 900 }}>
            {lap}<span style={{ color: C.gray, fontSize: 11, fontWeight: 400 }}> / 50</span>
          </span>
        </div>

        {/* GNN model data card */}
        <div style={{ background: 'rgba(225,6,0,0.06)', border: `1px solid rgba(225,6,0,0.22)`, borderRadius: 4, padding: '10px 12px' }}>
          <div style={{ color: C.red, fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
            GNN GAT v5.1 · ESTRATEGIA P50
          </div>
          <div style={{ color: C.lightGray, fontSize: 9, marginBottom: 4 }}>
            Degrad. acumulada:&nbsp;
            <b style={{ color: C.orange }}>{getP50(Math.min(lap, 50)).toFixed(3)}s</b>
          </div>
          {stopCount < 2 ? (
            <div style={{ color: C.gray, fontSize: 8 }}>
              Pit {stopCount + 1} ventana:&nbsp;
              <b style={{ color: C.yellow }}>vuelta {PIT_LAPS[stopCount]}</b>
              <br />
              P50 ={' '}
              <b style={{ color: C.yellow }}>{getP50(PIT_LAPS[stopCount]).toFixed(3)}s</b>
            </div>
          ) : (
            <div style={{ color: C.green, fontSize: 9, fontWeight: 700 }}>✓ Estrategia completada</div>
          )}
          <div style={{ color: C.gray, fontSize: 8, marginTop: 4, borderTop: `1px solid rgba(255,255,255,0.06)`, paddingTop: 4 }}>
            R² <b style={{ color: C.green }}>0.9564</b> · MAE <b style={{ color: C.green }}>0.538s</b>
          </div>
        </div>
      </div>

      {/* ── Model features panel ── */}
      <div style={{
        flex: '0 0 190px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        background: C.surfaceAlt,
        border: `1px solid ${C.border}`,
        borderRadius: 4,
        padding: '12px 14px',
        fontFamily: "'Titillium Web', sans-serif",
      }}>
        {/* Header */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ color: C.white, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            FEATURES · MODELO
          </div>
          <div style={{ color: C.gray, fontSize: 8, marginTop: 2 }}>
            13 variables · SHAP importance
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 5, fontSize: 8 }}>
            {[['Neumático', C.red], ['Clima', C.cyan], ['Carrera', C.orange]].map(([l, c]) => (
              <span key={l} style={{ color: c, fontWeight: 700, letterSpacing: '0.06em' }}>■ {l}</span>
            ))}
          </div>
        </div>

        <FeatureGroup title="Neumático" color={C.red}>
          <FeatureRow label="TyreLife"      value={features.tyreLife}        unit="vueltas" shap={SHAP.tyreLife} />
          <FeatureRow label="TyreLife²"     value={features.tyrelifeSquared} unit="v²"      shap={SHAP.tyrelifeSquared} />
          <FeatureRow label="Compuesto"     value={features.compound || '—'} unit=""        shap={SHAP.compound} />
        </FeatureGroup>

        <FeatureGroup title="Condiciones" color={C.cyan}>
          <FeatureRow label="Humedad"       value={features.humidity}   unit="%"   shap={SHAP.humidity} />
          <FeatureRow label="Presión"       value={features.pressure}   unit="hPa" shap={SHAP.pressure} />
          <FeatureRow label="Temp. Aire"    value={features.airTemp}    unit="°C"  shap={SHAP.airTemp} />
          <FeatureRow label="Temp. Pista"   value={features.trackTemp}  unit="°C"  shap={SHAP.trackTemp} />
          <FeatureRow label="Dir. Viento"   value={features.windDir}    unit="°"   shap={SHAP.windDir} />
          <FeatureRow label="Vel. Viento"   value={features.windSpeed}  unit="km/h" shap={SHAP.windSpeed} />
          <FeatureRow label="Lluvia"        value={features.rainfall === 0 ? 'No' : 'Sí'} unit="" shap={SHAP.rainfall} />
        </FeatureGroup>

        <FeatureGroup title="Carrera" color={C.orange}>
          <FeatureRow label="Carga Comb."   value={features.fuelLoad}   unit="kg"  shap={SHAP.fuelLoad} />
        </FeatureGroup>

        {/* Target variable */}
        <div style={{
          marginTop: 2, borderTop: `1px solid ${C.border}`, paddingTop: 8,
        }}>
          <div style={{ color: C.gray, fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            TARGET
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: C.lightGray, fontSize: 9 }}>deltadeg (s/vuelta)</span>
            <span style={{
              color: C.red, fontSize: 10, fontWeight: 700,
              background: 'rgba(225,6,0,0.1)', padding: '2px 6px', borderRadius: 2,
            }}>
              {MC[Math.min((features.tyreLife || 1) + 1, 49)]
                ? (MC[Math.min((features.tyreLife || 1) + 1, 49)].p50
                   - MC[Math.max((features.tyreLife || 1) - 1, 0)].p50).toFixed(3) + 's'
                : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
