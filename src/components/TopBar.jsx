import React, { useState, useEffect } from 'react'
import {
  ShieldAlert,
  Radio,
  Clock,
  Play,
  Pause,
  RotateCcw,
  PlusCircle,
  Database,
  Sliders,
  ChevronRight
} from 'lucide-react'

export function TopBar({
  incidents = [],
  units = [],
  isSimRunning = true,
  onToggleSim,
  onOpenIntake,
  onReseed,
  onOpenFirebaseSettings,
  onOpenFutureWork,
  firebaseMode = 'local'
}) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const activeIncidents = incidents.filter(i => i.status !== 'resolved')
  const criticalCount = activeIncidents.filter(i => i.severity === 'critical').length
  const moderateCount = activeIncidents.filter(i => i.severity === 'moderate').length
  const lowCount = activeIncidents.filter(i => i.severity === 'low').length

  const availableUnits = units.filter(u => u.status === 'available').length
  const dispatchedUnits = units.filter(u => u.status === 'dispatched').length

  const localTimeStr = currentTime.toLocaleTimeString('en-US', { hour12: false })
  const utcTimeStr = currentTime.toISOString().substring(11, 19) + ' UTC'

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <div className="brand-title">
          <ShieldAlert size={18} className="text-critical" />
          <span>PULSE</span>
          <span className="brand-sub">C4I CAD OPS</span>
        </div>

        <div style={{ height: '16px', width: '1px', background: 'var(--border-color)', margin: '0 4px' }} />

        <div className="stat-item" title="Active Incidents in Queue">
          <span className="text-muted">ACTIVE INCIDENTS:</span>
          <span className="stat-val font-mono" style={{ color: activeIncidents.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {activeIncidents.length}
          </span>
          {criticalCount > 0 && (
            <span className="badge badge-critical" title="Critical Priority">{criticalCount} CRIT</span>
          )}
          {moderateCount > 0 && (
            <span className="badge badge-moderate" title="Moderate Priority">{moderateCount} MOD</span>
          )}
          {lowCount > 0 && (
            <span className="badge badge-low" title="Low Priority">{lowCount} LOW</span>
          )}
        </div>

        <div style={{ height: '16px', width: '1px', background: 'var(--border-color)', margin: '0 4px' }} />

        <div className="stat-item" title="Fleet Availability">
          <span className="text-muted">UNITS:</span>
          <span className="badge badge-available font-mono" title="Available Units">
            {availableUnits} AVAIL
          </span>
          <span className="badge badge-dispatched font-mono" title="Dispatched Units">
            {dispatchedUnits} EN ROUTE
          </span>
        </div>
      </div>

      <div className="top-bar-right">
        {/* Simulation Controls */}
        <button
          className={`btn btn-sm ${isSimRunning ? '' : 'btn-primary'}`}
          onClick={onToggleSim}
          title={isSimRunning ? 'Pause GPS movement & preemption ticker' : 'Resume GPS simulation'}
        >
          {isSimRunning ? <Pause size={13} /> : <Play size={13} />}
          <span>{isSimRunning ? 'PAUSE SIM' : 'RESUME SIM'}</span>
        </button>

        <button
          className="btn btn-sm btn-primary"
          onClick={onOpenIntake}
          title="Manual call intake form"
        >
          <PlusCircle size={13} />
          <span>REPORT EMERGENCY</span>
        </button>

        <button
          className="btn btn-sm"
          onClick={onReseed}
          title="Reset incidents, units, and hospitals to baseline seed data"
        >
          <RotateCcw size={13} />
          <span>RESEED</span>
        </button>

        <button
          className="btn btn-sm"
          onClick={onOpenFirebaseSettings}
          title="Configure Firebase Firestore / Offline Mode"
        >
          <Database size={13} />
          <span className="font-mono" style={{ fontSize: '10px' }}>
            {firebaseMode === 'live' ? 'FIRESTORE: LIVE' : 'FIRESTORE: LOCAL'}
          </span>
        </button>

        <button
          className="btn btn-sm"
          onClick={onOpenFutureWork}
          title="View Future Architecture Slide"
          style={{ background: 'var(--bg-panel-secondary)', borderColor: 'var(--border-color)' }}
        >
          <Sliders size={13} />
          <span>FUTURE WORK</span>
        </button>

        <div style={{ height: '16px', width: '1px', background: 'var(--border-color)', margin: '0 2px' }} />

        {/* Live Clock Display */}
        <div className="clock-display">
          <span className="font-mono">{localTimeStr}</span>
          <span className="clock-utc font-mono">{utcTimeStr}</span>
        </div>
      </div>
    </header>
  )
}
