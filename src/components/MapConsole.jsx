import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import {
  Layers,
  Radio,
  Zap,
  Navigation,
  Building2,
  AlertCircle
} from 'lucide-react'

// Fix default Leaflet icon paths in bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
})

// Custom HTML DivIcon Generators
function createIncidentIcon(incident) {
  const isCritical = incident.severity === 'critical'
  const isFire = incident.type === 'fire'
  const color = isCritical ? 'var(--accent-critical)' : incident.severity === 'moderate' ? 'var(--accent-pending)' : 'var(--text-muted)'

  const iconSvg = isFire
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5v14"/><path d="M5 12h14"/></svg>`

  return L.divIcon({
    className: 'cad-marker-incident',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
        ${isCritical && incident.status !== 'resolved' ? `<div class="pulse-ring" style="border: 2px solid ${color};"></div>` : ''}
        <div style="
          width: 28px;
          height: 28px;
          background: ${color};
          border: 2px solid #FFFFFF;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 10px ${color};
        ">
          ${iconSvg}
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  })
}

function createUnitIcon(unit) {
  const isAvailable = unit.status === 'available'
  const isDispatched = unit.status === 'dispatched'
  const isReturning = unit.status === 'returning'
  const color = isAvailable ? '#3FB68B' : isDispatched ? '#388BFD' : '#8957E5'
  const isAmbulance = unit.type === 'ambulance'

  const iconSvg = isAmbulance
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M10 10h4"/><path d="M12 8v4"/><rect width="16" height="10" x="2" y="7" rx="2"/><circle cx="6" cy="19" r="2"/><circle cx="16" cy="19" r="2"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><rect width="18" height="12" x="1" y="5" rx="2"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/><path d="M15 5v12"/></svg>`

  return L.divIcon({
    className: 'cad-marker-unit',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="
          width: 24px;
          height: 24px;
          background: ${color};
          border: 2px solid #0B0F14;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 8px ${color};
        ">
          ${iconSvg}
        </div>
        <div style="
          background: #0B0F14;
          color: #E6EDF3;
          border: 1px solid var(--border-color);
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 700;
          padding: 1px 3px;
          border-radius: 2px;
          margin-top: 2px;
          white-space: nowrap;
          pointer-events: none;
        ">
          ${unit.callsign}
        </div>
      </div>
    `,
    iconSize: [40, 42],
    iconAnchor: [20, 12]
  })
}

function createHospitalIcon(hospital) {
  const icu = hospital.capacity?.icuBeds ?? 0
  return L.divIcon({
    className: 'cad-marker-hospital',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="
          width: 26px;
          height: 26px;
          background: #141A21;
          border: 2px solid #58A6FF;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #58A6FF;
          font-family: var(--font-mono);
          font-weight: 700;
          font-size: 11px;
          box-shadow: 0 0 8px rgba(88, 166, 255, 0.4);
        ">
          H
        </div>
        <div style="
          background: #0B0F14;
          color: ${icu > 2 ? '#3FB68B' : '#E5484D'};
          border: 1px solid var(--border-color);
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: 600;
          padding: 0 3px;
          border-radius: 2px;
          margin-top: 2px;
          white-space: nowrap;
        ">
          ICU: ${icu}
        </div>
      </div>
    `,
    iconSize: [40, 42],
    iconAnchor: [20, 13]
  })
}

