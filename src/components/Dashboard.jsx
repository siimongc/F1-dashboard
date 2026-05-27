import { useState } from 'react'
import tracksData from '../data/tracks.json'
import MetricCard       from './MetricCard'
import TrackSelector    from './TrackSelector'
import ComparisonChart  from './ComparisonChart'
import RadarPerformance from './RadarPerformance'
import TrainingCurves   from './TrainingCurves'
import TrainingParams   from './TrainingParams'
import ConfusionMatrix  from './ConfusionMatrix'

const TABS = [
  { id: 'overview',   label: 'OVERVIEW'         },
  { id: 'training',   label: 'TRAINING'          },
  { id: 'confusion',  label: 'CONFUSION MATRIX'  },
]

const KPI = [
  { key: 'accuracy',  label: 'ACCURACY',  format: 'pct'                 },
  { key: 'precision', label: 'PRECISION', format: 'pct'                 },
  { key: 'recall',    label: 'RECALL',    format: 'pct'                 },
  { key: 'f1_score',  label: 'F1 SCORE',  format: 'pct'                 },
  { key: 'auc_roc',   label: 'AUC-ROC',   format: 'pct'                 },
  { key: 'log_loss',  label: 'LOG LOSS',  format: 'dec', inverse: true  },
]

const today = new Date().toLocaleDateString('en-US', {
  year: 'numeric', month: 'long', day: 'numeric',
})

export default function Dashboard() {
  const [trackId, setTrackId]   = useState('monaco')
  const [activeTab, setTab]     = useState('overview')

  const track = tracksData.tracks.find((t) => t.id === trackId)

  const handleTrackChange = (id) => setTrackId(id)
  const handleTabChange   = (id) => setTab(id)

  return (
    <div style={{ background: '#15151E', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top gradient stripe ── */}
      <div style={{
        height: '3px', flexShrink: 0,
        background: 'linear-gradient(90deg, #E10600 0%, #FF6B35 100%)',
      }} />

      {/* ── Header ── */}
      <header style={{
        background: '#1E1E2E',
        borderBottom: '1px solid #2A2A40',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #E10600, #FF6B35)',
            width: '42px', height: '42px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '4px',
            fontSize: '13px', fontWeight: '900', letterSpacing: '1px', color: '#fff',
            flexShrink: 0,
          }}>
            ML
          </div>

          <div>
            <div style={{
              fontSize: '20px', fontWeight: '700', letterSpacing: '1.5px',
              color: '#FFFFFF', lineHeight: 1, textTransform: 'uppercase',
            }}>
              Model Performance Telemetry
            </div>
            <div style={{
              fontSize: '11px', letterSpacing: '2px', color: '#8B8BA3',
              marginTop: '4px', textTransform: 'uppercase',
            }}>
              {track.model} · {track.name}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="status-dot" style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#00D27A',
            boxShadow: '0 0 8px #00D27A, 0 0 16px rgba(0,210,122,0.4)',
          }} />
          <span style={{
            fontSize: '11px', fontWeight: '600', letterSpacing: '2px',
            color: '#00D27A', textTransform: 'uppercase',
          }}>
            MODEL OPTIMIZED
          </span>
        </div>
      </header>

      {/* ── Track selector ── */}
      <div style={{
        background: '#1E1E2E',
        borderBottom: '1px solid #2A2A40',
        padding: '10px 24px',
        flexShrink: 0,
      }}>
        <TrackSelector
          tracks={tracksData.tracks}
          selected={trackId}
          onChange={handleTrackChange}
        />
      </div>

      {/* ── Tab navigation ── */}
      <div style={{
        background: '#1E1E2E',
        borderBottom: '1px solid #2A2A40',
        padding: '0 24px',
        display: 'flex',
        flexShrink: 0,
      }}>
        {TABS.map((tab) => {
          const active = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: active ? '3px solid #E10600' : '3px solid transparent',
                color: active ? '#FFFFFF' : '#8B8BA3',
                padding: '13px 20px',
                fontSize: '11px', fontWeight: '700', letterSpacing: '2px',
                cursor: 'pointer',
                fontFamily: "'Titillium Web', sans-serif",
                textTransform: 'uppercase',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab content ── */}
      <main
        key={`${trackId}::${activeTab}`}
        className="anim-fade-slide"
        style={{ padding: '24px', flex: 1 }}
      >

        {activeTab === 'overview' && (
          <div>
            {/* KPI grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
              gap: '14px',
              marginBottom: '20px',
            }}>
              {KPI.map((m) => (
                <MetricCard
                  key={`${trackId}-${m.key}`}
                  label={m.label}
                  value={track.after[m.key]}
                  prevValue={track.before[m.key]}
                  format={m.format}
                  inverse={m.inverse}
                />
              ))}
            </div>

            {/* Charts */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
              gap: '16px',
            }}>
              <ComparisonChart
                key={`cmp-${trackId}`}
                before={track.before}
                after={track.after}
              />
              <RadarPerformance
                key={`radar-${trackId}`}
                before={track.before}
                after={track.after}
              />
            </div>
          </div>
        )}

        {activeTab === 'training' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <TrainingCurves
              key={`curves-${trackId}`}
              history={track.training.history}
            />
            <TrainingParams params={track.training.params} />
          </div>
        )}

        {activeTab === 'confusion' && (
          <ConfusionMatrix
            key={`cm-${trackId}`}
            confusionBefore={track.confusion_before}
            confusionAfter={track.confusion_after}
            before={track.before}
            after={track.after}
          />
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={{
        background: '#1E1E2E',
        borderTop: '1px solid #2A2A40',
        padding: '10px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: '10px', fontWeight: '700', letterSpacing: '2px',
          color: '#8B8BA3', textTransform: 'uppercase',
        }}>
          ML TELEMETRY DASHBOARD v1.0
        </span>
        <span style={{
          fontSize: '10px', letterSpacing: '1px',
          color: '#8B8BA3', textTransform: 'uppercase',
        }}>
          LAST UPDATED: {today}
        </span>
      </footer>

    </div>
  )
}
