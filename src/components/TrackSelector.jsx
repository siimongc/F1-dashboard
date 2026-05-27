export default function TrackSelector({ tracks, selected, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <span style={{
        fontSize: '10px',
        fontWeight: '700',
        letterSpacing: '2px',
        color: '#8B8BA3',
        textTransform: 'uppercase',
        marginRight: '4px',
        whiteSpace: 'nowrap',
      }}>
        CIRCUIT
      </span>

      {tracks.map((track) => {
        const active = track.id === selected
        return (
          <button
            key={track.id}
            onClick={() => onChange(track.id)}
            style={{
              background: active ? '#252538' : 'transparent',
              border: `1px solid ${active ? '#E10600' : '#2A2A40'}`,
              boxShadow: active ? '0 0 14px rgba(225,6,0,0.3), inset 0 0 6px rgba(225,6,0,0.05)' : 'none',
              borderRadius: '4px',
              padding: '7px 16px',
              cursor: 'pointer',
              fontFamily: "'Titillium Web', sans-serif",
              textAlign: 'left',
              transition: 'all 0.18s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '1px',
            }}
          >
            <span style={{
              fontSize: '9px',
              fontWeight: '700',
              letterSpacing: '2px',
              color: active ? '#E10600' : '#8B8BA3',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}>
              {track.id}
            </span>
            <span style={{
              fontSize: '12px',
              fontWeight: '600',
              letterSpacing: '1px',
              color: active ? '#FFFFFF' : '#8B8BA3',
              textTransform: 'uppercase',
              lineHeight: 1.2,
            }}>
              {track.name}
            </span>
            <span style={{
              fontSize: '10px',
              color: active ? '#C4C4D4' : '#6B6B83',
              letterSpacing: '0.5px',
              lineHeight: 1,
            }}>
              {track.model}
            </span>
          </button>
        )
      })}
    </div>
  )
}
