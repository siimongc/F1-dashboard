import { useEffect, useRef, useState } from 'react'
import tracksData from '../data/tracks.json'

const C = {
  red:       '#E10600',
  orange:    '#FF6B35',
  yellow:    '#FFD700',
  green:     '#00D27A',
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
const POST_PIT_PROGRESS  = 0.04 // circuit progress after pit exit (onto main straight)

const RACE_SPEED_FAST   = 0.66   // ~1.5s por vuelta en modo rápido
const RACE_SPEED_NORMAL = 0.132  // ~7.5s por vuelta — énfasis pit
const PIT_SLOW_WINDOW   = 2      // vueltas antes del pit donde se frena

function getRaceSpeed(lap) {
  for (const pitLap of PIT_LAPS) {
    if (lap >= pitLap - PIT_SLOW_WINDOW && lap <= pitLap + 1) return RACE_SPEED_NORMAL
  }
  return RACE_SPEED_FAST
}

const COMPOUNDS      = ['MEDIUM', 'HARD', 'SOFT']
const COMPOUND_COLORS = { MEDIUM: '#FFD700', HARD: '#CCCCCC', SOFT: '#E10600' }

// Main circuit path — Bahrain realistic outline (viewBox 0 0 560 315)
// S/F straight at bottom, T1 hairpin left, outer loop upper-right, T10 hairpin, chicane
const PATH_D = `
  M 430,255
  L 155,255
  C 90,255 58,242 54,210
  C 50,178 72,148 96,136
  C 120,124 158,116 184,118
  C 210,120 238,104 258,86
  C 278,68 314,60 350,58
  C 376,57 396,52 412,44
  C 432,32 462,24 490,44
  C 518,64 520,104 504,132
  C 488,160 476,170 474,186
  C 472,222 450,255 430,255
  Z
`

// Pit lane — parallel to main straight at y=300, like real Bahrain
// Entry: S/F (430,255) → sweeps down-right then left along y=300 to pit box (300,300)
// Exit:  pit box (300,300) → left along y=300 then curves up → circuit rejoin (155,255)
const PIT_ENTRY_D = `M 430,255 C 445,255 458,270 456,285 C 454,300 430,300 300,300`
const PIT_EXIT_D  = `M 300,300 C 220,300 160,300 152,288 C 144,276 147,262 155,255`

// Telemetry zones [progress, speed_kmh, gear, drs, sector, corner_name]
const ZONES = [
  [0.00, 318, 8, true,  'S1', 'S/F Straight'],
  [0.11, 88,  2, false, 'S1', 'Turn 1'],
  [0.20, 162, 5, false, 'S1', 'Turn 2–3'],
  [0.32, 290, 8, false, 'S2', 'Back Straight'],
  [0.45, 248, 7, false, 'S2', 'Outer Loop T4'],
  [0.56, 215, 6, false, 'S2', 'Outer Loop T7'],
  [0.65, 86,  2, false, 'S3', 'Turn 10'],
  [0.80, 280, 7, true,  'S3', 'Turn 10–15'],
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

// ─── Bar component ──────────────────────────────────────────────────────────
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
    fastForward: true,
  })

  useEffect(() => {
    const PIT_LANE_SPEED  = 0.75   // fraction/sec on pit paths

    const tick = (ts) => {
      if (!lastTsRef.current) lastTsRef.current = ts
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.05)
      lastTsRef.current = ts

      let x = 0, y = 0, angle = 0
      const phase = phaseRef.current

      // ── racing ──────────────────────────────────────────
      if (phase === 'racing') {
        const raceSpeed = getRaceSpeed(lapRef.current)
        progressRef.current += raceSpeed * dt
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
        x = 300; y = 300; angle = 180

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
        fastForward: getRaceSpeed(lapRef.current) === RACE_SPEED_FAST && phaseRef.current === 'racing',
      })

      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  const { x, y, angle, progress, lap, phase, pitTimer, stopCount, stint, features = {}, fastForward } = disp

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
  const wearColor     = tireWear > 70 ? C.red : tireWear > 40 ? C.orange : tireWear > 20 ? C.yellow : C.green

  const SC = { S1: C.green, S2: C.yellow, S3: C.orange }

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
          <rect x={278} y={294} width={44} height={10} rx={2}
            fill="rgba(255,215,0,0.1)" stroke="rgba(255,215,0,0.55)" strokeWidth={1} />
          <text x={300} y={302} textAnchor="middle" fill={C.yellow}
            fontSize={6.5} fontFamily="'Titillium Web'" fontWeight={700} letterSpacing={1.2}>
            BOX 1
          </text>

          {/* PIT IN / PIT OUT labels */}
          <text x={422} y={283} fill="rgba(255,215,0,0.7)" fontSize={6.5} fontFamily="'Titillium Web'" fontWeight={700} letterSpacing={0.8}>PIT IN</text>
          <text x={138} y={283} fill="rgba(255,215,0,0.7)" fontSize={6.5} fontFamily="'Titillium Web'" fontWeight={700} letterSpacing={0.8}>PIT OUT</text>

          {/* S/F line */}
          <line x1={427} y1={248} x2={432} y2={260} stroke={C.white} strokeWidth={3} strokeLinecap="round" />
          <line x1={428} y1={249} x2={431} y2={259} stroke={C.red}   strokeWidth={1.5} strokeLinecap="round" />

          {/* Sector dots */}
          <circle cx={72}  cy={200} r={4} fill={SC.S1} />
          <circle cx={480} cy={130} r={4} fill={SC.S2} />
          <text x={22}  y={198} fill={SC.S1} fontSize={9} fontFamily="'Titillium Web'" fontWeight={700}>S1</text>
          <text x={486} y={128} fill={SC.S2} fontSize={9} fontFamily="'Titillium Web'" fontWeight={700}>S2</text>
          <text x={458} y={240} fill={SC.S3} fontSize={8} fontFamily="'Titillium Web'" fontWeight={700}>S3</text>

          {/* Corner labels */}
          <text x={36}  y={214} fill={C.gray} fontSize={8} fontFamily="'Titillium Web'">T1</text>
          <text x={462} y={30}  fill={C.gray} fontSize={8} fontFamily="'Titillium Web'">T4–T7</text>
          <text x={460} y={254} fill={C.gray} fontSize={8} fontFamily="'Titillium Web'">T10</text>

          {/* Header info */}
          <text x={12} y={22} fill={C.white} fontSize={12} fontWeight={700} fontFamily="'Titillium Web'" letterSpacing={1.5}>
            🇧🇭 BAHRAIN GRAND PRIX
          </text>
          <text x={12} y={36} fill={C.gray} fontSize={9} fontFamily="'Titillium Web'">
            {phase === 'pit_stop' ? '🔧 Pit Box — Cambiando neumáticos' : phase !== 'racing' ? 'Pit Lane' : telem.corner}
            {'  ·  Vuelta '}{lap}{ ' / 50'}
          </text>

          {/* Velocidad de simulación */}
          {fastForward ? (
            <g>
              <rect x={12} y={42} width={62} height={13} rx={2} fill="rgba(255,107,53,0.08)" stroke="rgba(255,107,53,0.35)" strokeWidth={0.8} />
              <text x={43} y={52} textAnchor="middle" fill={C.orange} fontSize={7.5} fontWeight={700} fontFamily="'Titillium Web'" letterSpacing={0.8}>
                ▶▶ SIMULACIÓN
              </text>
            </g>
          ) : phase === 'racing' ? (
            <g>
              <rect x={12} y={42} width={68} height={13} rx={2} fill="rgba(255,107,53,0.1)" stroke="rgba(255,107,53,0.45)" strokeWidth={0.8} />
              <text x={46} y={52} textAnchor="middle" fill={C.orange} fontSize={7.5} fontWeight={700} fontFamily="'Titillium Web'" letterSpacing={0.8}>
                ▶ TIEMPO REAL
              </text>
            </g>
          ) : null}

          {/* Active PIT STOP banner */}
          {phase === 'pit_stop' && (
            <>
              <rect x={192} y={278} width={216} height={20} rx={3}
                fill="rgba(255,215,0,0.12)" stroke={C.yellow} strokeWidth={1} />
              <text x={300} y={292} textAnchor="middle" fill={C.yellow} fontSize={10}
                fontWeight={700} fontFamily="'Titillium Web'" letterSpacing={1.5}>
                PARADA {stopCount + 1}  ·  {Math.max(0, PIT_STOP_DURATION - pitTimer).toFixed(1)}s
              </text>
            </>
          )}

          {/* Compound change banner during pit_stop */}
          {phase === 'pit_stop' && (
            <text x={300} y={311} textAnchor="middle"
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
      <div style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Speed */}
        <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 4, padding: '14px 16px' }}>
          <div style={{ color: C.gray, fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>VELOCIDAD</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ color: C.white, fontSize: 42, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}>
              {telem.speed}
            </span>
            <span style={{ color: C.gray, fontSize: 11 }}>km/h</span>
          </div>
          <div style={{ color: C.gray, fontSize: 9, marginTop: 4 }}>
            {phase === 'pit_stop' ? 'Pit Box' : phase !== 'racing' ? 'Pit Lane' : telem.corner}
          </div>
        </div>

        {/* Tire */}
        <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 4, padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ color: C.gray, fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>NEUMÁTICO</span>
            <span style={{
              background: compound === 'SOFT' ? 'rgba(225,6,0,0.2)' : compound === 'HARD' ? 'rgba(200,200,200,0.08)' : 'rgba(255,215,0,0.12)',
              color: compoundColor, fontSize: 8, fontWeight: 900,
              padding: '2px 7px', borderRadius: 2, letterSpacing: '0.08em',
              border: `1px solid ${compoundColor}55`,
              transition: 'all 0.3s',
            }}>
              {compound}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 }}>
            <span style={{ color: C.gray, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>DESGASTE</span>
            <span style={{ color: wearColor, fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{tireWear}%</span>
          </div>
          <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${tireWear}%`,
              background: wearColor, borderRadius: 2,
              boxShadow: `0 0 6px ${wearColor}88`,
              transition: 'width 0.08s linear',
            }} />
          </div>
          {phase === 'pit_stop' && (
            <div style={{ marginTop: 8, textAlign: 'center', color: C.yellow, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>
              Montando {nextCompound}...
            </div>
          )}
        </div>

        {/* Lap / Stint */}
        <div style={{
          background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 4, padding: '12px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ color: C.gray, fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>VUELTA</div>
            <div style={{ color: C.gray, fontSize: 8, marginTop: 3 }}>Stint {Math.min(stint, 2) + 1} · Parada {stopCount}/2</div>
          </div>
          <span style={{ color: C.white, fontSize: 28, fontWeight: 900, lineHeight: 1 }}>
            {lap}<span style={{ color: C.gray, fontSize: 12, fontWeight: 400 }}> /50</span>
          </span>
        </div>

        {/* GNN model card */}
        <div style={{ background: 'rgba(225,6,0,0.06)', border: `1px solid rgba(225,6,0,0.25)`, borderRadius: 4, padding: '12px 14px' }}>
          <div style={{ color: C.red, fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
            GNN GAT v5.1 · P50
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ color: C.gray, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Degradación acumulada</div>
            <span style={{ color: C.orange, fontSize: 20, fontWeight: 900, lineHeight: 1 }}>
              {getP50(Math.min(lap, 50)).toFixed(2)}s
            </span>
          </div>

          {stopCount < 2 ? (
            <div style={{ marginBottom: 8 }}>
              <div style={{ color: C.gray, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
                Pit {stopCount + 1} — vuelta óptima
              </div>
              <span style={{ color: C.yellow, fontSize: 20, fontWeight: 900, lineHeight: 1 }}>
                V{PIT_LAPS[stopCount]}
              </span>
            </div>
          ) : (
            <div style={{ color: C.green, fontSize: 10, fontWeight: 700, marginBottom: 8 }}>✓ Estrategia completada</div>
          )}

          <div style={{ borderTop: `1px solid rgba(255,255,255,0.07)`, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: C.gray, fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>R²</div>
              <div style={{ color: C.green, fontSize: 13, fontWeight: 900 }}>0.956</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: C.gray, fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>MAE</div>
              <div style={{ color: C.green, fontSize: 13, fontWeight: 900 }}>0.538s</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: C.gray, fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>±Vueltas</div>
              <div style={{ color: C.green, fontSize: 13, fontWeight: 900 }}>±2.4v</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
