import { calculateHaversineDistance, calculateETA } from './haversine.js'

/**
 * Maps an incident type to the required unit type.
 * @param {'medical' | 'fire'} incidentType
 * @returns {'ambulance' | 'fire_truck'}
 */
export function getRequiredUnitType(incidentType) {
  return incidentType === 'medical' ? 'ambulance' : 'fire_truck'
}

/**
 * Pure dispatch scoring engine.
 * Filters available units matching required type, computes distance via haversine,
 * applies traffic factor (score = distance * trafficFactor), and selects the lowest score.
 *
 * @param {Array<Object>} units List of all units in roster
 * @param {Object} incident Incident object with { type, location: { lat, lng } }
 * @returns {{
 *   selectedUnit: Object | null,
 *   rankedUnits: Array<Object>,
 *   diagnostics: string
 * }}
 */
export function findBestUnitForIncident(units, incident) {
  if (!incident || !incident.location) {
    return { selectedUnit: null, rankedUnits: [], diagnostics: 'Invalid incident or missing coordinates' }
  }

  const requiredType = getRequiredUnitType(incident.type)

  // 1. Filter units by matching type and "available" status
  const eligibleUnits = units.filter(
    u => u.type === requiredType && u.status === 'available'
  )

  if (eligibleUnits.length === 0) {
    return {
      selectedUnit: null,
      rankedUnits: [],
      diagnostics: `No available ${requiredType === 'ambulance' ? 'ambulances' : 'fire trucks'} currently in service`
    }
  }

  // 2. Score each eligible unit
  const scoredUnits = eligibleUnits.map(unit => {
    const rawDistanceKm = calculateHaversineDistance(
      unit.location.lat,
      unit.location.lng,
      incident.location.lat,
      incident.location.lng
    )

    // Ensure unit has a traffic factor (default 1.0 - 1.5)
    const trafficFactor = unit.trafficFactor || (1.0 + Math.random() * 0.4)
    // Dispatch score = distance * trafficFactor (lower is better)
    const dispatchScore = rawDistanceKm * trafficFactor
    const etaMinutes = calculateETA(rawDistanceKm, trafficFactor)

    return {
      ...unit,
      rawDistanceKm: Number(rawDistanceKm.toFixed(2)),
      trafficFactor: Number(trafficFactor.toFixed(2)),
      dispatchScore: Number(dispatchScore.toFixed(3)),
      etaMinutes
    }
  })

  // 3. Sort by lowest dispatch score
  scoredUnits.sort((a, b) => a.dispatchScore - b.dispatchScore)

  const selectedUnit = scoredUnits[0]

  return {
    selectedUnit,
    rankedUnits: scoredUnits,
    diagnostics: `Unit ${selectedUnit.callsign} selected. Distance: ${selectedUnit.rawDistanceKm}km, Traffic Index: ${selectedUnit.trafficFactor}x, ETA: ~${selectedUnit.etaMinutes}m`
  }
}
