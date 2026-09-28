import { calculateHaversineDistance } from './haversine.js'

/**
 * Finds the nearest hospital with sufficient relevant bed capacity.
 * Medical incidents only.
 * - Critical severity requires icuBeds > 0
 * - Moderate / Low severity requires generalBeds > 0
 *
 * @param {Array<Object>} hospitals List of hospital objects
 * @param {Object} incident Incident object with severity and location
 * @returns {{
 *   matchedHospital: Object | null,
 *   candidateHospitals: Array<Object>,
 *   requiredResource: 'icuBeds' | 'generalBeds',
 *   reason: string
 * }}
 */
export function matchHospitalForIncident(hospitals, incident) {
  if (!hospitals || hospitals.length === 0) {
    return {
      matchedHospital: null,
      candidateHospitals: [],
      requiredResource: 'generalBeds',
      reason: 'No hospital facilities registered in system'
    }
  }

  // Determine required resource based on severity
  const isCritical = incident.severity === 'critical'
  const requiredResource = isCritical ? 'icuBeds' : 'generalBeds'

  // Filter hospitals with capacity > 0 for required resource
  const candidates = hospitals.filter(h => {
    const capacityVal = h.capacity && h.capacity[requiredResource]
    return typeof capacityVal === 'number' && capacityVal > 0
  })

  if (candidates.length === 0) {
    return {
      matchedHospital: null,
      candidateHospitals: [],
      requiredResource,
      reason: `Resource saturation: No regional hospitals currently have available ${isCritical ? 'ICU Beds' : 'General Beds'}`
    }
  }

  // Calculate distance from incident location to each candidate hospital
  const scoredCandidates = candidates.map(hospital => {
    const distanceKm = calculateHaversineDistance(
      incident.location.lat,
      incident.location.lng,
      hospital.location.lat,
      hospital.location.lng
    )

    return {
      ...hospital,
      distanceKm: Number(distanceKm.toFixed(2))
    }
  })

  // Sort by nearest distance
  scoredCandidates.sort((a, b) => a.distanceKm - b.distanceKm)
  const matched = scoredCandidates[0]

  return {
    matchedHospital: matched,
    candidateHospitals: scoredCandidates,
    requiredResource,
    reason: `Matched to ${matched.name} (${matched.distanceKm} km away). Available ${requiredResource}: ${matched.capacity[requiredResource]}`
  }
}

/**
 * Decrements the allocated resource capacity for a hospital.
 * 
 * @param {Object} hospital 
 * @param {'icuBeds' | 'generalBeds'} resource 
 * @returns {Object} Updated hospital object with decremented capacity
 */
export function decrementHospitalCapacity(hospital, resource) {
  if (!hospital || !hospital.capacity) return hospital

  const currentVal = hospital.capacity[resource] || 0
  const newVal = Math.max(0, currentVal - 1)

  return {
    ...hospital,
    capacity: {
      ...hospital.capacity,
      [resource]: newVal
    }
  }
}
