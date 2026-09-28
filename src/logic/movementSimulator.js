import { calculateHaversineDistance, calculateDistanceInMeters } from './haversine.js'

/**
 * Calculates a single interpolated step towards a target coordinate.
 *
 * @param {{ lat: number, lng: number }} current Current coordinates
 * @param {{ lat: number, lng: number }} target Target coordinates
 * @param {number} stepFraction Fraction of distance to cover per tick (e.g. 0.08)
 * @returns {{ lat: number, lng: number, distanceRemainingMeters: number }}
 */
export function calculateStepTowardsTarget(current, target, stepFraction = 0.09) {
  if (!current || !target) return { ...current, distanceRemainingMeters: 0 }

  const distMeters = calculateDistanceInMeters(current.lat, current.lng, target.lat, target.lng)

  // Arrival threshold: within 60 meters
  if (distMeters <= 60) {
    return {
      lat: target.lat,
      lng: target.lng,
      distanceRemainingMeters: 0,
      arrived: true
    }
  }

  // Linear interpolation step with slight jitter for realism
  const newLat = current.lat + (target.lat - current.lat) * stepFraction
  const newLng = current.lng + (target.lng - current.lng) * stepFraction

  const newDistMeters = calculateDistanceInMeters(newLat, newLng, target.lat, target.lng)

  return {
    lat: Number(newLat.toFixed(6)),
    lng: Number(newLng.toFixed(6)),
    distanceRemainingMeters: Math.round(newDistMeters),
    arrived: false
  }
}

/**
 * Calculates movement step along a route geometry array towards target.
 *
 * @param {{ lat: number, lng: number }} current Current coordinates
 * @param {Array<{ lat: number, lng: number }>} route Waypoint coordinates
 * @param {number} routeIndex Target waypoint index
 * @param {number} stepMeters Distance in meters to advance
 * @returns {{
 *   lat: number,
 *   lng: number,
 *   routeIndex: number,
 *   arrived: boolean
 * }}
 */
export function calculateStepAlongRoute(current, route, routeIndex = 1, stepMeters = 70) {
  if (!route || route.length === 0) {
    return { lat: current.lat, lng: current.lng, routeIndex: 0, arrived: true }
  }

  let currLat = current.lat
  let currLng = current.lng
  let idx = Math.max(1, Math.min(routeIndex, route.length - 1))
  let remainingDistance = stepMeters

  while (remainingDistance > 0 && idx < route.length) {
    const nextWaypoint = route[idx]
    const distToNext = calculateDistanceInMeters(currLat, currLng, nextWaypoint.lat, nextWaypoint.lng)

    if (distToNext <= remainingDistance) {
      remainingDistance -= distToNext
      currLat = nextWaypoint.lat
      currLng = nextWaypoint.lng
      idx++
    } else {
      const fraction = remainingDistance / distToNext
      currLat = currLat + (nextWaypoint.lat - currLat) * fraction
      currLng = currLng + (nextWaypoint.lng - currLng) * fraction
      remainingDistance = 0
    }
  }

  const destination = route[route.length - 1]
  const distToFinal = calculateDistanceInMeters(currLat, currLng, destination.lat, destination.lng)

  if (idx >= route.length || distToFinal <= 40) {
    return {
      lat: Number(destination.lat.toFixed(6)),
      lng: Number(destination.lng.toFixed(6)),
      routeIndex: route.length,
      arrived: true
    }
  }

  return {
    lat: Number(currLat.toFixed(6)),
    lng: Number(currLng.toFixed(6)),
    routeIndex: idx,
    arrived: false
  }
}

/**
 * Simulates a single tick of movement across all dispatched/returning units.
 * Updates unit coordinates and advances incident life-cycle.
 *
 * @param {Array<Object>} units
 * @param {Array<Object>} incidents
 * @param {Array<Object>} hospitals
 * @returns {{
 *   updatedUnits: Array<Object>,
 *   resolvedIncidentIds: Array<string>,
 *   updatedIncidents: Array<Object>,
 *   legTransitions: Array<Object>
 * }}
 */