function createSignalIcon(signal) {
  const isGreen = signal.status === 'green'
  return L.divIcon({
    className: 'cad-marker-signal',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        ${isGreen ? `<div class="pulse-ring" style="border: 2px solid #2EA043; width: 30px; height: 30px;"></div>` : ''}
        <div style="
          width: 18px;
          height: 18px;
          background: ${isGreen ? '#2EA043' : '#E5484D'};
          border: 2px solid #FFFFFF;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 ${isGreen ? '12px #2EA043' : '4px #E5484D'};
        ">
          <div style="width: 6px; height: 6px; background: #fff; border-radius: 50%;"></div>
        </div>
        <div style="
          background: rgba(11, 15, 20, 0.9);
          color: ${isGreen ? '#2EA043' : '#8B98A5'};
          border: 1px solid var(--border-color);
          font-family: var(--font-mono);
          font-size: 8px;
          padding: 0 2px;
          border-radius: 2px;
          margin-top: 1px;
          white-space: nowrap;
        ">
          ${isGreen ? 'PREEMPT [GRN]' : 'STOP [RED]'}
        </div>
      </div>
    `,
    iconSize: [40, 36],
    iconAnchor: [20, 9]
  })
}

export function MapConsole({
  incidents = [],
  units = [],
  hospitals = [],
  trafficSignals = [],
  selectedIncidentId,
  selectedUnitId,
  onSelectIncident,
  onSelectUnit,
  onAutoDispatch
}) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)

  // Layer groups
  const markersRef = useRef({
    incidents: {},
    units: {},
    hospitals: {},
    signals: {},
    routes: {},
    preemptionZones: {}
  })

  // Layer Visibility Controls
  const [layers, setLayers] = useState({
    units: true,
    incidents: true,
    hospitals: true,
    signals: true,
    routes: true,
    zones: true
  })

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return

    // Base map centered around San Francisco / Civic Center coordinates
    const map = L.map(mapContainerRef.current, {
      center: [37.7770, -122.4180],
      zoom: 13,
      minZoom: 11,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false
    })

    // Esri World Dark Gray Base tile layer (no API key required)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxNativeZoom: 16,
      maxZoom: 18,
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
    }).addTo(map)

    // Add zoom control at bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Sync Incidents
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    const existingMap = markersRef.current.incidents
    const currentIds = new Set(incidents.map(i => i.id))

    // Remove obsolete markers
    Object.keys(existingMap).forEach(id => {
      if (!currentIds.has(id) || !layers.incidents) {
        existingMap[id].remove()
        delete existingMap[id]
      }
    })

    if (!layers.incidents) return

    // Update or add markers
    incidents.forEach(incident => {
      const icon = createIncidentIcon(incident)
      const popupHtml = `
        <div style="font-family: var(--font-sans); color: var(--text-primary);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-family: var(--font-mono); font-weight: 700; color: ${incident.severity === 'critical' ? '#E5484D' : '#F2A93B'};">
              #${incident.id} [${incident.severity.toUpperCase()}]
            </span>
            <span style="font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase;">
              ${incident.status}
            </span>
          </div>
          <div style="font-size: 12px; font-weight: 600; margin-bottom: 4px;">${incident.address || 'Address on file'}</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">${incident.description}</div>
          <div style="font-family: var(--font-mono); font-size: 10px; color: var(--text-dim); margin-bottom: 6px;">
            LOC: ${incident.location.lat.toFixed(4)}, ${incident.location.lng.toFixed(4)}
          </div>
          ${incident.status === 'pending' ? `
            <button id="popup-dispatch-${incident.id}" style="
              width: 100%;
              background: #238636;
              color: #fff;
              border: none;
              padding: 4px 8px;
              border-radius: 3px;
              cursor: pointer;
              font-size: 11px;
              font-weight: 600;
            ">EXECUTE AUTO-DISPATCH</button>
          ` : ''}
        </div>
      `

      if (existingMap[incident.id]) {
        existingMap[incident.id].setLatLng([incident.location.lat, incident.location.lng])
        existingMap[incident.id].setIcon(icon)
        existingMap[incident.id].setPopupContent(popupHtml)
      } else {
        const marker = L.marker([incident.location.lat, incident.location.lng], { icon })
          .addTo(map)
          .bindPopup(popupHtml)

        marker.on('click', () => {
          onSelectIncident(incident.id)
        })

        marker.on('popupopen', () => {
          const btn = document.getElementById(`popup-dispatch-${incident.id}`)
          if (btn) {
            btn.onclick = () => {
              onAutoDispatch(incident)
              marker.closePopup()
            }
          }
        })

        existingMap[incident.id] = marker
      }
    })
  }, [incidents, layers.incidents, onSelectIncident, onAutoDispatch])

  // Sync Fleet Units
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    const existingMap = markersRef.current.units
    const currentIds = new Set(units.map(u => u.id))

    // Remove obsolete
    Object.keys(existingMap).forEach(id => {
      if (!currentIds.has(id) || !layers.units) {
        existingMap[id].remove()
        delete existingMap[id]
      }
    })

    if (!layers.units) return

    units.forEach(unit => {
      const icon = createUnitIcon(unit)
      const popupHtml = `
        <div style="font-family: var(--font-sans); color: var(--text-primary);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-family: var(--font-mono); font-weight: 700; color: ${unit.status === 'available' ? '#3FB68B' : '#388BFD'};">
              ${unit.callsign} [${unit.type.toUpperCase()}]
            </span>
            <span style="font-size: 10px; font-family: var(--font-mono); text-transform: uppercase;">
              ${unit.status}
            </span>
          </div>
          <div style="font-size: 11px; margin-bottom: 2px;">Crew: <span class="font-mono text-muted">${unit.crew || 'Assigned Duty'}</span></div>
          <div style="font-size: 11px; margin-bottom: 2px;">Traffic Index: <span class="font-mono text-muted">${unit.trafficFactor || 1.1}x</span></div>
          <div style="font-family: var(--font-mono); font-size: 10px; color: var(--text-dim);">
            GPS: ${unit.location.lat.toFixed(4)}, ${unit.location.lng.toFixed(4)}
          </div>
          ${unit.currentIncidentId ? `
            <div style="margin-top: 6px; padding: 4px; background: rgba(56, 139, 253, 0.1); border: 1px solid rgba(56, 139, 253, 0.4); border-radius: 2px; font-size: 10px; font-family: var(--font-mono);">
              MISSION: INCIDENT #${unit.currentIncidentId}
            </div>
          ` : ''}
        </div>
      `

      if (existingMap[unit.id]) {
        existingMap[unit.id].setLatLng([unit.location.lat, unit.location.lng])
        existingMap[unit.id].setIcon(icon)
        existingMap[unit.id].setPopupContent(popupHtml)
      } else {
        const marker = L.marker([unit.location.lat, unit.location.lng], { icon })
          .addTo(map)
          .bindPopup(popupHtml)

        marker.on('click', () => {
          onSelectUnit(unit.id)
        })

        existingMap[unit.id] = marker
      }
    })
  }, [units, layers.units, onSelectUnit])

  // Sync Hospitals
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    const existingMap = markersRef.current.hospitals
    const currentIds = new Set(hospitals.map(h => h.id))

    Object.keys(existingMap).forEach(id => {
      if (!currentIds.has(id) || !layers.hospitals) {
        existingMap[id].remove()
        delete existingMap[id]
      }
    })

    if (!layers.hospitals) return

    hospitals.forEach(hospital => {
      const icon = createHospitalIcon(hospital)
      const popupHtml = `
        <div style="font-family: var(--font-sans); color: var(--text-primary);">
          <div style="font-size: 13px; font-weight: 700; color: #58A6FF; margin-bottom: 2px;">${hospital.name}</div>
          <div style="font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); margin-bottom: 6px;">${hospital.tier}</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-family: var(--font-mono); font-size: 11px; background: var(--bg-app); padding: 4px; border: 1px solid var(--border-color); border-radius: 2px;">
            <div>ICU BEDS: <strong style="color: ${hospital.capacity.icuBeds > 2 ? '#3FB68B' : '#E5484D'}">${hospital.capacity.icuBeds}</strong></div>
            <div>GEN BEDS: <strong>${hospital.capacity.generalBeds}</strong></div>
            <div>OXYGEN: <strong>${hospital.capacity.oxygen}%</strong></div>
            <div>VENTILATORS: <strong>${hospital.capacity.ventilators}</strong></div>
          </div>
        </div>
      `

      if (existingMap[hospital.id]) {
        existingMap[hospital.id].setIcon(icon)
        existingMap[hospital.id].setPopupContent(popupHtml)
      } else {
        const marker = L.marker([hospital.location.lat, hospital.location.lng], { icon })
          .addTo(map)
          .bindPopup(popupHtml)
        existingMap[hospital.id] = marker
      }
    })
  }, [hospitals, layers.hospitals])

  // Sync Traffic Signals & Preemption Override Zones
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Filter to dynamic route signals; ignore old fixed signal points to eliminate map clutter
    const activeRouteSignals = trafficSignals.filter(s => s.isDynamic)

    const existingSignals = markersRef.current.signals
    const existingZones = markersRef.current.preemptionZones
    const currentIds = new Set(activeRouteSignals.map(s => s.id))

    // Cleanup
    Object.keys(existingSignals).forEach(id => {
      if (!currentIds.has(id) || !layers.signals) {
        existingSignals[id].remove()
        delete existingSignals[id]
      }
    })

    Object.keys(existingZones).forEach(id => {
      if (!currentIds.has(id) || !layers.zones) {
        existingZones[id].remove()
        delete existingZones[id]
      }
    })

    if (!layers.signals) return

    activeRouteSignals.forEach(signal => {
      const icon = createSignalIcon(signal)
      const popupHtml = `
        <div style="font-family: var(--font-sans); color: var(--text-primary);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
            <span style="font-family: var(--font-mono); font-weight: 700; color: ${signal.status === 'green' ? '#2EA043' : '#E5484D'};">
              ${signal.id} [${signal.status.toUpperCase()}]
            </span>
            <span style="font-size: 9px; font-family: var(--font-mono); background: var(--bg-app); padding: 1px 4px; border: 1px solid var(--border-color); border-radius: 2px;">
              OPTICOM IR
            </span>
          </div>
          <div style="font-size: 12px; font-weight: 600; margin-bottom: 4px;">${signal.name}</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">Intersection: ${signal.intersection}</div>
          ${signal.status === 'green' ? `
            <div style="background: rgba(46, 160, 67, 0.15); border: 1px solid rgba(46, 160, 67, 0.4); padding: 4px 6px; border-radius: 2px; font-family: var(--font-mono); font-size: 10px; color: #2EA043;">
              PREEMPTION ACTIVE: Cleared for ${signal.preemptedBy}
            </div>
          ` : `
            <div style="font-size: 10px; font-family: var(--font-mono); color: var(--text-dim);">
              Civilian signal timing cycle active (300m proximity trigger)
            </div>
          `}
        </div>
      `

      // Update or add signal marker
      if (existingSignals[signal.id]) {
        existingSignals[signal.id].setIcon(icon)
        existingSignals[signal.id].setPopupContent(popupHtml)
      } else {
        const marker = L.marker([signal.location.lat, signal.location.lng], { icon })
          .addTo(map)
          .bindPopup(popupHtml)
        existingSignals[signal.id] = marker
      }

      // Preemption Zone Circle (300m radius)
      if (layers.zones) {
        const isGreen = signal.status === 'green'
        const circleStyle = {
          color: isGreen ? '#2EA043' : '#E5484D',
          weight: isGreen ? 2 : 1,
          dashArray: isGreen ? null : '4, 6',
          fillColor: isGreen ? '#2EA043' : '#E5484D',
          fillOpacity: isGreen ? 0.15 : 0.04
        }

        if (existingZones[signal.id]) {
          existingZones[signal.id].setStyle(circleStyle)
        } else {
          const circle = L.circle([signal.location.lat, signal.location.lng], {
            radius: 300,
            ...circleStyle
          }).addTo(map)
          existingZones[signal.id] = circle
        }
      }
    })
  }, [trafficSignals, layers.signals, layers.zones])

  // Sync Dispatch Route Polylines
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    const existingRoutes = markersRef.current.routes

    // Clear old lines
    Object.keys(existingRoutes).forEach(k => {
      existingRoutes[k].remove()
      delete existingRoutes[k]
    })

    if (!layers.routes) return

    // Draw route lines for all dispatched units
    units.forEach(unit => {
      if (unit.status !== 'dispatched' || !unit.currentIncidentId) return

      const incident = incidents.find(i => i.id === unit.currentIncidentId)
      if (!incident) return

      if (unit.currentRoute && unit.currentRoute.length > 1) {
        // Draw real OSRM road route geometry in "dispatched" blue (#388BFD)
        const latLngs = unit.currentRoute.map(pt => [pt.lat, pt.lng])
        const routeLine = L.polyline(latLngs, {
          color: '#388BFD',
          weight: 4,
          opacity: 0.9
        }).addTo(map)

        existingRoutes[`route-${unit.id}`] = routeLine
      } else {
        // Fallback straight-line polyline
        const unitCoords = [unit.location.lat, unit.location.lng]
        const incCoords = [incident.location.lat, incident.location.lng]

        const routeLine = L.polyline([unitCoords, incCoords], {
          color: '#388BFD',
          weight: 3,
          dashArray: '6, 8',
          opacity: 0.8
        }).addTo(map)

        existingRoutes[`unit-inc-${unit.id}`] = routeLine
      }
    })
  }, [units, incidents, layers.routes])

  // Pan to selected incident or unit when selected
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    if (selectedIncidentId) {
      const inc = incidents.find(i => i.id === selectedIncidentId)
      if (inc) {
        map.panTo([inc.location.lat, inc.location.lng], { animate: true, duration: 0.8 })
        const marker = markersRef.current.incidents[selectedIncidentId]
        if (marker) marker.openPopup()
      }
    } else if (selectedUnitId) {
      const unit = units.find(u => u.id === selectedUnitId)
      if (unit) {
        map.panTo([unit.location.lat, unit.location.lng], { animate: true, duration: 0.8 })
        const marker = markersRef.current.units[selectedUnitId]
        if (marker) marker.openPopup()
      }
    }
  }, [selectedIncidentId, selectedUnitId, incidents, units])

  // Active Preemption status calculation
  const preemptedSignals = trafficSignals.filter(s => s.status === 'green' && s.isDynamic)

  return (
    <main className="console-map-container">
      {/* Preemption Status HUD Banner */}
      <div className="preemption-status-banner">
        <div className={`signal-dot ${preemptedSignals.length > 0 ? 'active' : 'idle'}`} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 600, color: preemptedSignals.length > 0 ? 'var(--accent-signal-override)' : 'var(--text-muted)' }}>
            {preemptedSignals.length > 0
              ? `SIGNAL PREEMPTION OVERRIDE ACTIVE (${preemptedSignals.length} NODES)`
              : 'TRAFFIC SIGNALS: CIVILIAN CYCLE (NO OVERRIDE)'}
          </div>
          {preemptedSignals.length > 0 && (
            <div className="text-dim" style={{ fontSize: '10px' }}>
              Green corridor established for: {preemptedSignals.map(s => `${s.name.split(' ')[0]} [${s.preemptedBy}]`).join(', ')}
            </div>
          )}
        </div>
      </div>

      {/* Layer Toggles Floating Control */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        zIndex: 1000,
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: '4px',
        padding: '6px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: 'var(--font-mono)',
        fontSize: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontWeight: 600 }}>
          <Layers size={12} />
          <span>LAYERS:</span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={layers.units}
            onChange={(e) => setLayers(l => ({ ...l, units: e.target.checked }))}
          />
          <span style={{ color: '#388BFD' }}>Units</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={layers.incidents}
            onChange={(e) => setLayers(l => ({ ...l, incidents: e.target.checked }))}
          />
          <span style={{ color: '#E5484D' }}>Incidents</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={layers.hospitals}
            onChange={(e) => setLayers(l => ({ ...l, hospitals: e.target.checked }))}
          />
          <span style={{ color: '#58A6FF' }}>Hospitals</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={layers.signals}
            onChange={(e) => setLayers(l => ({ ...l, signals: e.target.checked }))}
          />
          <span style={{ color: '#2EA043' }}>Signals</span>
        </label>
      </div>

      {/* Leaflet Map Div */}
      <div ref={mapContainerRef} className="map-view" />
    </main>
  )
}
