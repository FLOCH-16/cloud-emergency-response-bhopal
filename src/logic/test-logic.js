import { calculateHaversineDistance, calculateETA } from './haversine.js'
import { classifySeverity } from './severityClassifier.js'
import { findBestUnitForIncident } from './dispatchEngine.js'
import { matchHospitalForIncident, decrementHospitalCapacity } from './hospitalMatcher.js'
import { calculateStepTowardsTarget, advanceSimulationTick } from './movementSimulator.js'
import { evaluateSignalPreemption } from './trafficSignalPreemption.js'

console.log('--- Testing Haversine & ETA ---')
const d = calculateHaversineDistance(40.7128, -74.0060, 40.7306, -73.9352)
console.log(`Distance NYC coords: ${d.toFixed(2)} km`)
const eta = calculateETA(d, 1.2)
console.log(`ETA: ${eta} mins`)

console.log('\n--- Testing Severity Classifier ---')
const c1 = classifySeverity('Elderly patient suffering cardiac arrest and unconscious', 'medical')
console.log('Result 1 (cardiac arrest):', c1)
if (c1.severity !== 'critical') throw new Error('Expected critical')

const c2 = classifySeverity('Small dumpster fire with light smoke odor', 'fire')
console.log('Result 2 (dumpster fire):', c2)
if (c2.severity !== 'low') throw new Error('Expected low')

const c3 = classifySeverity('Arm fracture following ladder fall', 'medical')
console.log('Result 3 (fracture):', c3)
if (c3.severity !== 'moderate') throw new Error('Expected moderate')

console.log('\n--- Testing Dispatch Engine ---')
const sampleUnits = [
  { id: 'u1', type: 'ambulance', callsign: 'MED-1', status: 'available', location: { lat: 40.7150, lng: -74.0020 }, trafficFactor: 1.1 },
  { id: 'u2', type: 'ambulance', callsign: 'MED-2', status: 'available', location: { lat: 40.7400, lng: -73.9800 }, trafficFactor: 1.4 },
  { id: 'u3', type: 'ambulance', callsign: 'MED-3', status: 'dispatched', location: { lat: 40.7130, lng: -74.0050 }, trafficFactor: 1.0 },
  { id: 'u4', type: 'fire_truck', callsign: 'TRK-1', status: 'available', location: { lat: 40.7140, lng: -74.0040 }, trafficFactor: 1.2 }
]
const medIncident = { id: 'inc1', type: 'medical', severity: 'critical', location: { lat: 40.7160, lng: -74.0010 } }
const dispatchRes = findBestUnitForIncident(sampleUnits, medIncident)
console.log('Dispatch Match:', dispatchRes.selectedUnit?.callsign, 'Diagnostics:', dispatchRes.diagnostics)
if (dispatchRes.selectedUnit?.id !== 'u1') throw new Error('Expected MED-1')

console.log('\n--- Testing Hospital Matcher ---')
const sampleHospitals = [
  { id: 'h1', name: 'Downtown Trauma', location: { lat: 40.7100, lng: -74.0050 }, capacity: { icuBeds: 0, generalBeds: 12, oxygen: 30, ventilators: 5 } },
  { id: 'h2', name: 'Midtown General', location: { lat: 40.7500, lng: -73.9850 }, capacity: { icuBeds: 4, generalBeds: 20, oxygen: 50, ventilators: 15 } }
]
const hospRes = matchHospitalForIncident(sampleHospitals, medIncident)
console.log('Hospital Match:', hospRes.matchedHospital?.name, 'Reason:', hospRes.reason)
if (hospRes.matchedHospital?.id !== 'h2') throw new Error('Expected h2 (Midtown General) because h1 has 0 ICU beds for critical incident')

console.log('\n--- Testing Movement Simulator ---')
const step = calculateStepTowardsTarget({ lat: 40.7100, lng: -74.0000 }, { lat: 40.7200, lng: -74.0000 }, 0.1)
console.log('Step stepFraction=0.1:', step)

console.log('\n--- Testing Traffic Preemption ---')
const signals = [
  { id: 'ts1', name: 'Main & 1st', location: { lat: 40.7155, lng: -74.0015 }, status: 'red' }
]
const premRes = evaluateSignalPreemption(signals, [{ ...sampleUnits[0], status: 'dispatched' }], 500)
console.log('Signal Preemption Result:', premRes[0].status, 'Preempted by:', premRes[0].preemptedBy)

console.log('\nALL UNIT LOGIC TESTS PASSED SUCCESSFULLY!')
