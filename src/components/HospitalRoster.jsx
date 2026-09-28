import React from 'react'
import {
  Building2,
  Bed,
  Activity,
  Wind,
  Plus,
  Minus,
  MapPin
} from 'lucide-react'

export function HospitalRoster({
  hospitals = [],
  selectedHospitalId,
  onSelectHospital,
  onUpdateHospitalCapacity
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-content">
        {hospitals.map(hospital => {
          const isSelected = hospital.id === selectedHospitalId
          const isLowIcu = (hospital.capacity?.icuBeds || 0) <= 2
          const isLowGen = (hospital.capacity?.generalBeds || 0) <= 5

          return (
            <div
              key={hospital.id}
              className="hospital-row"
              style={{
                background: isSelected ? 'var(--bg-panel-active)' : 'transparent',
                borderLeft: isSelected ? '3px solid #58A6FF' : '3px solid transparent',
                cursor: 'pointer'
              }}
              onClick={() => onSelectHospital(hospital.id)}
            >
              {/* Header: Name and Tier */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={13} style={{ color: '#58A6FF' }} />
                    <span style={{ fontWeight: 600, fontSize: '12px' }}>{hospital.name}</span>
                  </div>
                  <div className="text-dim font-mono" style={{ fontSize: '10px', marginTop: '1px' }}>
                    {hospital.tier || 'Emergency Facility'} // {hospital.code || hospital.id}
                  </div>
                </div>

                <span className="badge badge-available" style={{ fontSize: '9px' }}>
                  OPERATIONAL
                </span>
              </div>

              {/* Resource Capacity Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px',
                marginTop: '8px',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-color)',
                padding: '6px 8px',
                borderRadius: '3px'
              }}>
                {/* ICU Beds (Crucial for Critical Medical) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                    <Activity size={12} className={isLowIcu ? 'text-critical' : 'text-available'} />
                    <span className="text-muted">ICU BEDS:</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className={`font-mono ${isLowIcu ? 'text-critical' : 'text-primary'}`} style={{ fontWeight: 700, fontSize: '12px' }}>
                      {hospital.capacity?.icuBeds ?? 0}
                    </span>
                    <button
                      className="btn btn-sm"
                      style={{ padding: '0 3px', height: '16px', fontSize: '9px' }}
                      title="Add 1 ICU bed"
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdateHospitalCapacity(hospital.id, 'icuBeds', (hospital.capacity?.icuBeds || 0) + 1)
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* General Beds (For Moderate/Low Medical) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                    <Bed size={12} className={isLowGen ? 'text-pending' : 'text-available'} />
                    <span className="text-muted">GEN BEDS:</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="font-mono text-primary" style={{ fontWeight: 700, fontSize: '12px' }}>
                      {hospital.capacity?.generalBeds ?? 0}
                    </span>
                    <button
                      className="btn btn-sm"
                      style={{ padding: '0 3px', height: '16px', fontSize: '9px' }}
                      title="Add 1 General bed"
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdateHospitalCapacity(hospital.id, 'generalBeds', (hospital.capacity?.generalBeds || 0) + 1)
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Oxygen Tank Reserve */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="text-dim" style={{ fontSize: '10px' }}>O2 RESERVES:</span>
                  <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
                    {hospital.capacity?.oxygen ?? 0}%
                  </span>
                </div>

                {/* Ventilators */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="text-dim" style={{ fontSize: '10px' }}>VENTILATORS:</span>
                  <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
                    {hospital.capacity?.ventilators ?? 0}
                  </span>
                </div>
              </div>

              {/* Coordinates */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }} className="font-mono text-dim">
                <MapPin size={10} />
                <span style={{ fontSize: '10px' }}>
                  {hospital.location.lat.toFixed(4)}, {hospital.location.lng.toFixed(4)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
