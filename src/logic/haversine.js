/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 *
 * @param {number} lat1 Latitude of point 1 in degrees
 * @param {number} lon1 Longitude of point 1 in degrees
 * @param {number} lat2 Latitude of point 2 in degrees
 * @param {number} lon2 Longitude of point 2 in degrees
 * @returns {number} Distance in kilometers
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return Infinity
  }

  const R = 6371 // Earth's radius in kilometers
  const toRad = (angle) => (angle * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Calculates distance in meters between two lat/lng points.
 */
export function calculateDistanceInMeters(lat1, lon1, lat2, lon2) {
  return calculateHaversineDistance(lat1, lon1, lat2, lon2) * 1000
}

/**
 * Calculates estimated time of arrival (ETA) in minutes
 * assuming average emergency vehicle speed (e.g., 48 km/h or 30 mph with sirens).
 */
export function calculateETA(distanceKm, trafficFactor = 1.0, speedKmh = 48) {
  if (!distanceKm || distanceKm === Infinity) return 0
  const effectiveSpeed = speedKmh / trafficFactor
  const hours = distanceKm / effectiveSpeed
  return Math.max(1, Math.round(hours * 60))
}
