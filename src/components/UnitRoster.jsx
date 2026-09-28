import React, { useState } from 'react'
import {
  Truck,
  HeartPulse,
  Flame,
  Radio,
  Navigation,
  RotateCcw,
  CheckCircle,
  Clock,
  Compass
} from 'lucide-react'

export function UnitRoster({
  units = [],
  incidents = [],
  selectedUnitId,
  onSelectUnit,
  onRecallUnit
}) {
  const [unitFilter, setUnitFilter] = useState('all') // 'all' | 'ambulance' | 'fire_truck'

  const filteredUnits = units.filter(u => {
    if (unitFilter === 'all') return true
    return u.type === unitFilter
  })

  const availableCount = units.filter(u => u.status === 'available').length
  const dispatchedCount = units.filter(u => u.status === 'dispatched').length
  const returningCount = units.filter(u => u.status === 'returning').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Unit Filter Header */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-panel-secondary)',
        padding: '2px 4px',
        gap: '4px'
      }}>
        <button
          className={`btn btn-sm ${unitFilter === 'all' ? 'btn-primary' : ''}`}
          style={{ flex: 1, padding: '4px 6px', fontSize: '10px' }}
          onClick={() => setUnitFilter('all')}
        >
          ALL ({units.length})
        </button>
        <button
          className={`btn btn-sm ${unitFilter === 'ambulance' ? 'btn-primary' : ''}`}
          style={{ flex: 1, padding: '4px 6px', fontSize: '10px' }}
          onClick={() => setUnitFilter('ambulance')}
        >
          AMBULANCE ({units.filter(u => u.type === 'ambulance').length})
        </button>
        <button
          className={`btn btn-sm ${unitFilter === 'fire_truck' ? 'btn-primary' : ''}`}
          style={{ flex: 1, padding: '4px 6px', fontSize: '10px' }}
          onClick={() => setUnitFilter('fire_truck')}
        >
          FIRE ({units.filter(u => u.type === 'fire_truck').length})
        </button>
      </div>

      {/* Units List */}
      <div className="panel-content">
        {filteredUnits.map(unit => {
          const isSelected = unit.id === selectedUnitId
          const activeIncident = incidents.find(i => i.id === unit.currentIncidentId)

          return (
            <div
              key={unit.id}
              className="unit-row"
              style={{
                background: isSelected ? 'var(--bg-panel-active)' : 'transparent',
                borderLeft: isSelected ? '3px solid var(--accent-dispatched)' : '3px solid transparent',
                cursor: 'pointer'
              }}
              onClick={() => onSelectUnit(unit.id)}
            >
              <div style={{ width: '100%' }}>
                {/* Top line: Callsign + Type icon + Status Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {unit.type === 'ambulance' ? (
                      <HeartPulse size={13} className="text-critical" />
                    ) : (
                      <Flame size={13} style={{ color: '#F0883E' }} />
                    )}
                    <span className="font-mono" style={{ fontWeight: 700, fontSize: '12px' }}>
                      {unit.callsign}
                    </span>
                  </div>

                  <span className={`badge badge-${unit.status}`}>
                    {unit.status}
                  </span>
                </div>

                {/* Coordinates & Traffic Index */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="font-mono text-muted">
                    <Compass size={11} className="text-dim" />
                    <span>{unit.location.lat.toFixed(4)}, {unit.location.lng.toFixed(4)}</span>
                  </div>
                  <div className="font-mono text-dim" style={{ fontSize: '10px' }}>
                    TRF-IDX: {unit.trafficFactor ? `${unit.trafficFactor}x` : '1.0x'}
                  </div>
                </div>

                {/* Dispatched Assignment Details */}
                {unit.status === 'dispatched' && (
                  <div style={{
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '2px',
                    padding: '4px 6px',
                    fontSize: '11px',
                    marginBottom: '4px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="text-muted">TARGET:</span>
                      <span className="font-mono text-dispatched" style={{ fontWeight: 600 }}>
                        {unit.stage === 'en_route_hospital' ? 'TRANSPORTING TO HOSP' : `INCIDENT #${unit.currentIncidentId || 'ASSIGNED'}`}
                      </span>
                    </div>
                    {activeIncident && (
                      <div className="text-dim" style={{ fontSize: '10px', marginTop: '2px' }}>
                        {activeIncident.address}
                      </div>
                    )}
                  </div>
                )}

                {unit.status === 'returning' && (
                  <div style={{
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '2px',
                    padding: '4px 6px',
                    fontSize: '10px',
                    marginBottom: '4px',
                    color: 'var(--accent-returning)'
                  }} className="font-mono">
                    TRANSIT: RETURNING TO BASE STATION
                  </div>
                )}

                {/* Action buttons */}
                {unit.status !== 'available' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button
                      className="btn btn-sm"
                      style={{ fontSize: '10px', padding: '2px 6px' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onRecallUnit(unit.id)
                      }}
                      title="Abort mission and reset unit to available status at current position"
                    >
                      <RotateCcw size={10} />
                      <span>RECALL TO BASE</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
