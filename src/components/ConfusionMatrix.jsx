function Cell({ value, label, textColor, bgColor }) {
  return (
    <div style={{
      background: bgColor,
      border: '1px solid #2A2A40',
      borderRadius: '4px',
      padding: '18px 12px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      minHeight: '80px',
    }}>
      <div style={{
        fontSize: '30px', fontWeight: '700', color: textColor,
        lineHeight: 1, fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      <div style={{ fontSize: '10px', letterSpacing: '2px', color: '#8B8BA3', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  )
}

function Matrix({ confusion, title }) {
  const total = confusion.tp + confusion.fp + confusion.fn + confusion.tn
  const pctTP = ((confusion.tp / total) * 100).toFixed(0)
  const pctTN = ((confusion.tn / total) * 100).toFixed(0)

  return (
    <div style={{ background: '#1E1E2E', border: '1px solid #2A2A40', borderRadius: '4px', padding: '24px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px',
      }}>
        <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '2px', color: '#8B8BA3', textTransform: 'uppercase' }}>
          {title}
        </span>
        <span style={{ fontSize: '11px', letterSpacing: '1px', color: '#C4C4D4' }}>
          n = {total} · acc {((confusion.tp + confusion.tn) / total * 100).toFixed(0)}%
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 1fr', gap: '6px', alignItems: 'center' }}>
        {/* header row */}
        <div />
        <div style={{ textAlign: 'center', fontSize: '10px', letterSpacing: '1.5px', color: '#8B8BA3', textTransform: 'uppercase', paddingBottom: '4px' }}>
          PRED POS
        </div>
        <div style={{ textAlign: 'center', fontSize: '10px', letterSpacing: '1.5px', color: '#8B8BA3', textTransform: 'uppercase', paddingBottom: '4px' }}>
          PRED NEG
        </div>

        {/* row 1 */}
        <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: '#8B8BA3', textTransform: 'uppercase', textAlign: 'right', paddingRight: '6px' }}>
          ACT POS
        </div>
        <Cell value={confusion.tp} label={`TP · ${pctTP}%`} textColor="#00D27A" bgColor="rgba(0,210,122,0.07)" />
        <Cell value={confusion.fn} label="FN"                textColor="#FFD700"  bgColor="rgba(255,215,0,0.06)" />

        {/* row 2 */}
        <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: '#8B8BA3', textTransform: 'uppercase', textAlign: 'right', paddingRight: '6px' }}>
          ACT NEG
        </div>
        <Cell value={confusion.fp} label="FP"                textColor="#E10600"  bgColor="rgba(225,6,0,0.07)" />
        <Cell value={confusion.tn} label={`TN · ${pctTN}%`} textColor="#00D27A" bgColor="rgba(0,210,122,0.07)" />
      </div>
    </div>
  )
}

function SummaryCard({ label, value, sub, accentColor }) {
  return (
    <div style={{
      background: '#1E1E2E', border: '1px solid #2A2A40',
      borderRadius: '4px', padding: '20px 20px 18px 24px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
        background: 'linear-gradient(180deg, #E10600, #FF6B35)',
        borderRadius: '4px 0 0 4px',
      }} />
      <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '2px', color: '#8B8BA3', textTransform: 'uppercase', marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{ fontSize: '32px', fontWeight: '700', color: accentColor, lineHeight: 1, marginBottom: '6px' }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: '#8B8BA3' }}>{sub}</div>
    </div>
  )
}

export default function ConfusionMatrix({ confusionBefore, confusionAfter, before, after }) {
  const fpReduced = confusionBefore.fp - confusionAfter.fp
  const fnReduced = confusionBefore.fn - confusionAfter.fn
  const msePct = ((before.mse - after.mse) / before.mse * 100).toFixed(1)
  const r2Delta = (after.r2 - before.r2 >= 0 ? '+' : '') + (after.r2 - before.r2).toFixed(3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px',
      }}>
        <Matrix confusion={confusionBefore} title="BASELINE MODEL" />
        <Matrix confusion={confusionAfter}  title="OPTIMIZED MODEL" />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: '16px',
      }}>
        <SummaryCard label="FALSE POSITIVES REDUCED" value={`−${fpReduced}`} sub={`${confusionBefore.fp} → ${confusionAfter.fp}`} accentColor="#00D27A" />
        <SummaryCard label="FALSE NEGATIVES REDUCED" value={`−${fnReduced}`} sub={`${confusionBefore.fn} → ${confusionAfter.fn}`} accentColor="#00D27A" />
        <SummaryCard label="MSE IMPROVEMENT"         value={`−${msePct}%`}   sub={`${before.mse} → ${after.mse}`}                  accentColor="#00E5FF" />
        <SummaryCard label="R² IMPROVEMENT"          value={r2Delta}          sub={`${before.r2} → ${after.r2}`}                    accentColor="#FFD700" />
      </div>
    </div>
  )
}
