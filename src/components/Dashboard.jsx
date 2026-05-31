import { useState } from 'react'
import tracksData        from '../data/tracks.json'
import GaugeCard         from './GaugeCard'
import TrackSelector     from './TrackSelector'
import CircuitComparison from './CircuitComparison'
import StrategyStory from './StrategyStory'
import BahrainTrackAnim  from './BahrainTrackAnim'
import f1Logo            from '../assets/f1_logo.png'
import f1Car             from '../assets/esqueletof1.webp'

const C = {
  red:        '#E10600',
  orange:     '#FF6B35',
  green:      '#00D27A',
  yellow:     '#FFD700',
  gray:       '#8B8BA3',
  border:     '#2A2A40',
  bg:         '#15151E',
  surface:    '#1E1E2E',
  surfaceAlt: '#252538',
  white:      '#FFFFFF',
  lightGray:  '#C4C4D4',
}

const TABS = ['OVERVIEW', 'CIRCUITOS', 'SIMULACIÓN', 'ESTRATEGIA']

// Small info card
function InfoCard({ label, value, color, sub }) {
  return (
    <div style={{
      background: C.surfaceAlt,
      border: `1px solid ${C.border}`,
      borderRadius: 4,
      padding: '12px 16px',
      flex: '1 1 140px',
      fontFamily: "'Titillium Web', sans-serif",
      textAlign: 'center',
    }}>
      <div style={{ color: color || C.white, fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{value}</div>
      <div style={{ color: C.gray, fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginTop: 5 }}>{label}</div>
      {sub && <div style={{ color: C.gray, fontSize: 10, marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const { meta, circuits, training, monte_carlo } = tracksData
  const [activeTab, setActiveTab] = useState('OVERVIEW')
  const [trackId, setTrackId]     = useState('british')

  const track = circuits.find(c => c.id === trackId) || circuits[0]

  const maePct = track
    ? ((track.xgb.mae - track.gnn.mae) / track.xgb.mae * 100).toFixed(1)
    : '—'

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      fontFamily: "'Titillium Web', sans-serif",
      color: C.white,
    }}>
      {/* 3px gradient top bar */}
      <div style={{
        height: 3,
        background: `linear-gradient(90deg, ${C.red} 0%, ${C.orange} 100%)`,
      }} />

      {/* Header */}
      <header style={{
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        flexWrap: 'wrap',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* F1 official logo badge */}
        <div style={{
          background: C.white,
          borderRadius: 3,
          padding: '3px 7px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          zIndex: 1,
        }}>
          <img src={f1Logo} alt="Formula 1" style={{ display: 'block', height: 18, width: 'auto' }} />
        </div>

        {/* Title block */}
        <div style={{ flex: 1, minWidth: 200, zIndex: 1 }}>
          <div style={{
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: C.white,
            lineHeight: 1,
          }}>
            APEXSTRATEGY AI
          </div>
          <div style={{ color: C.gray, fontSize: 11, marginTop: 3, letterSpacing: '0.06em' }}>
            GNN GAT v5.1 · Predicción Degradación Neumáticos
          </div>
        </div>

        {/* Blueprint F1 car — ghost watermark */}
        <img
          src={f1Car}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 120,
            top: '50%',
            transform: 'translateY(-50%) rotate(-5deg)',
            height: 170,
            opacity: 0.08,
            filter: 'invert(1) brightness(1.4)',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0,
          }}
        />

        {/* Status dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, zIndex: 1 }}>
          <span className="status-dot" style={{
            display: 'inline-block', width: 8, height: 8,
            borderRadius: '50%', background: C.green,
            boxShadow: `0 0 6px ${C.green}`,
          }} />
          <span style={{ color: C.green, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>LIVE</span>
        </div>
      </header>

      {/* Tabs */}
      <nav style={{
        padding: '16px 24px 0',
        display: 'flex',
        gap: 2,
        borderBottom: `1px solid ${C.border}`,
        marginTop: 16,
      }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? C.red : 'transparent',
              border: 'none',
              borderRadius: '2px 2px 0 0',
              padding: '8px 20px',
              color: activeTab === tab ? C.white : C.gray,
              fontFamily: "'Titillium Web', sans-serif",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              outline: 'none',
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <main
        key={trackId + activeTab}
        className="anim-fade-slide"
        style={{ padding: '24px' }}
      >
        {/* ─── OVERVIEW ─── */}
        {activeTab === 'OVERVIEW' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <section>
              <div style={{ color: C.gray, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
                SELECCIONAR CIRCUITO
              </div>
              <TrackSelector circuits={circuits} selected={trackId} onSelect={setTrackId} />
            </section>

            <section>
              <div style={{ color: C.gray, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
                {track.flag} {track.name.toUpperCase()} — MÉTRICAS DEL MODELO
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <GaugeCard
                  key={trackId + 'gnn_r2'}
                  label="R² GNN GAT v5.1"
                  value={track.gnn.r2}
                  prevValue={track.xgb.r2}
                  format="r2"
                  showPrev
                />
                <GaugeCard
                  key={trackId + 'gnn_mae'}
                  label="MAE GNN (s)"
                  value={track.gnn.mae}
                  prevValue={track.xgb.mae}
                  format="mae"
                  maxScale={2.0}
                  showPrev
                />
                <GaugeCard
                  key={trackId + 'xgb_r2'}
                  label="R² XGBoost"
                  value={track.xgb.r2}
                  format="r2"
                  showPrev={false}
                />
                <GaugeCard
                  key={trackId + 'xgb_mae'}
                  label="MAE XGBoost (s)"
                  value={track.xgb.mae}
                  format="mae"
                  maxScale={9.0}
                  showPrev={false}
                />
              </div>
            </section>

            <section>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <InfoCard
                  label="Mejora MAE"
                  value={maePct + '%'}
                  color={C.green}
                  sub={`${track.xgb.mae.toFixed(3)}s → ${track.gnn.mae.toFixed(3)}s`}
                />
                <InfoCard
                  label="Grafos de entrenamiento"
                  value={track.gnn.n_graphs}
                  color={C.orange}
                  sub="sesiones de carrera"
                />
              </div>
            </section>
          </div>
        )}

        {/* ─── SIMULACIÓN ─── */}
        {activeTab === 'SIMULACIÓN' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ color: C.gray, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
                SIMULACIÓN EN VIVO · BAHRAIN GP
              </div>
              <div style={{ color: C.gray, fontSize: 11 }}>
                Telemetría generada por el modelo GNN GAT v5.1 · desgaste de neumáticos, velocidad y sector en tiempo real
              </div>
            </div>
            <BahrainTrackAnim />
          </div>
        )}

        {/* ─── CIRCUITOS ─── */}
        {activeTab === 'CIRCUITOS' && (
          <CircuitComparison circuits={circuits} />
        )}

        {/* ─── ESTRATEGIA ─── */}
        {activeTab === 'ESTRATEGIA' && (
          <StrategyStory />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${C.border}`,
        padding: '12px 24px',
        textAlign: 'center',
        color: C.gray,
        fontSize: 10,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginTop: 'auto',
      }}>
        APEXSTRATEGY AI · GNN GAT v5.1 · MAESTRÍA EN CIENCIA DE DATOS · EAFIT 2026
      </footer>
    </div>
  )
}
