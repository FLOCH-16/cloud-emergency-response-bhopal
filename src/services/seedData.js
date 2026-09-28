/**
 * Realistic seed data for PULSE C4I Dispatch Console.
 * Centered on Downtown / Civic Center / SoMa / Mission grid.
 */

export const SEED_HOSPITALS = [
  {
    id: 'hosp-trauma-1',
    name: 'Metro General Trauma Center',
    code: 'MGTC-01',
    location: { lat: 37.7562, lng: -122.4065 }, // Potrero Ave
    capacity: {
      icuBeds: 6,
      generalBeds: 28,
      oxygen: 95,
      ventilators: 12
    },
    tier: 'Level 1 Trauma',
    status: 'operational'
  },
  {
    id: 'hosp-memorial-2',
    name: 'Saint Francis Memorial Hospital',
    code: 'SFMH-02',
    location: { lat: 37.7892, lng: -122.4158 }, // Hyde St / Nob Hill
    capacity: {
      icuBeds: 4,
      generalBeds: 18,
      oxygen: 80,
      ventilators: 8
    },
    tier: 'Acute Care & Burn Center',
    status: 'operational'
  },
  {
    id: 'hosp-uc-center-3',
    name: 'University Health Hospital & ER',
    code: 'UHMC-03',
    location: { lat: 37.7631, lng: -122.4578 }, // Parnassus
    capacity: {
      icuBeds: 8,
      generalBeds: 34,
      oxygen: 110,
      ventilators: 16
    },
    tier: 'Level 1 Comprehensive',
    status: 'operational'
  },
  {
    id: 'hosp-mission-4',
    name: 'Mission Bay Pediatric & Emergency',
    code: 'MBPE-04',
    location: { lat: 37.7680, lng: -122.3905 }, // Mission Bay 16th St
    capacity: {
      icuBeds: 3,
      generalBeds: 14,
      oxygen: 60,
      ventilators: 5
    },
    tier: 'Specialty Emergency',
    status: 'operational'
  }
]

export const SEED_UNITS = [
  {
    id: 'unit-med-101',
    callsign: 'MEDIC-101',
    type: 'ambulance',
    status: 'available',
    location: { lat: 37.7785, lng: -122.4156 }, // Civic Center Station
    baseLocation: { lat: 37.7785, lng: -122.4156 },
    trafficFactor: 1.08,
    currentIncidentId: null,
    targetLocation: null,
    targetType: null,
    stage: 'idle',
    crew: 'Paramedic Miller / EMT Davis',
    fuel: '92%'
  },
  {
    id: 'unit-med-104',
    callsign: 'MEDIC-104',
    type: 'ambulance',
    status: 'available',
    location: { lat: 37.7885, lng: -122.4010 }, // Financial District / SOMA Station
    baseLocation: { lat: 37.7885, lng: -122.4010 },
    trafficFactor: 1.15,
    currentIncidentId: null,
    targetLocation: null,
    targetType: null,
    stage: 'idle',
    crew: 'Paramedic Chen / EMT Vasquez',
    fuel: '88%'
  },
  {
    id: 'unit-med-109',
    callsign: 'MEDIC-109',
    type: 'ambulance',
    status: 'available',
    location: { lat: 37.7600, lng: -122.4188 }, // Mission Station 7
    baseLocation: { lat: 37.7600, lng: -122.4188 },
    trafficFactor: 1.12,
    currentIncidentId: null,
    targetLocation: null,
    targetType: null,
    stage: 'idle',
    crew: 'Paramedic Hayes / EMT O\'Connor',
    fuel: '76%'
  },
  {
    id: 'unit-med-112',
    callsign: 'MEDIC-112',
    type: 'ambulance',
    status: 'available',
    location: { lat: 37.7712, lng: -122.4340 }, // Western Addition Station
    baseLocation: { lat: 37.7712, lng: -122.4340 },
    trafficFactor: 1.22,
    currentIncidentId: null,
    targetLocation: null,
    targetType: null,
    stage: 'idle',
    crew: 'Paramedic Kowalski / EMT Brooks',
    fuel: '94%'
  },
  {
    id: 'unit-fire-eng3',
    callsign: 'ENGINE-03',
    type: 'fire_truck',
    status: 'available',
    location: { lat: 37.7812, lng: -122.4110 }, // Station 3 - Howard & 5th
    baseLocation: { lat: 37.7812, lng: -122.4110 },
    trafficFactor: 1.05,
    currentIncidentId: null,
    targetLocation: null,
    targetType: null,
    stage: 'idle',
    crew: 'Capt. Ramirez / Crew of 4',
    fuel: '95%'
  },
  {
    id: 'unit-fire-truck7',
    callsign: 'TRUCK-07',
    type: 'fire_truck',
    status: 'available',
    location: { lat: 37.7645, lng: -122.4215 }, // Station 7 - 16th St
    baseLocation: { lat: 37.7645, lng: -122.4215 },
    trafficFactor: 1.18,
    currentIncidentId: null,
    targetLocation: null,
    targetType: null,
    stage: 'idle',
    crew: 'Capt. Larson / Crew of 5',
    fuel: '89%'
  },
  {
    id: 'unit-fire-eng12',
    callsign: 'ENGINE-12',
    type: 'fire_truck',
    status: 'available',
    location: { lat: 37.7940, lng: -122.4045 }, // Station 12 - Sansome St
    baseLocation: { lat: 37.7940, lng: -122.4045 },
    trafficFactor: 1.10,
    currentIncidentId: null,
    targetLocation: null,
    targetType: null,
    stage: 'idle',
    crew: 'Lt. Washington / Crew of 4',
    fuel: '91%'
  }
]

