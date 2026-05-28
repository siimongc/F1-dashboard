import bahrainMap   from '../assets/bahrain_map.png'
import belgiumMap   from '../assets/belgium_map.png'
import canadaMap    from '../assets/canada_map.png'
import singaporeMap from '../assets/singapure_map.png'

const C = {
  red:       '#E10600',
  green:     '#00D27A',
  yellow:    '#FFD700',
  orange:    '#FF6B35',
  surface:   '#1E1E2E',
  surfaceAlt:'#252538',
  border:    '#2A2A40',
  white:     '#FFFFFF',
  gray:      '#8B8BA3',
  lightGray: '#C4C4D4',
}

const TRACK_MAPS = {
  bahrain:   bahrainMap,
  belgium:   belgiumMap,
  canada:    canadaMap,
  singapore: singaporeMap,
}

function r2Color(r2) {
  if (r2 > 0.90) return C.green
  if (r2 > 0.80) return C.yellow
  return C.orange
}

export default function TrackSelector({ circuits, selected, onSelect }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gap: 8,
      fontFamily: "'Titillium Web', sans-serif",
    }}>
      {circuits.map((c) => {
        const isActive = selected === c.id
        const color    = r2Color(c.gnn.r2)
        const map      = TRACK_MAPS[c.id]

        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            style={{
              background: isActive ? 'rgba(225,6,0,0.12)' : C.surfaceAlt,
              border: `1px solid ${isActive ? C.red : C.border}`,
              borderRadius: 4,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'all 0.18s ease',
              boxShadow: isActive ? `0 0 10px rgba(225,6,0,0.30)` : 'none',
              outline: 'none',
              overflow: 'hidden',
              position: 'relative',
              padding: 0,
            }}
          >
            {/* red left accent on active */}
            {isActive && (
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
                background: C.red, zIndex: 1,
              }} />
            )}

            {map ? (
              /* ── card with circuit map ── */
              <>
                <div style={{
                  width: '100%',
                  padding: '10px 8px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                }}>
                  <img
                    src={map}
                    alt={c.name}
                    style={{
                      width: '100%',
                      height: 52,
                      objectFit: 'contain',
                      opacity: isActive ? 1 : 0.6,
                      filter: isActive
                        ? 'brightness(1.2) drop-shadow(0 0 4px rgba(225,6,0,0.5))'
                        : 'brightness(1.0)',
                      transition: 'opacity 0.18s ease, filter 0.18s ease',
                    }}
                  />
                </div>
                <div style={{
                  width: '100%',
                  padding: '5px 6px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  borderTop: `1px solid ${isActive ? 'rgba(225,6,0,0.25)' : C.border}`,
                  background: isActive ? 'rgba(225,6,0,0.06)' : 'rgba(0,0,0,0.18)',
                }}>
                  <span style={{
                    color: isActive ? C.white : C.lightGray,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    lineHeight: 1,
                  }}>
                    {c.flag} {c.code}
                  </span>
                  <span style={{
                    color,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    lineHeight: 1,
                  }}>
                    R² {c.gnn.r2.toFixed(3)}
                  </span>
                </div>
              </>
            ) : (
              /* ── compact card without map ── */
              <div style={{
                width: '100%',
                height: '100%',
                padding: '10px 6px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
              }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{c.flag}</span>
                <span style={{
                  color: isActive ? C.white : C.lightGray,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  lineHeight: 1,
                }}>
                  {c.code}
                </span>
                <span style={{
                  color: C.gray,
                  fontSize: 9,
                  fontWeight: 400,
                  letterSpacing: '0.03em',
                  lineHeight: 1.2,
                  textAlign: 'center',
                  maxWidth: 70,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {c.name}
                </span>
                <span style={{
                  color,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  lineHeight: 1,
                }}>
                  R² {c.gnn.r2.toFixed(3)}
                </span>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
