import { useEffect, useRef, useState } from 'react'

const C = {
  red:       '#E10600',
  orange:    '#FF6B35',
  yellow:    '#FFD700',
  green:     '#00D27A',
  cyan:      '#00E5FF',
  gray:      '#8B8BA3',
  surface:   '#1E1E2E',
  surfaceAlt:'#252538',
  border:    '#2A2A40',
  white:     '#FFFFFF',
  lightGray: '#C4C4D4',
}

function useCountUp(target, duration = 700) {
  const [val, setVal] = useState(target)
  const frame = useRef(null)
  const start = useRef(null)
  const from  = useRef(target)

  useEffect(() => {
    from.current = val
    start.current = null
    if (frame.current) cancelAnimationFrame(frame.current)
    const tick = (ts) => {
      if (!start.current) start.current = ts
      const progress = Math.min((ts - start.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setVal(from.current + (target - from.current) * eased)
      if (progress < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration])

  return val
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  const toRad = (d) => (d * Math.PI) / 180
  const sx = cx + r * Math.cos(toRad(startDeg))
  const sy = cy + r * Math.sin(toRad(startDeg))
  const ex = cx + r * Math.cos(toRad(endDeg))
  const ey = cy + r * Math.sin(toRad(endDeg))
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`
}

function arcColor(fill) {
  if (fill > 0.85) return C.red
  if (fill > 0.65) return C.orange
  if (fill > 0.40) return C.yellow
  return C.gray
}

export default function GaugeCard({ label, value, prevValue, format = 'r2', maxScale, showPrev = false }) {
  const animated = useCountUp(value, 700)

  const fill = format === 'r2'
    ? Math.max(0, Math.min(1, animated))
    : Math.max(0, 1 - animated / maxScale)

  const color = arcColor(fill)

  const START_DEG = 145
  const END_DEG   = 395
  const sweep     = (END_DEG - START_DEG) * fill
  const cx = 80, cy = 80, R = 58

  const trackPath = arcPath(cx, cy, R, START_DEG, END_DEG)
  const fillPath  = fill > 0.001 ? arcPath(cx, cy, R, START_DEG, START_DEG + sweep) : null

  const isNegativeR2 = format === 'r2' && value < 0

  let displayVal
  if (format === 'r2') displayVal = value.toFixed(3)
  else displayVal = value.toFixed(3) + 's'

  let delta = null
  let deltaLabel = null
  let deltaColor = C.gray
  if (showPrev && prevValue != null) {
    if (format === 'r2') {
      delta = value - prevValue
      const sign = delta >= 0 ? '+' : '−'
      const icon = delta >= 0 ? '▲' : '▼'
      deltaLabel = `${icon} ${sign}${Math.abs(delta).toFixed(3)}`
      deltaColor = delta >= 0 ? C.green : C.red
    } else {
      const pct = ((prevValue - value) / prevValue) * 100
      const icon = pct >= 0 ? '▲' : '▼'
      const sign = pct >= 0 ? '−' : '+'
      deltaLabel = `${icon} ${sign}${Math.abs(pct).toFixed(1)}%`
      deltaColor = pct >= 0 ? C.green : C.red
    }
  }

  return (
    <div style={{
      background: C.surfaceAlt,
      border: `1px solid ${C.border}`,
      borderRadius: 4,
      padding: '16px 12px 12px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: "'Titillium Web', sans-serif",
      minWidth: 140,
      flex: '1 1 140px',
    }}>
      <svg viewBox="0 0 160 100" width="100%" style={{ maxWidth: 160, overflow: 'visible' }}>
        {/* track */}
        <path d={trackPath} fill="none" stroke={C.border} strokeWidth={10} strokeLinecap="round" />
        {/* fill */}
        {fillPath && (
          <path d={fillPath} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${color}88)` }} />
        )}
        {/* center value */}
        {isNegativeR2 ? (
          <>
            <text x={cx} y={cy - 6} textAnchor="middle" fill={C.red}
              style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Titillium Web', sans-serif" }}>
              {value.toFixed(3)}
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" fill={C.red}
              style={{ fontSize: 9, fontWeight: 600, fontFamily: "'Titillium Web', sans-serif" }}>
              NEGATIVO
            </text>
          </>
        ) : (
          <text x={cx} y={cy + 6} textAnchor="middle" fill={C.white}
            style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Titillium Web', sans-serif" }}>
            {displayVal}
          </text>
        )}
        {/* min/max ticks */}
        <text x={29} y={90} textAnchor="middle" fill={C.gray}
          style={{ fontSize: 8, fontFamily: "'Titillium Web', sans-serif" }}>
          {format === 'r2' ? '−1' : '0'}
        </text>
        <text x={131} y={90} textAnchor="middle" fill={C.gray}
          style={{ fontSize: 8, fontFamily: "'Titillium Web', sans-serif" }}>
          {format === 'r2' ? '1' : `${maxScale}s`}
        </text>
      </svg>

      <div style={{ marginTop: 4, textAlign: 'center' }}>
        <div style={{ color: C.lightGray, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {label}
        </div>
        {deltaLabel && (
          <div style={{ color: deltaColor, fontSize: 11, fontWeight: 700, marginTop: 4, letterSpacing: '0.04em' }}>
            {deltaLabel}
          </div>
        )}
      </div>
    </div>
  )
}
