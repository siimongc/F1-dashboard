export default function TrainingParams({ params }) {
  const rows = [
    { label: 'ARCHITECTURE',     value: params.architecture },
    { label: 'OPTIMIZER',        value: params.optimizer },
    { label: 'LEARNING RATE',    value: params.lr },
    { label: 'BATCH SIZE',       value: params.batch_size },
    { label: 'EPOCHS',           value: params.epochs },
    { label: 'DROPOUT',          value: params.dropout },
    { label: 'FEATURES',         value: params.features },
    { label: 'TRAINING SAMPLES', value: params.train_size?.toLocaleString() },
  ]

  return (
    <div style={{
      background: '#1E1E2E',
      border: '1px solid #2A2A40',
      borderRadius: '4px',
      padding: '24px',
    }}>
      <div style={{
        fontSize: '11px', fontWeight: '600', letterSpacing: '2px',
        color: '#8B8BA3', textTransform: 'uppercase', marginBottom: '20px',
      }}>
        TRAINING PARAMETERS
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '2px',
        background: '#2A2A40',
        border: '1px solid #2A2A40',
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        {rows.map(({ label, value }) => (
          <div key={label} style={{ background: '#1E1E2E', padding: '14px 16px' }}>
            <div style={{
              fontSize: '10px', fontWeight: '700', letterSpacing: '2px',
              color: '#8B8BA3', textTransform: 'uppercase', marginBottom: '5px',
            }}>
              {label}
            </div>
            <div style={{
              fontSize: '16px', fontWeight: '600', color: '#FFFFFF',
              fontFamily: "'Rajdhani', 'Titillium Web', sans-serif",
            }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
