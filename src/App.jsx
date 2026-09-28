import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  subscribeToCollection,
  updateDocument,
  addDocument,
  seedCADDatabase,
  getFirebaseMode
} from './services/firebase.js'
import { findBestUnitForIncident } from './logic/dispatchEngine.js'
import { matchHospitalForIncident, decrementHospitalCapacity } from './logic/hospitalMatcher.js'
import { advanceSimulationTick } from './logic/movementSimulator.js'
import { evaluateSignalPreemption } from './logic/trafficSignalPreemption.js'
import { fetchRoadRoute, generateRouteSignals } from './logic/osrmRouting.js'

import { TopBar } from './components/TopBar.jsx'
import { IncidentQueue } from './components/IncidentQueue.jsx'
import { MapConsole } from './components/MapConsole.jsx'
import { UnitRoster } from './components/UnitRoster.jsx'
import { HospitalRoster } from './components/HospitalRoster.jsx'
import { IncidentIntakeModal } from './components/IncidentIntakeModal.jsx'
import { FutureWorkModal } from './components/FutureWorkModal.jsx'
import { FirebaseSettingsModal } from './components/FirebaseSettingsModal.jsx'
import { Radio, Building2, Truck } from 'lucide-react'

export function App() {
  // Real-time Firestore State Collections
  const [incidents, setIncidents] = useState([])
  const [units, setUnits] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [trafficSignals, setTrafficSignals] = useState([])
  const [dynamicSignals, setDynamicSignals] = useState([])

  // Selection states
  const [selectedIncidentId, setSelectedIncidentId] = useState(null)
  const [selectedUnitId, setSelectedUnitId] = useState(null)
  const [selectedHospitalId, setSelectedHospitalId] = useState(null)

  // Right sidebar tab: 'units' | 'hospitals'
  const [rightTab, setRightTab] = useState('units')

  // Modals
  const [isIntakeOpen, setIsIntakeOpen] = useState(false)
  const [isFutureWorkOpen, setIsFutureWorkOpen] = useState(false)
  const [isFirebaseSettingsOpen, setIsFirebaseSettingsOpen] = useState(false)

  // Simulation controls
  const [isSimRunning, setIsSimRunning] = useState(true)
  const [firebaseMode, setFirebaseMode] = useState(getFirebaseMode())

  // Notification / Audio chirp banner
  const [activeAlert, setActiveAlert] = useState(null)

  // Subscribe to real-time collections
  useEffect(() => {
    const unsubIncidents = subscribeToCollection('incidents', (items) => {
      setIncidents(items || [])
    })

    const unsubUnits = subscribeToCollection('units', (items) => {
      setUnits(items || [])
    })

    const unsubHospitals = subscribeToCollection('hospitals', (items) => {
      setHospitals(items || [])
    })

    const unsubSignals = subscribeToCollection('trafficSignals', (items) => {
      setTrafficSignals(items || [])
    })

    return () => {
      if (typeof unsubIncidents === 'function') unsubIncidents()
      if (typeof unsubUnits === 'function') unsubUnits()
      if (typeof unsubHospitals === 'function') unsubHospitals()
      if (typeof unsubSignals === 'function') unsubSignals()
    }
  }, [firebaseMode])

  // Reference for fresh state in timer interval
  const stateRef = useRef({ units, incidents, hospitals, trafficSignals, dynamicSignals })
  useEffect(() => {
    stateRef.current = { units, incidents, hospitals, trafficSignals, dynamicSignals }
  }, [units, incidents, hospitals, trafficSignals, dynamicSignals])

  // Client-Side Simulated Movement + Traffic Signal Preemption Ticker (every 2.5s)
  useEffect(() => {
    if (!isSimRunning) return

    const interval = setInterval(async () => {
      const { units: currentUnits, incidents: currentIncidents, hospitals: currentHospitals } = stateRef.current

      // 1. Advance movement steps for all moving units
      const { updatedUnits, resolvedIncidentIds, updatedIncidents, legTransitions } = advanceSimulationTick(
        currentUnits,
        currentIncidents,
        currentHospitals
      )

      // Sync updated units to Firestore / Store
      for (const unit of updatedUnits) {
        const orig = currentUnits.find(u => u.id === unit.id)
        if (orig && (
          orig.location.lat !== unit.location.lat ||
          orig.location.lng !== unit.location.lng ||
          orig.status !== unit.status ||
          orig.stage !== unit.stage ||
          orig.routeIndex !== unit.routeIndex ||
          orig.currentRoute !== unit.currentRoute
        )) {
          await updateDocument('units', unit.id, {
            location: unit.location,
            status: unit.status,
            stage: unit.stage,
            currentIncidentId: unit.currentIncidentId,
            targetLocation: unit.targetLocation,
            targetType: unit.targetType,
            currentRoute: unit.currentRoute || null,
            routeIndex: unit.routeIndex || 0,
            routeDistance: unit.routeDistance || null,
            routeDuration: unit.routeDuration || null
          })
        }
      }

      // Sync resolved incidents to Firestore / Store
      for (const resolvedInc of updatedIncidents) {
        await updateDocument('incidents', resolvedInc.id, {
          status: 'resolved',
          resolvedAt: resolvedInc.resolvedAt
        })
      }

      // Clean up signals for resolved incidents/units
      if (resolvedIncidentIds.length > 0) {
        const resolvedUnits = currentUnits.filter(u => resolvedIncidentIds.includes(u.currentIncidentId))
        const resolvedUnitIds = new Set(resolvedUnits.map(u => u.id))
        setDynamicSignals(prev => prev.filter(s => !resolvedUnitIds.has(s.unitId)))
      }

      // 2. Handle leg transitions (incident -> hospital, or returning to base)
      // Fetch route once at leg start, never inside the movement tick loop
      if (legTransitions && legTransitions.length > 0) {
        for (const leg of legTransitions) {
          const legUnit = currentUnits.find(u => u.id === leg.unitId)
          if (!legUnit) continue

          fetchRoadRoute(leg.start, leg.end).then(async (routeRes) => {
            if (routeRes.success) {
              if (leg.stage === 'en_route_hospital') {
                const signals = generateRouteSignals(legUnit, routeRes.coordinates)
                setDynamicSignals(prev => [
                  ...prev.filter(s => s.unitId !== legUnit.id),
                  ...signals
                ])
              } else {
                setDynamicSignals(prev => prev.filter(s => s.unitId !== legUnit.id))
              }

              await updateDocument('units', leg.unitId, {
                currentRoute: routeRes.coordinates,
                routeIndex: 1,
                routeDistance: routeRes.distanceKm,
                routeDuration: routeRes.durationMinutes * 60
              })
            } else {
              setDynamicSignals(prev => prev.filter(s => s.unitId !== legUnit.id))
              setActiveAlert({
                title: 'ROUTING NOTICE',
                message: 'OSRM routing offline: falling back to straight-line navigation.',
                type: 'info'
              })
              setTimeout(() => setActiveAlert(null), 3500)
            }
          })
        }
      }

      // 3. Evaluate Traffic Signal Preemption on dynamic route signals
      setDynamicSignals(prevSignals => {
        if (!prevSignals || prevSignals.length === 0) return []
        return evaluateSignalPreemption(prevSignals, updatedUnits, 300)
      })
    }, 2500)

    return () => clearInterval(interval)
  }, [isSimRunning])

  // Dispatch Engine Handler: Shared logic for ambulance and fire
  const handleAutoDispatch = useCallback(async (incident) => {
    const { units: currentUnits, hospitals: currentHospitals } = stateRef.current

    // 1. Find best unit via Haversine + Traffic Scoring
    const { selectedUnit, diagnostics } = findBestUnitForIncident(currentUnits, incident)

    if (!selectedUnit) {
      alert(`Dispatch Error: ${diagnostics}`)
      return
    }

    let assignedHospital = null
    let requiredResource = null

    // 2. If Medical: Match nearest hospital with sufficient capacity
    if (incident.type === 'medical') {
      const matchResult = matchHospitalForIncident(currentHospitals, incident)
      if (matchResult.matchedHospital) {
        assignedHospital = matchResult.matchedHospital
        requiredResource = matchResult.requiredResource

        // Decrement capacity on hospital record
        const updatedHospital = decrementHospitalCapacity(assignedHospital, requiredResource)
        await updateDocument('hospitals', assignedHospital.id, {
          capacity: updatedHospital.capacity
        })
      }
    }

    // 3. Fetch OSRM Road Route for chosen unit (once at dispatch, never inside movement tick)
    const routeRes = await fetchRoadRoute(selectedUnit.location, incident.location)

    let routeCoords = null
    let routeDistanceKm = selectedUnit.rawDistanceKm
    let routeDurationMins = selectedUnit.etaMinutes * 60
    let distanceText = `${selectedUnit.rawDistanceKm}km`
    let etaMinutes = selectedUnit.etaMinutes

    if (routeRes.success) {
      routeCoords = routeRes.coordinates
      routeDistanceKm = routeRes.distanceKm
      routeDurationMins = routeRes.durationMinutes * 60
      distanceText = `${routeRes.distanceKm.toFixed(2)}km`
      // Apply per-unit traffic index as a multiplier on ETA
      etaMinutes = Math.max(1, Math.round(routeRes.durationMinutes * (selectedUnit.trafficFactor || 1.0)))

      // Place 3 simulated signal points at roughly 25%, 50%, and 75% along route geometry
      const newSignals = generateRouteSignals(selectedUnit, routeCoords)
      setDynamicSignals(prev => [
        ...prev.filter(s => s.unitId !== selectedUnit.id),
        ...newSignals
      ])
    } else {
      // Fallback: routing offline notice
      setActiveAlert({
        title: 'ROUTING NOTICE',
        message: 'OSRM routing offline: falling back to straight-line navigation.',
        type: 'info'
      })
      setTimeout(() => setActiveAlert(null), 3500)
    }

    // 4. Update Incident record in Firestore
    await updateDocument('incidents', incident.id, {
      status: 'dispatched',
      assignedUnitId: selectedUnit.id,
      assignedHospitalId: assignedHospital ? assignedHospital.id : null
    })

    // 5. Update Unit record in Firestore
    await updateDocument('units', selectedUnit.id, {
      status: 'dispatched',
      stage: 'en_route_scene',
      currentIncidentId: incident.id,
      targetLocation: incident.location,
      targetType: 'incident',
      currentRoute: routeCoords,
      routeIndex: 1,
      routeDistance: routeDistanceKm,
      routeDuration: routeDurationMins
    })

    // Operator notification toast with OSRM distance and duration (or fallback)
    setActiveAlert({
      title: `UNIT DISPATCHED: ${selectedUnit.callsign}`,
      message: `Unit ${selectedUnit.callsign} selected. Distance: ${distanceText}, Traffic Index: ${selectedUnit.trafficFactor}x, ETA: ~${etaMinutes}m ${assignedHospital ? `→ Assigned to ${assignedHospital.name}` : ''}`,
      type: 'success'
    })

    setTimeout(() => setActiveAlert(null), 6000)
  }, [])

  // Create new incident from manual intake form
  const handleCreateIncident = async (newIncident, autoDispatch = false) => {
    const docId = await addDocument('incidents', newIncident)
    const createdIncident = { ...newIncident, id: docId }

    setSelectedIncidentId(docId)

    if (autoDispatch) {
      setTimeout(() => {
        handleAutoDispatch(createdIncident)
      }, 200)
    }

    setActiveAlert({
      title: `INCIDENT #${docId} CREATED`,
      message: `Priority: ${newIncident.severity.toUpperCase()} | Type: ${newIncident.type.toUpperCase()}`,
      type: 'info'
    })
    setTimeout(() => setActiveAlert(null), 4000)
  }

  // Resolve incident manually
  const handleResolveIncident = async (incidentId) => {
    const inc = incidents.find(i => i.id === incidentId)
    if (!inc) return

    await updateDocument('incidents', incidentId, {
      status: 'resolved',
      resolvedAt: new Date().toISOString()
    })

    // If unit was assigned to this incident, return unit to base
    if (inc.assignedUnitId) {
      const unit = units.find(u => u.id === inc.assignedUnitId)
      if (unit) {
        const baseLoc = unit.baseLocation || unit.location

        // Remove route signals when incident is resolved
        setDynamicSignals(prev => prev.filter(s => s.unitId !== unit.id))

        await updateDocument('units', unit.id, {
          status: 'returning',
          stage: 'returning_to_base',
          currentIncidentId: null,
          targetLocation: baseLoc,
          targetType: 'base',
          currentRoute: null,
          routeIndex: 0
        })

        // Fetch return leg route to base outside tick
        fetchRoadRoute(unit.location, baseLoc).then(async (routeRes) => {
          if (routeRes.success) {
            await updateDocument('units', unit.id, {
              currentRoute: routeRes.coordinates,
              routeIndex: 1,
              routeDistance: routeRes.distanceKm,
              routeDuration: routeRes.durationMinutes * 60
            })
          }
        })
      }
    }
  }

  // Recall Unit to Base
  const handleRecallUnit = async (unitId) => {
    const unit = units.find(u => u.id === unitId)
    if (!unit) return

    await updateDocument('units', unitId, {
      status: 'available',
      stage: 'idle',
      currentIncidentId: null,
      targetLocation: null,
      targetType: null,
      currentRoute: null,
      routeIndex: 0
    })

    // Remove route signals when unit is recalled
    setDynamicSignals(prev => prev.filter(s => s.unitId !== unitId))
  }

  // Hospital capacity manual adjustment
  const handleUpdateHospitalCapacity = async (hospitalId, resource, newCount) => {
    const hospital = hospitals.find(h => h.id === hospitalId)
    if (!hospital) return

    await updateDocument('hospitals', hospitalId, {
      capacity: {
        ...hospital.capacity,
        [resource]: Math.max(0, newCount)
      }
    })
  }

  // Reseed Database
  const handleReseed = async () => {
    setDynamicSignals([])
    const res = await seedCADDatabase()
    if (res.success) {
      setActiveAlert({
        title: 'DATABASE RESEEDED',
        message: 'All units, hospitals, and incidents reset to default state.',
        type: 'info'
      })
      setTimeout(() => setActiveAlert(null), 4000)
    }
  }

  return (
    <div className="console-app">
      {/* Top Bar with Metrics & Live Clocks */}
      <TopBar
        incidents={incidents}
        units={units}
        isSimRunning={isSimRunning}
        onToggleSim={() => setIsSimRunning(!isSimRunning)}
        onOpenIntake={() => setIsIntakeOpen(true)}
        onReseed={handleReseed}
        onOpenFirebaseSettings={() => setIsFirebaseSettingsOpen(true)}
        onOpenFutureWork={() => setIsFutureWorkOpen(true)}
        firebaseMode={firebaseMode}
      />

      {/* Alert Notification Toast */}
      {activeAlert && (
        <div style={{
          position: 'fixed',
          top: '56px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 3000,
          background: 'var(--bg-panel)',
          border: '1px solid var(--accent-dispatched-border)',
          borderLeft: '4px solid var(--accent-dispatched)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
          padding: '8px 16px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-primary)'
        }}>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--accent-dispatched)' }}>{activeAlert.title}</div>
            <div className="text-muted">{activeAlert.message}</div>
          </div>
        </div>
      )}

      {/* Main 3-Zone Workspace Console */}
      <div className="console-workspace">
        {/* Left Zone: Incident Queue */}
        <IncidentQueue
          incidents={incidents}
          units={units}
          hospitals={hospitals}
          selectedIncidentId={selectedIncidentId}
          onSelectIncident={(id) => {
            setSelectedIncidentId(id)
            setSelectedUnitId(null)
          }}
          onAutoDispatch={handleAutoDispatch}
          onResolveIncident={handleResolveIncident}
        />

        {/* Center Zone: Dominant Leaflet Map Console */}
        <MapConsole
          incidents={incidents}
          units={units}
          hospitals={hospitals}
          trafficSignals={dynamicSignals}
          selectedIncidentId={selectedIncidentId}
          selectedUnitId={selectedUnitId}
          onSelectIncident={(id) => {
            setSelectedIncidentId(id)
            setSelectedUnitId(null)
          }}
          onSelectUnit={(id) => {
            setSelectedUnitId(id)
            setSelectedIncidentId(null)
          }}
          onAutoDispatch={handleAutoDispatch}
        />

        {/* Right Zone: Unit Roster & Hospital Facilities */}
        <aside className="console-sidebar sidebar-right">
          {/* Right Panel Tab Switcher */}
          <div className="panel-header" style={{ padding: '0 8px', background: 'var(--bg-panel-secondary)' }}>
            <div style={{ display: 'flex', width: '100%', gap: '4px', padding: '6px 0' }}>
              <button
                className={`btn btn-sm ${rightTab === 'units' ? 'btn-primary' : ''}`}
                style={{ flex: 1, padding: '4px 6px', fontSize: '11px' }}
                onClick={() => setRightTab('units')}
              >
                <Truck size={12} />
                <span>UNITS ({units.length})</span>
              </button>
              <button
                className={`btn btn-sm ${rightTab === 'hospitals' ? 'btn-primary' : ''}`}
                style={{ flex: 1, padding: '4px 6px', fontSize: '11px' }}
                onClick={() => setRightTab('hospitals')}
              >
                <Building2 size={12} />
                <span>HOSPITALS ({hospitals.length})</span>
              </button>
            </div>
          </div>

          {rightTab === 'units' ? (
            <UnitRoster
              units={units}
              incidents={incidents}
              selectedUnitId={selectedUnitId}
              onSelectUnit={(id) => {
                setSelectedUnitId(id)
                setSelectedIncidentId(null)
              }}
              onRecallUnit={handleRecallUnit}
            />
          ) : (
            <HospitalRoster
              hospitals={hospitals}
              selectedHospitalId={selectedHospitalId}
              onSelectHospital={(id) => setSelectedHospitalId(id)}
              onUpdateHospitalCapacity={handleUpdateHospitalCapacity}
            />
          )}
        </aside>
      </div>

      {/* Modals */}
      <IncidentIntakeModal
        isOpen={isIntakeOpen}
        onClose={() => setIsIntakeOpen(false)}
        onSubmitIncident={handleCreateIncident}
      />

      <FutureWorkModal
        isOpen={isFutureWorkOpen}
        onClose={() => setIsFutureWorkOpen(false)}
      />

      <FirebaseSettingsModal
        isOpen={isFirebaseSettingsOpen}
        onClose={() => setIsFirebaseSettingsOpen(false)}
        onConfigChanged={() => setFirebaseMode(getFirebaseMode())}
        onReseedCompleted={() => setFirebaseMode(getFirebaseMode())}
      />
    </div>
  )
}
