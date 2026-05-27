import { useEffect, useRef, useState } from 'react'

function useCountUp(target, duration = 650) {
  const [value, setValue] = useState(target)
  const currentRef = useRef(target)
  const rafRef = useRef(null)

  useEffect(() => {
    const startVal = currentRef.current
    const startTime = performance.now()

    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const tick = (now) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      const current = startVal + (target - startVal) * eased
      currentRef.current = current
      setValue(current)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        currentRef.current = target
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return value
}

const S = {
  card: {
    background: 'linear-gradient(135deg, #1E1E2E 0%, #252538 100%)',
    border: '1px solid #2A2A40',
    borderRadius: '4px',
    padding: '20px 20px 18px 24px',
    position: 'relative',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s',
  },
  accent: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: '4px',
    background: 'linear-gradient(180deg, #E10600, #FF6B35)',
    borderRadius: '4px 0 0 4px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '2px',
    color: '#8B8BA3',
    textTransform: 'uppercase',
    marginBottom: '10px',
  },
  value: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 1,
    marginBottom: '10px',
    fontVariantNumeric: 'tabular-nums',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
}

export default function MetricCard({ label, value, prevValue, format, inverse }) {
  const animated = useCountUp(value)

  const raw = prevValue !== 0 ? ((value - prevValue) / Math.abs(prevValue)) * 100 : 0
  const isPositive = inverse ? raw < 0 : raw > 0
  const deltaColor = isPositive ? '#00D27A' : '#E10600'

  const fmt = (v) =>
    format === 'pct' ? (v * 100).toFixed(1) + '%' : v.toFixed(3)

  const fmtDelta = (d) => {
    const arrow = d > 0 ? '▲' : '▼'
    return `${arrow} ${Math.abs(d).toFixed(1)}%`
  }

  return (
    <div style={S.card}>
      <div style={S.accent} />
      <div style={S.label}>{label}</div>
      <div style={S.value}>{fmt(animated)}</div>
      <div style={S.footer}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: deltaColor, letterSpacing: '0.5px' }}>
          {fmtDelta(raw)}
        </span>
        <span style={{ fontSize: '11px', color: '#8B8BA3' }}>
          Antes: {fmt(prevValue)}
        </span>
      </div>
    </div>
  )
}