export function advanceSimulationTick(units, incidents, hospitals) {
  const updatedUnits = []
  const resolvedIncidentIds = []
  const updatedIncidents = []
  const legTransitions = []

  for (const unit of units) {
    // Only units that are moving need position updates
    if (unit.status !== 'dispatched' && unit.status !== 'returning') {
      updatedUnits.push(unit)
      continue
    }

    const currentLoc = unit.location
    let targetLoc = unit.targetLocation

    // If unit has an assigned incident but no explicit targetLocation, set it to the incident
    const assignedIncident = incidents.find(inc => inc.id === unit.currentIncidentId)

    if (!targetLoc && assignedIncident) {
      targetLoc = assignedIncident.location
    }

    // If returning and no target, target is base station
    if (unit.status === 'returning' && !targetLoc && unit.baseLocation) {
      targetLoc = unit.baseLocation
    }

    if (!targetLoc && (!unit.currentRoute || unit.currentRoute.length === 0)) {
      updatedUnits.push(unit)
      continue
    }

    // Calculate step: prefer route geometry if available, otherwise straight-line interpolation
    let stepResult
    if (unit.currentRoute && unit.currentRoute.length > 1) {
      const totalDist = unit.routeDistance ? (unit.routeDistance * 1000) : 2500
      const stepMeters = Math.max(65, (totalDist / 20) / (unit.trafficFactor || 1.1))
      stepResult = calculateStepAlongRoute(currentLoc, unit.currentRoute, unit.routeIndex || 1, stepMeters)
    } else {
      stepResult = calculateStepTowardsTarget(currentLoc, targetLoc)
    }

    // Handle arrival logic
    if (stepResult.arrived) {
      if (unit.status === 'dispatched') {
        // Dispatched unit arrived at target
        if (unit.stage === 'en_route_hospital' || (!unit.stage && unit.targetType === 'hospital')) {
          // Arrived at hospital: patient handed off, incident resolved!
          if (assignedIncident) {
            resolvedIncidentIds.push(assignedIncident.id)
            updatedIncidents.push({
              ...assignedIncident,
              status: 'resolved',
              resolvedAt: new Date().toISOString()
            })
          }

          const baseLoc = unit.baseLocation || currentLoc
          legTransitions.push({
            unitId: unit.id,
            stage: 'returning_to_base',
            start: { lat: stepResult.lat, lng: stepResult.lng },
            end: baseLoc
          })

          // Unit now returns to station
          updatedUnits.push({
            ...unit,
            location: { lat: stepResult.lat, lng: stepResult.lng },
            status: 'returning',
            stage: 'returning_to_base',
            currentIncidentId: null,
            targetLocation: baseLoc,
            targetType: 'base',
            currentRoute: null,
            routeIndex: 0
          })
        } else {
          // Arrived at incident scene
          if (assignedIncident && assignedIncident.type === 'medical' && assignedIncident.assignedHospitalId) {
            // Medical: pickup patient, next waypoint is hospital
            const hospital = hospitals.find(h => h.id === assignedIncident.assignedHospitalId)
            const hospitalTarget = hospital ? hospital.location : (unit.baseLocation || currentLoc)

            legTransitions.push({
              unitId: unit.id,
              stage: 'en_route_hospital',
              start: { lat: stepResult.lat, lng: stepResult.lng },
              end: hospitalTarget
            })

            updatedUnits.push({
              ...unit,
              location: { lat: stepResult.lat, lng: stepResult.lng },
              status: 'dispatched',
              stage: 'en_route_hospital',
              targetLocation: hospitalTarget,
              targetType: 'hospital',
              currentRoute: null,
              routeIndex: 0
            })
          } else {
            // Fire or on-scene resolution: fire knocked down / treated on scene
            if (assignedIncident) {
              resolvedIncidentIds.push(assignedIncident.id)
              updatedIncidents.push({
                ...assignedIncident,
                status: 'resolved',
                resolvedAt: new Date().toISOString()
              })
            }

            const baseLoc = unit.baseLocation || currentLoc
            legTransitions.push({
              unitId: unit.id,
              stage: 'returning_to_base',
              start: { lat: stepResult.lat, lng: stepResult.lng },
              end: baseLoc
            })

            updatedUnits.push({
              ...unit,
              location: { lat: stepResult.lat, lng: stepResult.lng },
              status: 'returning',
              stage: 'returning_to_base',
              currentIncidentId: null,
              targetLocation: baseLoc,
              targetType: 'base',
              currentRoute: null,
              routeIndex: 0
            })
          }
        }
      } else if (unit.status === 'returning') {
        // Returned to base station: unit is now available for new dispatches!
        updatedUnits.push({
          ...unit,
          location: { lat: stepResult.lat, lng: stepResult.lng },
          status: 'available',
          stage: 'idle',
          currentIncidentId: null,
          targetLocation: null,
          targetType: null,
          currentRoute: null,
          routeIndex: 0
        })
      }
    } else {
      // Unit is still in transit towards target
      updatedUnits.push({
        ...unit,
        location: { lat: stepResult.lat, lng: stepResult.lng },
        routeIndex: stepResult.routeIndex ?? unit.routeIndex
      })
    }
  }

  return {
    updatedUnits,
    resolvedIncidentIds,
    updatedIncidents,
    legTransitions
  }
}
