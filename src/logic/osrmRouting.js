import { calculateDistanceInMeters } from './haversine.js'

/**
 * Fetches real road route geometry from public OSRM server.
 * Coordinates are passed as {lng},{lat};{lng},{lat} per OSRM API specification.
 * Includes a 3-second timeout fallback.
 *
 * @param {{ lat: number, lng: number }} start Start coordinates
 * @param {{ lat: number, lng: number }} end End coordinates
 * @returns {Promise<{
 *   success: boolean,
 *   coordinates?: Array<{ lat: number, lng: number }>,
 *   distanceKm?: number,
 *   durationMinutes?: number,
 *   error?: string
 * }>}
 */
export async function fetchRoadRoute(start, end) {
  if (!start || !end || typeof start.lat !== 'number' || typeof end.lat !== 'number') {
    return { success: false, error: 'Invalid start or end coordinates' }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3000)

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!res.ok) {
      throw new Error(`OSRM HTTP error ${res.status}`)
    }

    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes || !data.routes.length) {
      throw new Error('No route found in OSRM response')
    }

    const route = data.routes[0]
    // GeoJSON coordinates are [lng, lat]
    const coordinates = (route.geometry?.coordinates || []).map(([lng, lat]) => ({
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6))
    }))

    if (coordinates.length < 2) {
      throw new Error('OSRM returned empty geometry')
    }

    const distanceKm = Number((route.distance / 1000).toFixed(2))
    const durationMinutes = Number((route.duration / 60).toFixed(1))

    return {
      success: true,
      coordinates,
      distanceKm,
      durationMinutes
    }
  } catch (err) {
    clearTimeout(timeoutId)
    return {
      success: false,
      error: err.name === 'AbortError' ? 'OSRM request timed out (3s)' : (err.message || 'Routing offline')
    }
  }
}

/**
 * Places 3 simulated signal points at roughly 25%, 50%, and 75% along route geometry.
 * Every dynamic route signal belongs to exactly one unit and one route leg.
 *
 * @param {Object} unit Dispatched unit
 * @param {Array<{ lat: number, lng: number }>} routeCoords Route coordinate array
 * @param {string} leg Current route leg (e.g. 'en_route_scene' | 'en_route_hospital' | 'returning_to_base')
 * @returns {Array<Object>} 3 dynamic signal objects
 */
export function generateRouteSignals(unit, routeCoords, leg = 'en_route_scene') {
  if (!routeCoords || routeCoords.length < 4 || !unit) return []

  const idx25 = Math.max(1, Math.floor(routeCoords.length * 0.25))
  const idx50 = Math.max(idx25 + 1, Math.floor(routeCoords.length * 0.50))
  const idx75 = Math.max(idx50 + 1, Math.floor(routeCoords.length * 0.75))

  return [
    {
      id: `SIG-${unit.id}-${leg}-25`,
      unitId: unit.id,
      leg: leg,
      name: `Intersection 25% (${unit.callsign})`,
      intersection: `Route Mile 0.25`,
      location: routeCoords[idx25],
      routeIndex: idx25,
      status: 'red',
      preemptedBy: null,
      passed: false,
      isDynamic: true
    },
    {
      id: `SIG-${unit.id}-${leg}-50`,
      unitId: unit.id,
      leg: leg,
      name: `Intersection 50% (${unit.callsign})`,
      intersection: `Route Mile 0.50`,
      location: routeCoords[idx50],
      routeIndex: idx50,
      status: 'red',
      preemptedBy: null,
      passed: false,
      isDynamic: true
    },
    {
      id: `SIG-${unit.id}-${leg}-75`,
      unitId: unit.id,
      leg: leg,
      name: `Intersection 75% (${unit.callsign})`,
      intersection: `Route Mile 0.75`,
      location: routeCoords[idx75],
      routeIndex: idx75,
      status: 'red',
      preemptedBy: null,
      passed: false,
      isDynamic: true
    }
  ]
}
