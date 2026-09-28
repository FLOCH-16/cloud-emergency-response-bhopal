import React, { useState } from 'react'
import {
  Flame,
  HeartPulse,
  AlertTriangle,
  Clock,
  Send,
  CheckCircle2,
  Navigation,
  Building2,
  Filter
} from 'lucide-react'

// Helper for elapsed time
function formatElapsedTime(isoString) {
  if (!isoString) return ''
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  return `${Math.floor(diffMin / 60)}h ago`
}

const SEVERITY_ORDER = {
  critical: 1,
  moderate: 2,
  low: 3
}

export function IncidentQueue({
  incidents = [],
  units = [],
  hospitals = [],
  selectedIncidentId,
  onSelectIncident,
  onAutoDispatch,
  onResolveIncident
}) {
  const [filter, setFilter] = useState('all') // 'all' | 'pending' | 'dispatched' | 'resolved'

  // Sort incidents by severity (critical first), then by creation date (newest first)
  const sortedIncidents = [...incidents].sort((a, b) => {
    // Resolved incidents go to bottom if filter is all
    if (a.status === 'resolved' && b.status !== 'resolved') return 1
    if (b.status === 'resolved' && a.status !== 'resolved') return -1

    const sevDiff = (SEVERITY_ORDER[a.severity] || 99) - (SEVERITY_ORDER[b.severity] || 99)
    if (sevDiff !== 0) return sevDiff
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  })

  const filteredIncidents = sortedIncidents.filter(inc => {
    if (filter === 'all') return true
    return inc.status === filter
  })

  const pendingCount = incidents.filter(i => i.status === 'pending').length
  const dispatchedCount = incidents.filter(i => i.status === 'dispatched').length
  const resolvedCount = incidents.filter(i => i.status === 'resolved').length

  return (
    <aside className="console-sidebar sidebar-left">
      <div className="panel-header">
        <div className="panel-title">
          <AlertTriangle size={14} className="text-pending" />
          <span>Incident Queue</span>
          <span className="badge badge-neutral font-mono">{filteredIncidents.length}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-panel-secondary)',
        padding: '2px 4px',
        gap: '4px'
      }}>
        <button
          className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : ''}`}
          style={{ flex: 1, padding: '4px 6px', fontSize: '10px' }}
          onClick={() => setFilter('all')}
        >
          ALL ({incidents.length})
        </button>
        <button
          className={`btn btn-sm ${filter === 'pending' ? 'btn-danger' : ''}`}
          style={{ flex: 1, padding: '4px 6px', fontSize: '10px' }}
          onClick={() => setFilter('pending')}
        >
          PENDING ({pendingCount})
        </button>
        <button
          className={`btn btn-sm ${filter === 'dispatched' ? 'btn-primary' : ''}`}
          style={{ flex: 1, padding: '4px 6px', fontSize: '10px' }}
          onClick={() => setFilter('dispatched')}
        >
          DISPATCHED ({dispatchedCount})
        </button>
        <button
          className={`btn btn-sm ${filter === 'resolved' ? 'btn-primary' : ''}`}
          style={{ flex: 1, padding: '4px 6px', fontSize: '10px' }}
          onClick={() => setFilter('resolved')}
        >
          RESOLVED ({resolvedCount})
        </button>
      </div>

      {/* Incidents List */}
      <div className="panel-content">
        {filteredIncidents.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
            <div>No {filter !== 'all' ? filter : ''} incidents in queue.</div>
            <div style={{ fontSize: '11px', marginTop: '4px' }} className="text-dim">
              Use "REPORT EMERGENCY" above to simulate a 911 dispatch.
            </div>
          </div>
        ) : (
          filteredIncidents.map(incident => {
            const isSelected = incident.id === selectedIncidentId
            const assignedUnit = units.find(u => u.id === incident.assignedUnitId)
            const assignedHospital = hospitals.find(h => h.id === incident.assignedHospitalId)

            return (
              <div
                key={incident.id}
                className={`incident-card severity-${incident.severity} ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectIncident(incident.id)}
              >
                {/* Header row: Severity + Type + Status + Time */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`badge badge-${incident.severity}`}>
                      {incident.severity}
                    </span>

                    <span className="badge badge-neutral" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {incident.type === 'medical' ? (
                        <>
                          <HeartPulse size={11} className="text-critical" />
                          <span>MED</span>
                        </>
                      ) : (
                        <>
                          <Flame size={11} style={{ color: '#F0883E' }} />
                          <span>FIRE</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="font-mono text-dim" style={{ fontSize: '10px' }}>
                      {formatElapsedTime(incident.createdAt)}
                    </span>
                    <span className={`badge badge-${incident.status}`}>
                      {incident.status}
                    </span>
                  </div>
                </div>

                {/* Incident ID and Address */}
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span className="font-mono" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    #{incident.id}
                  </span>
                  <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
                    {incident.address || `${incident.location.lat.toFixed(4)}, ${incident.location.lng.toFixed(4)}`}
                  </span>
                </div>

                {/* Description snippet */}
                <p style={{
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                  lineHeight: '1.35',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {incident.description}
                </p>

                {/* Dispatch Status / Assignment Info */}
                {incident.status === 'dispatched' && (
                  <div style={{
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-color)',
                    padding: '6px 8px',
                    borderRadius: '2px',
                    marginBottom: '6px',
                    fontSize: '11px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Navigation size={11} className="text-dispatched" />
                        <span className="text-muted">UNIT:</span>
                        <span className="font-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {assignedUnit ? assignedUnit.callsign : incident.assignedUnitId}
                        </span>
                      </div>
                      {assignedUnit && (
                        <span className="badge badge-dispatched" style={{ fontSize: '9px', padding: '1px 4px' }}>
                          {assignedUnit.stage === 'en_route_hospital' ? 'TRANSPORTING' : 'EN ROUTE'}
                        </span>
                      )}
                    </div>

                    {incident.type === 'medical' && assignedHospital && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: 'var(--text-muted)' }}>
                        <Building2 size={11} style={{ color: '#58A6FF' }} />
                        <span>HOSP:</span>
                        <span className="font-mono text-primary" style={{ color: 'var(--text-primary)' }}>
                          {assignedHospital.name}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Action Button for Pending Incidents */}
                {incident.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <button
                      className="btn btn-sm btn-primary"
                      style={{ width: '100%' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onAutoDispatch(incident)
                      }}
                    >
                      <Send size={12} />
                      <span>EXECUTE AUTO-DISPATCH</span>
                    </button>
                  </div>
                )}

                {incident.status === 'dispatched' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button
                      className="btn btn-sm"
                      style={{ fontSize: '10px', padding: '2px 6px' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onResolveIncident(incident.id)
                      }}
                    >
                      <CheckCircle2 size={11} />
                      <span>MARK RESOLVED</span>
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}
