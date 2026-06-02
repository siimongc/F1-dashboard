import { useEffect, useRef, useState } from 'react'
import stintsData from '../data/stints.json'

const C = {
  red:        '#E10600',
  orange:     '#FF6B35',
  yellow:     '#FFD700',
  green:      '#00D27A',
  gray:       '#8B8BA3',
  border:     '#2A2A40',
  surface:    '#1E1E2E',
  surfaceAlt: '#252538',
  white:      '#FFFFFF',
}

const BAHRAIN         = stintsData['Bahrain_Grand_Prix']
const DEMO_STINT      = BAHRAIN.stints.filter(s => s.n_laps >= 4)[0]  // SOFT
const COMPOUND        = DEMO_STINT.compound
const COMPOUND_COLORS = { SOFT: '#E10600', MEDIUM: '#FFD700', HARD: '#CCCCCC', INTER: '#00D27A' }
const COMPOUND_COLOR  = COMPOUND_COLORS[COMPOUND]
const DEMO_LAPS       = DEMO_STINT.laps
const N_LAPS          = DEMO_LAPS.length   // 11

const PIT_THRESHOLD = 82   // % — nivel de desgaste visual en el pit predicho

// GNN cumulative (segundos) por lap_in_stint
const CUM_BY_STINT_LAP = {}
DEMO_LAPS.forEach(l => { CUM_BY_STINT_LAP[l.lap_in_stint] = l.cumulative })

// Pit óptimo derivado del GNN: vuelta con mayor degradación acumulada predicha
// → el modelo detecta que el neumático está en su peor momento ahí
const GNN_PIT_LAP = DEMO_LAPS.reduce((best, l) =>
  l.cumulative > (CUM_BY_STINT_LAP[best] ?? -Infinity) ? l.lap_in_stint : best, 1
)
const GNN_PIT_CUM = CUM_BY_STINT_LAP[GNN_PIT_LAP]   // segundos en ese pico

// Curva de desgaste: potencia 0.85 → 0% al inicio, PIT_THRESHOLD% al llegar al pit GNN
function getWear(lapInStint, intraProgress) {
  const frac = Math.min((lapInStint - 1 + intraProgress) / GNN_PIT_LAP, 1)
  return PIT_THRESHOLD * Math.pow(frac, 0.85)
}

// Degradación GNN interpolada entre vueltas, clamped ≥ 0
function getGnnCum(lapInStint, intraProgress) {
  const cur  = CUM_BY_STINT_LAP[lapInStint] ?? 0
  const next = CUM_BY_STINT_LAP[Math.min(lapInStint + 1, GNN_PIT_LAP)] ?? cur
  return Math.max(0, cur + (next - cur) * intraProgress)
}

const PIT_STOP_DURATION = 2.4
const POST_PIT_PROGRESS = 0.04
const RACE_SPEED_FAST   = 0.66
const RACE_SPEED_SLOW   = 0.132
const PIT_LANE_SPEED    = 0.75
const PIT_SLOW_WINDOW   = 2

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
const PIT_ENTRY_D = `M 430,255 C 445,255 458,270 456,285 C 454,300 430,300 300,300`
const PIT_EXIT_D  = `M 300,300 C 220,300 160,300 152,288 C 144,276 147,262 155,255`

const CORNER_BY_PROGRESS = [
  [0.00, 'S/F Straight'],
  [0.11, 'Turn 1'],
  [0.20, 'Turn 2–3'],
  [0.32, 'Back Straight'],
  [0.45, 'Outer Loop T4'],
  [0.56, 'Outer Loop T7'],
  [0.65, 'Turn 10'],
  [0.80, 'Turn 10–15'],
  [0.95, 'S/F Straight'],
]

function getCorner(p) {
  for (let i = CORNER_BY_PROGRESS.length - 1; i >= 0; i--) {
    if (p >= CORNER_BY_PROGRESS[i][0]) return CORNER_BY_PROGRESS[i][1]
  }
  return CORNER_BY_PROGRESS[0][1]
}