export const SEED_TRAFFIC_SIGNALS = [
  {
    id: 'ts-corridor-1',
    name: 'Market St & 5th St Corridor',
    location: { lat: 37.7836, lng: -122.4079 },
    status: 'red',
    intersection: 'Market / 5th'
  },
  {
    id: 'ts-corridor-2',
    name: 'Mission St & 16th St Transit Hub',
    location: { lat: 37.7648, lng: -122.4197 },
    status: 'red',
    intersection: 'Mission / 16th'
  },
  {
    id: 'ts-corridor-3',
    name: 'Van Ness Ave & Geary Blvd Junction',
    location: { lat: 37.7858, lng: -122.4212 },
    status: 'red',
    intersection: 'Van Ness / Geary'
  },
  {
    id: 'ts-corridor-4',
    name: 'Howard St & 3rd St Tech Corridor',
    location: { lat: 37.7852, lng: -122.4005 },
    status: 'red',
    intersection: 'Howard / 3rd'
  }
]

export const SEED_INCIDENTS = [
  {
    id: 'inc-9021',
    type: 'medical',
    severity: 'critical',
    location: { lat: 37.7815, lng: -122.4095 }, // Near 6th & Mission
    status: 'pending',
    assignedUnitId: null,
    assignedHospitalId: null,
    createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    resolvedAt: null,
    description: 'Male 58yo sudden cardiac collapse, CPR in progress by bystander, unconscious and not breathing',
    address: '984 Mission St, SoMa'
  },
  {
    id: 'inc-9022',
    type: 'fire',
    severity: 'moderate',
    location: { lat: 37.7710, lng: -122.4135 }, // 12th & Folsom
    status: 'pending',
    assignedUnitId: null,
    assignedHospitalId: null,
    createdAt: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
    resolvedAt: null,
    description: 'Commercial kitchen grease fire with active smoke odor vented to alley, occupants evacuating',
    address: '310 12th St, SoMa West'
  },
  {
    id: 'inc-9023',
    type: 'medical',
    severity: 'low',
    location: { lat: 37.7880, lng: -122.4140 }, // Tenderloin / Post St
    status: 'pending',
    assignedUnitId: null,
    assignedHospitalId: null,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    resolvedAt: null,
    description: 'Elderly resident with ankle sprain after minor trip on curb, alert and oriented, needs lift assist and evaluation',
    address: '650 Post St, Apt 3B'
  }
]
