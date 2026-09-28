import { calculateDistanceInMeters } from './haversine.js'

/**
 * Evaluates traffic signal preemption status against all actively dispatched units.
 * - Dynamic route signals:
 *   If the assigned unit has passed the signal along the route geometry,
 *   the signal turns back to RED.
 *   If within preemptionRadiusMeters (default 300m) and not yet passed, flips to GREEN.
 * - Fixed/other signals:
 *   If any dispatched unit is within preemptionRadiusMeters (default 300m), flips to GREEN.
 *
 * @param {Array<Object>} signals Traffic signal nodes
 * @param {Array<Object>} units Fleet units
 * @param {number} preemptionRadiusMeters Activation radius in meters (default 300m)
 * @returns {Array<Object>} Updated traffic signals with override status
 */
export function evaluateSignalPreemption(signals, units, preemptionRadiusMeters = 300) {
  if (!signals || signals.length === 0) return []

  const activeDispatchedUnits = (units || []).filter(u => u.status === 'dispatched')

  return signals.map(signal => {
    // If signal is bound to a specific unit & route index
    if (signal.unitId) {
      const assignedUnit = activeDispatchedUnits.find(u => u.id === signal.unitId)
      if (!assignedUnit) {
        return {
          ...signal,
          status: 'red',
          preemptedBy: null,
          preemptedUnitId: null,
          distanceToNearestUnitMeters: null,
          passed: signal.passed || false
        }
      }

      // Check if unit has passed this waypoint along the route geometry
      const hasPassed = (assignedUnit.routeIndex !== undefined && signal.routeIndex !== undefined && assignedUnit.routeIndex > signal.routeIndex)

      if (hasPassed) {
        return {
          ...signal,
          status: 'red',
          preemptedBy: null,
          preemptedUnitId: null,
          passed: true
        }
      }

      // Proximity check (within 300m)
      const distMeters = calculateDistanceInMeters(
        assignedUnit.location.lat,
        assignedUnit.location.lng,
        signal.location.lat,
        signal.location.lng
      )

      const isPreempted = distMeters <= preemptionRadiusMeters

      return {
        ...signal,
        status: isPreempted ? 'green' : 'red',
        preemptedBy: isPreempted ? assignedUnit.callsign : null,
        preemptedUnitId: isPreempted ? assignedUnit.id : null,
        distanceToNearestUnitMeters: Math.round(distMeters),
        passed: false
      }
    }

    // Generic fallback for any fixed signals
    let isPreempted = false
    let preemptingUnit = null
    let minDistance = Infinity

    for (const unit of activeDispatchedUnits) {
      const distMeters = calculateDistanceInMeters(
        unit.location.lat,
        unit.location.lng,
        signal.location.lat,
        signal.location.lng
      )

      if (distMeters < minDistance) {
        minDistance = distMeters
      }

      if (distMeters <= preemptionRadiusMeters) {
        isPreempted = true
        preemptingUnit = unit
      }
    }

    return {
      ...signal,
      status: isPreempted ? 'green' : 'red',
      preemptedBy: isPreempted ? preemptingUnit.callsign : null,
      preemptedUnitId: isPreempted ? preemptingUnit.id : null,
      distanceToNearestUnitMeters: minDistance === Infinity ? null : Math.round(minDistance)
    }
  })
}