export default function BahrainTrackAnim() {
  const mainPathRef  = useRef(null)
  const pitEntryRef  = useRef(null)
  const pitExitRef   = useRef(null)
  const frameRef     = useRef(null)
  const lastTsRef    = useRef(null)

  const progressRef    = useRef(0)
  const lapRef         = useRef(1)       // lap_in_stint, 1 → N_LAPS
  const phaseRef       = useRef('racing')
  const pitProgressRef = useRef(0)
  const pitTimerRef    = useRef(0)
  const loopRef        = useRef(0)

  const [disp, setDisp] = useState({
    x: 0, y: 0, angle: 0,
    progress: 0, lap: 1, phase: 'racing', pitTimer: 0, loop: 0,
  })

  useEffect(() => {
    const tick = (ts) => {
      if (!lastTsRef.current) lastTsRef.current = ts
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.05)
      lastTsRef.current = ts

      let x = 0, y = 0, angle = 0
      const phase = phaseRef.current

      if (phase === 'racing') {
        const nearPit = lapRef.current >= GNN_PIT_LAP - PIT_SLOW_WINDOW + 1
        const speed   = nearPit ? RACE_SPEED_SLOW : RACE_SPEED_FAST
        progressRef.current += speed * dt
        if (progressRef.current >= 1) {
          progressRef.current -= 1
          lapRef.current++
          if (lapRef.current > GNN_PIT_LAP) {
            phaseRef.current       = 'pit_entry'
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

      } else if (phase === 'pit_entry') {
        pitProgressRef.current += PIT_LANE_SPEED * dt
        if (pitProgressRef.current >= 1) {
          pitProgressRef.current = 1
          phaseRef.current       = 'pit_stop'
          pitTimerRef.current    = 0
        }
        if (pitEntryRef.current) {
          const len = pitEntryRef.current.getTotalLength()
          const pp  = pitProgressRef.current
          const pt  = pitEntryRef.current.getPointAtLength(pp * len)
          const ptF = pitEntryRef.current.getPointAtLength(Math.min(pp + 0.06, 1) * len)
          x = pt.x; y = pt.y
          angle = Math.atan2(ptF.y - pt.y, ptF.x - pt.x) * 180 / Math.PI
        }

      } else if (phase === 'pit_stop') {
        pitTimerRef.current += dt
        x = 300; y = 300; angle = 180
        if (pitTimerRef.current >= PIT_STOP_DURATION) {
          loopRef.current++
          lapRef.current         = 1
          phaseRef.current       = 'pit_exit'
          pitProgressRef.current = 0
        }

      } else if (phase === 'pit_exit') {
        pitProgressRef.current += PIT_LANE_SPEED * dt
        if (pitProgressRef.current >= 1) {
          pitProgressRef.current = 1
          phaseRef.current       = 'racing'
          progressRef.current    = POST_PIT_PROGRESS
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
        lap:      Math.min(lapRef.current, GNN_PIT_LAP),
        phase:    phaseRef.current,
        pitTimer: pitTimerRef.current,
        loop:     loopRef.current,
      })

      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  const { x, y, angle, progress, lap, phase, pitTimer, loop } = disp

  const corner = phase === 'racing'
    ? getCorner(progress)
    : phase === 'pit_stop' ? 'Pit Box' : 'Pit Lane'

  let wear, gnnCum
  if (phase === 'pit_stop') {
    const r = Math.max(0, 1 - pitTimer / PIT_STOP_DURATION)
    wear    = PIT_THRESHOLD * r
    gnnCum  = GNN_PIT_CUM * r
  } else if (phase === 'pit_entry') {
    wear   = PIT_THRESHOLD
    gnnCum = GNN_PIT_CUM
  } else {
    wear   = getWear(lap, progress)
    gnnCum = getGnnCum(lap, progress)
  }

  const wearPct    = Math.round(wear)   // 0–PIT_THRESHOLD, muestra cuánto desgaste antes del pit
  const wearColor  = wearPct > 70 ? C.red : wearPct > 50 ? C.orange : wearPct > 30 ? C.yellow : C.green
  const lapsLeft   = Math.max(0, GNN_PIT_LAP - lap)
  const pitUrgent  = lapsLeft === 0 && phase === 'racing'
  return (
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start', fontFamily: "'Titillium Web', sans-serif" }}>

      {/* ── Circuit SVG ── */}
      <div style={{ flex: '1 1 360px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, overflow: 'hidden' }}>
        <svg viewBox="0 0 560 315" style={{ width: '100%', display: 'block' }}>

          <path ref={mainPathRef} d={PATH_D}      fill="none" stroke="none" />
          <path ref={pitEntryRef} d={PIT_ENTRY_D} fill="none" stroke="none" />
          <path ref={pitExitRef}  d={PIT_EXIT_D}  fill="none" stroke="none" />

          {/* Circuit */}
          <path d={PATH_D} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={18} />
          <path d={PATH_D} fill="none" stroke="rgba(30,30,46,0.9)"     strokeWidth={10} />
          <path d={PATH_D} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={8}  />
          <path d={PATH_D} fill="none" stroke="rgba(255,255,255,0.52)" strokeWidth={3}  />

          {/* Pit lane */}
          <path d={PIT_ENTRY_D} fill="none" stroke="rgba(255,215,0,0.12)" strokeWidth={10} />
          <path d={PIT_ENTRY_D} fill="none" stroke="rgba(255,215,0,0.5)"  strokeWidth={2} strokeDasharray="5 3" />
          <path d={PIT_EXIT_D}  fill="none" stroke="rgba(255,215,0,0.12)" strokeWidth={10} />
          <path d={PIT_EXIT_D}  fill="none" stroke="rgba(255,215,0,0.5)"  strokeWidth={2} strokeDasharray="5 3" />

          {/* Pit box */}
          <rect x={278} y={294} width={44} height={10} rx={2}
            fill="rgba(255,215,0,0.1)" stroke="rgba(255,215,0,0.55)" strokeWidth={1} />
          <text x={300} y={302} textAnchor="middle" fill={C.yellow}
            fontSize={6.5} fontFamily="'Titillium Web'" fontWeight={700} letterSpacing={1.2}>BOX 1</text>

          <text x={422} y={283} fill="rgba(255,215,0,0.7)" fontSize={6.5} fontFamily="'Titillium Web'" fontWeight={700} letterSpacing={0.8}>PIT IN</text>
          <text x={138} y={283} fill="rgba(255,215,0,0.7)" fontSize={6.5} fontFamily="'Titillium Web'" fontWeight={700} letterSpacing={0.8}>PIT OUT</text>

          {/* S/F line */}
          <line x1={427} y1={248} x2={432} y2={260} stroke={C.white} strokeWidth={3} strokeLinecap="round" />
          <line x1={428} y1={249} x2={431} y2={259} stroke={C.red}   strokeWidth={1.5} strokeLinecap="round" />


          {/* Header */}
          <text x={12} y={22} fill={C.white} fontSize={12} fontWeight={700} fontFamily="'Titillium Web'" letterSpacing={1.5}>
            🇧🇭 BAHRAIN — Predicción entrada a pits
          </text>
          <text x={12} y={36} fill={C.gray} fontSize={9} fontFamily="'Titillium Web'">
            {phase === 'pit_stop' ? '🔧 Pit Box — Cambiando neumáticos'
              : phase !== 'racing' ? 'Pit Lane'
              : corner}
            {'  ·  Vuelta '}{lap}{` / ${GNN_PIT_LAP}`}{' del stint'}
          </text>

          {/* Countdown badge */}
          {phase === 'racing' && (
            <g>
              <rect x={12} y={42} width={pitUrgent ? 88 : 78} height={13} rx={2}
                fill={pitUrgent ? 'rgba(225,6,0,0.18)' : 'rgba(255,107,53,0.08)'}
                stroke={pitUrgent ? 'rgba(225,6,0,0.6)' : 'rgba(255,107,53,0.35)'}
                strokeWidth={0.8} />
              <text x={pitUrgent ? 56 : 51} y={52} textAnchor="middle"
                fill={pitUrgent ? C.red : C.orange}
                fontSize={7.5} fontWeight={700} fontFamily="'Titillium Web'" letterSpacing={0.8}>
                {pitUrgent
                  ? '⚠ ¡PIT ESTA VUELTA!'
                  : `PIT EN ${lapsLeft} VUELTA${lapsLeft !== 1 ? 'S' : ''}`}
              </text>
            </g>
          )}

          {/* Active pit stop banner */}
          {phase === 'pit_stop' && (
            <>
              <rect x={192} y={278} width={216} height={20} rx={3}
                fill="rgba(255,215,0,0.12)" stroke={C.yellow} strokeWidth={1} />
              <text x={300} y={292} textAnchor="middle" fill={C.yellow} fontSize={10}
                fontWeight={700} fontFamily="'Titillium Web'" letterSpacing={1.5}>
                PIT STOP · {Math.max(0, PIT_STOP_DURATION - pitTimer).toFixed(1)}s
              </text>
            </>
          )}

          {/* Loop counter */}
          <text x={548} y={22} textAnchor="end" fill={C.gray} fontSize={8} fontFamily="'Titillium Web'" letterSpacing={0.5}>
            CICLO {loop + 1}
          </text>

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
              <rect x={-9} y={-6}  width={5} height={3.5} rx={1} fill="#111" stroke="#555" strokeWidth={0.5} />
              <rect x={4}  y={-6}  width={5} height={3.5} rx={1} fill="#111" stroke="#555" strokeWidth={0.5} />
              <rect x={-9} y={2.5} width={5} height={3.5} rx={1} fill="#111" stroke="#555" strokeWidth={0.5} />
              <rect x={4}  y={2.5} width={5} height={3.5} rx={1} fill="#111" stroke="#555" strokeWidth={0.5} />
              {phase === 'pit_stop' && (
                <>
                  <rect x={-10} y={-7} width={7} height={5} rx={1.5} fill="none" stroke={COMPOUND_COLOR} strokeWidth={1.5} />
                  <rect x={3.5} y={-7} width={7} height={5} rx={1.5} fill="none" stroke={COMPOUND_COLOR} strokeWidth={1.5} />
                  <rect x={-10} y={2}  width={7} height={5} rx={1.5} fill="none" stroke={COMPOUND_COLOR} strokeWidth={1.5} />
                  <rect x={3.5} y={2}  width={7} height={5} rx={1.5} fill="none" stroke={COMPOUND_COLOR} strokeWidth={1.5} />
                </>
              )}
            </g>
          )}
        </svg>
      </div>

      {/* ── Panel de telemetría ── */}
      <div style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Neumático y desgaste — card principal */}
        <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 4, padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: C.gray, fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>NEUMÁTICO</span>
            <span style={{
              background: 'rgba(225,6,0,0.2)', color: COMPOUND_COLOR,
              fontSize: 8, fontWeight: 900, padding: '2px 7px', borderRadius: 2,
              letterSpacing: '0.08em', border: `1px solid ${COMPOUND_COLOR}55`,
            }}>{COMPOUND}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 }}>
            <span style={{ color: C.gray, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>DESGASTE</span>
            <span style={{ color: wearColor, fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{wearPct}%</span>
          </div>

          {/* Barra de desgaste 0–PIT_THRESHOLD (82%) — pit antes del 100% */}
          <div style={{ position: 'relative', paddingBottom: 14, marginBottom: 4 }}>
            <div style={{ position: 'relative', height: 7, background: C.border, borderRadius: 4 }}>
              <div style={{
                height: '100%',
                width: `${wearPct}%`,
                background: wearColor,
                borderRadius: 4,
                boxShadow: `0 0 6px ${wearColor}66`,
                transition: 'width 0.06s linear, background 0.3s',
              }} />
              <div style={{
                position: 'absolute', top: -3, left: `${PIT_THRESHOLD}%`,
                transform: 'translateX(-50%)',
                width: 2, height: 13, background: C.yellow,
                borderRadius: 1, pointerEvents: 'none',
              }} />
            </div>
            <div style={{
              position: 'absolute', bottom: 0, left: `${PIT_THRESHOLD}%`,
              transform: 'translateX(-50%)',
              color: C.yellow, fontSize: 7, fontWeight: 700,
              whiteSpace: 'nowrap', letterSpacing: '0.05em',
            }}>▲ PIT {PIT_THRESHOLD}%</div>
          </div>

          {/* Countdown */}
          <div style={{
            background: pitUrgent ? 'rgba(225,6,0,0.12)' : 'rgba(255,215,0,0.07)',
            border: `1px solid ${pitUrgent ? C.red : C.yellow}40`,
            borderRadius: 3, padding: '7px 10px', textAlign: 'center',
          }}>
            {phase === 'racing' ? (
              <>
                <div style={{ color: C.gray, fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
                  Pit predicho por GNN
                </div>
                <div style={{ color: pitUrgent ? C.red : C.yellow, fontSize: 20, fontWeight: 900, lineHeight: 1 }}>
                  {pitUrgent ? '¡AHORA!' : `${lapsLeft} vuelta${lapsLeft !== 1 ? 's' : ''}`}
                </div>
              </>
            ) : phase === 'pit_stop' ? (
              <>
                <div style={{ color: C.gray, fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
                  Tiempo en boxes
                </div>
                <div style={{ color: C.yellow, fontSize: 20, fontWeight: 900, lineHeight: 1 }}>
                  {Math.min(pitTimer, PIT_STOP_DURATION).toFixed(1)}s
                </div>
              </>
            ) : (
              <div style={{ color: C.orange, fontSize: 10, fontWeight: 700 }}>
                {phase === 'pit_entry' ? 'Entrando a boxes...' : 'Saliendo de boxes...'}
              </div>
            )}
          </div>
        </div>

        {/* Stint / vuelta */}
        <div style={{
          background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 4,
          padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ color: C.gray, fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>VUELTA STINT</div>
            <div style={{ color: C.gray, fontSize: 8, marginTop: 3 }}>Ciclo {loop + 1} de simulación</div>
          </div>
          <span style={{ color: C.white, fontSize: 28, fontWeight: 900, lineHeight: 1 }}>
            {lap}<span style={{ color: C.gray, fontSize: 12, fontWeight: 400 }}> /V{GNN_PIT_LAP}</span>
          </span>
        </div>

        {/* Card GNN */}
        <div style={{ background: 'rgba(225,6,0,0.06)', border: `1px solid rgba(225,6,0,0.25)`, borderRadius: 4, padding: '12px 14px' }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: C.gray, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Deg. acumulada (GNN)</div>
            <span style={{ color: C.orange, fontSize: 20, fontWeight: 900, lineHeight: 1 }}>
              {gnnCum.toFixed(3)}s
            </span>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ color: C.gray, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
              Pit derivado del GNN
            </div>
            <div style={{ color: C.gray, fontSize: 7, marginBottom: 4 }}>
              pico de deg. acumulada
            </div>
            <span style={{ color: C.yellow, fontSize: 20, fontWeight: 900, lineHeight: 1 }}>
              V{GNN_PIT_LAP}
            </span>
            <span style={{ color: C.gray, fontSize: 9, marginLeft: 6 }}>
              ({GNN_PIT_CUM.toFixed(3)}s)
            </span>
          </div>

        </div>
      </div>
    </div>
  )
}
