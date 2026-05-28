const C = {
  red:       '#E10600',
  yellow:    '#FFD700',
  green:     '#00D27A',
  orange:    '#FF6B35',
  gray:      '#8B8BA3',
  border:    '#2A2A40',
  surfaceAlt:'#252538',
  white:     '#FFFFFF',
  lightGray: '#C4C4D4',
}

function ParamGroup({ title, color, items }) {
  return (
    <div style={{
      background: C.surfaceAlt,
      border: `1px solid ${C.border}`,
      borderRadius: 4,
      padding: '14px 16px',
      flex: '1 1 220px',
    }}>
      <div style={{
        color: color,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        marginBottom: 12,
        borderBottom: `1px solid ${C.border}`,
        paddingBottom: 6,
        fontFamily: "'Titillium Web', sans-serif",
      }}>
        {title}
      </div>
      {items.map(({ label, value }) => (
        <div key={label} style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
          gap: 12,
          fontFamily: "'Titillium Web', sans-serif",
        }}>
          <span style={{ color: C.gray, fontSize: 11, letterSpacing: '0.04em', flexShrink: 0 }}>{label}</span>
          <span style={{ color: C.white, fontSize: 12, fontWeight: 700, textAlign: 'right' }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

export default function TrainingParams({ params }) {
  const groups = [
    {
      title: 'ARQUITECTURA',
      color: C.red,
      items: [
        { label: 'Modelo',         value: params.architecture },
        { label: 'Hidden Dim',     value: params.hidden_dim },
        { label: 'Attn Heads',     value: params.gat_heads },
        { label: 'GNN Layers',     value: params.gnn_layers },
        { label: 'Dropout',        value: params.dropout },
      ],
    },
    {
      title: 'OPTIMIZACIÓN',
      color: C.orange,
      items: [
        { label: 'Optimizer',      value: params.optimizer },
        { label: 'Loss Fn',        value: `Huber (δ=${params.huber_delta})` },
        { label: 'LR Inicial',     value: '1×10⁻³' },
        { label: 'LR Schedule',    value: params.lr_schedule },
        { label: 'Epochs',         value: params.epochs },
      ],
    },
    {
      title: 'DATOS',
      color: C.green,
      items: [
        { label: 'Circuitos',      value: params.circuits },
        { label: 'Total Grafos',   value: params.total_graphs },
        { label: 'Split',          value: 'LOCO CV' },
        { label: 'Target',         value: 'Deg. Rate (s/lap)' },
        { label: 'Features',       value: 'Lap, Compound, Stint…' },
      ],
    },
  ]

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontFamily: "'Titillium Web', sans-serif" }}>
      {groups.map(g => (
        <ParamGroup key={g.title} title={g.title} color={g.color} items={g.items} />
      ))}
    </div>
  )
}
