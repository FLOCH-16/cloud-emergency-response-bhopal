import React, { useState } from 'react'
import {
  X,
  Database,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  ServerOff
} from 'lucide-react'
import { saveFirebaseConfig, getFirebaseMode, seedCADDatabase } from '../services/firebase.js'

export function FirebaseSettingsModal({
  isOpen,
  onClose,
  onConfigChanged,
  onReseedCompleted
}) {
  const currentMode = getFirebaseMode()
  const [apiKey, setApiKey] = useState('')
  const [projectId, setProjectId] = useState('')
  const [authDomain, setAuthDomain] = useState('')
  const [isSeeding, setIsSeeding] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  if (!isOpen) return null

  const handleSaveLiveConfig = () => {
    if (!apiKey.trim() || !projectId.trim()) {
      setStatusMsg('Please provide at least API Key and Project ID.')
      return
    }

    const config = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`
    }

    const res = saveFirebaseConfig(config)
    if (res.success) {
      setStatusMsg(`Connected to live Firebase project: ${res.projectId}`)
      onConfigChanged()
    } else {
      setStatusMsg(`Failed to connect: ${res.error}`)
    }
  }

  const handleSwitchToLocal = () => {
    saveFirebaseConfig(null)
    setStatusMsg('Switched to local in-memory reactive store.')
    onConfigChanged()
  }

  const handleReseed = async () => {
    setIsSeeding(true)
    setStatusMsg('Seeding CAD databases (units, hospitals, signals, incidents)...')
    try {
      const res = await seedCADDatabase()
      if (res.success) {
        setStatusMsg(`Successfully seeded database (${res.count} records)!`)
        onReseedCompleted()
      } else {
        setStatusMsg(`Error seeding: ${res.error}`)
      }
    } catch (e) {
      setStatusMsg(`Seeding failed: ${e.message}`)
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={16} className={currentMode === 'live' ? 'text-available' : 'text-pending'} />
            <h3 style={{ fontSize: '13px', fontWeight: 600 }}>
              FIREBASE & DATA STORE ARCHITECTURE
            </h3>
          </div>
          <button className="btn btn-sm" onClick={onClose} style={{ padding: '2px 6px' }}>
            <X size={14} />
          </button>
        </div>

        <div className="modal-body">
          {/* Current Status Box */}
          <div style={{
            background: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span className="text-muted" style={{ fontSize: '11px', fontWeight: 600 }}>CURRENT OPERATIONAL MODE:</span>
              <span className={`badge ${currentMode === 'live' ? 'badge-available' : 'badge-moderate'}`}>
                {currentMode === 'live' ? 'LIVE FIRESTORE CONNECTED' : 'LOCAL REACTIVE STORE (STANDALONE)'}
              </span>
            </div>

            <p className="text-muted" style={{ fontSize: '11px', margin: 0, lineHeight: '1.4' }}>
              {currentMode === 'live'
                ? 'Your console is listening to real-time Cloud Firestore collections via WebSockets. All movements, incidents, and capacity changes sync live across any connected client.'
                : 'Running with high-fidelity local reactive state. Perfect for local review or venue demos where conference Wi-Fi might be intermittent or blocked.'}
            </p>
          </div>

          {/* Rationale Notice */}
          <div style={{
            background: 'rgba(56, 139, 253, 0.08)',
            border: '1px solid rgba(56, 139, 253, 0.3)',
            borderRadius: '4px',
            padding: '10px 12px',
            marginBottom: '16px',
            fontSize: '11px',
            color: 'var(--text-primary)'
          }}>
            <strong>Direct Firestore Architecture Note:</strong> React communicates directly with Firestore SDK without a dedicated Express layer. This eliminates unnecessary server deployment surface, drops maintenance costs, and leverages native Firestore realtime listeners.
          </div>

          {/* Optional Live Config Entry */}
          <div style={{ marginBottom: '14px' }}>
            <label className="form-label">Connect Custom Firebase Project (Optional)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '10px' }}>Firebase API Key</label>
                <input
                  type="text"
                  placeholder="AIzaSy..."
                  className="form-input font-mono"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '10px' }}>Project ID</label>
                <input
                  type="text"
                  placeholder="pulse-cad-prod"
                  className="form-input font-mono"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleSaveLiveConfig}
              >
                CONNECT FIRESTORE
              </button>
              {currentMode === 'live' && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={handleSwitchToLocal}
                >
                  <ServerOff size={12} />
                  <span>DISCONNECT / USE LOCAL</span>
                </button>
              )}
            </div>
          </div>

          {/* Reseed Button */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
            <label className="form-label">Database Seeding & Reset</label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="text-muted" style={{ fontSize: '11px' }}>
                Reset all units, hospitals, and incidents to initial demo state.
              </span>
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleReseed}
                disabled={isSeeding}
              >
                <RotateCcw size={12} />
                <span>{isSeeding ? 'SEEDING...' : 'RESEED DATABASE'}</span>
              </button>
            </div>
          </div>

          {statusMsg && (
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              borderRadius: '3px',
              fontSize: '11px',
              color: 'var(--accent-pending)',
              fontFamily: 'var(--font-mono)'
            }}>
              {statusMsg}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  )
}
