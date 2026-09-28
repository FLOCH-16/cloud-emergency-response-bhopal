import React from 'react'
import {
  X,
  TrendingUp,
  PackageCheck,
  Network,
  Cpu,
  Layers,
  ShieldAlert,
  ArrowRight
} from 'lucide-react'

export function FutureWorkModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{ maxWidth: '820px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} className="text-dispatched" />
            <h3 style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.04em' }}>
              FUTURE ARCHITECTURE // ROADMAP SLIDE (NON-DEPLOYED SCOPE)
            </h3>
          </div>
          <button className="btn btn-sm" onClick={onClose} style={{ padding: '2px 6px' }}>
            <X size={14} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '24px' }}>
          {/* Executive Subtitle */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Next-Gen Emergency Dispatch & Resource Optimization
            </div>
            <p className="text-muted" style={{ fontSize: '12px', lineHeight: '1.5' }}>
              The current Phase 1 implementation delivers locked core operations: deterministic CAD dispatch, rule-based triage, hospital bed matching, and traffic signal preemption simulation. The roadmap below outlines production extensions without expanding immediate demo surface area.
            </p>
          </div>

          {/* Three Future Work Pillars */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
            {/* Pillar 1: Predictive Risk */}
            <div style={{
              background: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ padding: '6px', background: 'rgba(229, 72, 77, 0.1)', borderRadius: '3px', color: '#E5484D' }}>
                  <TrendingUp size={16} />
                </div>
                <div style={{ fontWeight: 600, fontSize: '12px' }}>01. Spatiotemporal Risk Prediction</div>
              </div>
              <p className="text-muted" style={{ fontSize: '11px', lineHeight: '1.4', flex: 1 }}>
                Deep learning models trained on 10+ years of 911 historical cadences, weather variables, traffic congestion, and venue events to dynamically reposition ambulances into predictive hotspot coverage zones (System Status Management) before 911 calls are dialed.
              </p>
              <div className="font-mono text-dim" style={{ fontSize: '10px', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                STATUS: RESEARCH SPEC
              </div>
            </div>

            {/* Pillar 2: Restocking */}
            <div style={{
              background: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ padding: '6px', background: 'rgba(63, 182, 139, 0.1)', borderRadius: '3px', color: '#3FB68B' }}>
                  <PackageCheck size={16} />
                </div>
                <div style={{ fontWeight: 600, fontSize: '12px' }}>02. Automated IoT Restocking</div>
              </div>
              <p className="text-muted" style={{ fontSize: '11px', lineHeight: '1.4', flex: 1 }}>
                Telemetry tracking of vital pharmaceuticals (epinephrine, narcan, blood packs) and oxygen tanks inside vehicles. Automatically queues warehouse replenishment packages at the receiving hospital dock during transit, slashing turnaround time from 28m to &lt;9m.
              </p>
              <div className="font-mono text-dim" style={{ fontSize: '10px', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                STATUS: HARDWARE PROTO
              </div>
            </div>

            {/* Pillar 3: Multi-Agency CAD */}
            <div style={{
              background: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ padding: '6px', background: 'rgba(56, 139, 253, 0.1)', borderRadius: '3px', color: '#388BFD' }}>
                  <Network size={16} />
                </div>
                <div style={{ fontWeight: 600, fontSize: '12px' }}>03. Multi-Agency Mutual Aid</div>
              </div>
              <p className="text-muted" style={{ fontSize: '11px', lineHeight: '1.4', flex: 1 }}>
                NENA / APCO compliant CAD-to-CAD protocol federation enabling instant mutual aid dispatch across county lines, municipal police departments, Department of Transportation (Caltrans/MTA), and state emergency operations centers without phone dispatch delay.
              </p>
              <div className="font-mono text-dim" style={{ fontSize: '10px', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                STATUS: INTERFACE DESIGN
              </div>
            </div>
          </div>

          {/* Architecture Rationale Callout */}
          <div style={{
            background: 'var(--bg-panel-secondary)',
            border: '1px solid var(--border-color)',
            padding: '12px 16px',
            borderRadius: '4px',
            fontSize: '11px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: 'var(--text-primary)', fontWeight: 600 }}>
              <Cpu size={14} className="text-dispatched" />
              <span>Architectural Rationale: Frontend-Direct Firestore Architecture</span>
            </div>
            <p className="text-muted" style={{ margin: 0, lineHeight: '1.45' }}>
              Notice the absence of an intermediary Express / Node API server. For high-reliability field dispatch and operational resilience, client-side React directly interacts with Firebase Firestore real-time snapshot sockets. Removing a custom backend tier reduces infrastructure attack surface, prevents single-point-of-failure bottlenecks, and guarantees zero cold-start latency.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            RETURN TO LIVE CONSOLE
          </button>
        </div>
      </div>
    </div>
  )
}
