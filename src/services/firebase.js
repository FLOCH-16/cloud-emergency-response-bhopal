import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore'
import { SEED_HOSPITALS, SEED_UNITS, SEED_INCIDENTS, SEED_TRAFFIC_SIGNALS } from './seedData.js'

// Check localStorage for saved Firebase credentials or env variables
const STORAGE_KEY_FIREBASE_CONFIG = 'pulse_cad_firebase_config'
const STORAGE_KEY_LOCAL_STATE = 'pulse_cad_local_state'

function loadSavedFirebaseConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn('Could not parse stored Firebase config', e)
  }

  // Check Vite environment variables
  if (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef'
    }
  }

  return null
}

let activeFirebaseApp = null
let activeFirestore = null
let currentMode = 'local' // 'live' | 'local'

// In-Memory Reactive Fallback Store
const localStore = {
  incidents: [...SEED_INCIDENTS],
  units: [...SEED_UNITS],
  hospitals: [...SEED_HOSPITALS],
  trafficSignals: [...SEED_TRAFFIC_SIGNALS],
  listeners: {
    incidents: new Set(),
    units: new Set(),
    hospitals: new Set(),
    trafficSignals: new Set()
  }
}

function notifyLocalListeners(coll) {
  if (localStore.listeners[coll]) {
    const data = [...localStore[coll]]
    localStore.listeners[coll].forEach(cb => {
      try {
        cb(data)
      } catch (err) {
        console.error(`Error in local listener for ${coll}:`, err)
      }
    })
  }
}

// Attempt Firebase initialization
export function initializeCADFirebase(customConfig = null) {
  const config = customConfig || loadSavedFirebaseConfig()

  if (config && config.projectId && config.apiKey) {
    try {
      activeFirebaseApp = getApps().length === 0 ? initializeApp(config) : getApp()
      activeFirestore = getFirestore(activeFirebaseApp)
      currentMode = 'live'
      console.log('Firebase initialized in LIVE FIRESTORE mode for project:', config.projectId)
      return { success: true, mode: 'live', projectId: config.projectId }
    } catch (err) {
      console.error('Failed to initialize Firebase Live:', err)
      currentMode = 'local'
      return { success: false, mode: 'local', error: err.message }
    }
  } else {
    currentMode = 'local'
    console.log('Running in HIGH-FIDELITY STANDALONE / OFFLINE FIRESTORE mode')
    return { success: true, mode: 'local' }
  }
}

// Initialize on script load
initializeCADFirebase()

export function getFirebaseMode() {
  return currentMode
}

export function saveFirebaseConfig(config) {
  if (config) {
    localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(config))
    return initializeCADFirebase(config)
  } else {
    localStorage.removeItem(STORAGE_KEY_FIREBASE_CONFIG)
    activeFirebaseApp = null
    activeFirestore = null
    currentMode = 'local'
    return { success: true, mode: 'local' }
  }
}

/**
 * Universal Subscription: Subscribes to a collection with real-time updates.
 * Seamlessly handles Live Firestore onSnapshot OR Local Reactive Store.
 */
export function subscribeToCollection(collectionName, callback) {
  if (currentMode === 'live' && activeFirestore) {
    try {
      const collRef = collection(activeFirestore, collectionName)
      const unsubscribe = onSnapshot(collRef, (snapshot) => {
        const items = []
        snapshot.forEach(docSnap => {
          items.push({ id: docSnap.id, ...docSnap.data() })
        })
        callback(items)
      }, (error) => {
        console.warn(`Firestore onSnapshot error on ${collectionName}, falling back to local:`, error)
        // Fallback to local
        subscribeLocal(collectionName, callback)
      })

      return unsubscribe
    } catch (e) {
      console.warn(`Could not attach Firestore listener to ${collectionName}:`, e)
      return subscribeLocal(collectionName, callback)
    }
  } else {
    return subscribeLocal(collectionName, callback)
  }
}

function subscribeLocal(collectionName, callback) {
  if (!localStore[collectionName]) {
    localStore[collectionName] = []
    localStore.listeners[collectionName] = new Set()
  }

  localStore.listeners[collectionName].add(callback)
  // Immediate trigger with current items
  callback([...localStore[collectionName]])

  return () => {
    localStore.listeners[collectionName].delete(callback)
  }
}

/**
 * Adds a new document to a collection.
 */
export async function addDocument(collectionName, data) {
  if (currentMode === 'live' && activeFirestore) {
    try {
      const collRef = collection(activeFirestore, collectionName)
      const docRef = await addDoc(collRef, data)
      return docRef.id
    } catch (err) {
      console.warn(`Live addDoc failed for ${collectionName}, fallback to local:`, err)
    }
  }

  // Local fallback
  const newId = data.id || `${collectionName.slice(0, 3)}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`
  const item = { ...data, id: newId }
  localStore[collectionName] = [item, ...(localStore[collectionName] || [])]
  notifyLocalListeners(collectionName)
  return newId
}

/**
 * Updates a document in a collection.
 */
export async function updateDocument(collectionName, docId, updates) {
  if (currentMode === 'live' && activeFirestore) {
    try {
      const docRef = doc(activeFirestore, collectionName, docId)
      await updateDoc(docRef, updates)
      return true
    } catch (err) {
      console.warn(`Live updateDoc failed for ${collectionName}/${docId}:`, err)
    }
  }

  // Local fallback
  if (localStore[collectionName]) {
    localStore[collectionName] = localStore[collectionName].map(item => {
      if (item.id === docId) {
        return { ...item, ...updates }
      }
      return item
    })
    notifyLocalListeners(collectionName)
  }
  return true
}

/**
 * Sets a document (creates or overwrites) in a collection.
 */
export async function setDocument(collectionName, docId, data) {
  if (currentMode === 'live' && activeFirestore) {
    try {
      const docRef = doc(activeFirestore, collectionName, docId)
      await setDoc(docRef, data, { merge: true })
      return true
    } catch (err) {
      console.warn(`Live setDoc failed for ${collectionName}/${docId}:`, err)
    }
  }

  // Local fallback
  if (localStore[collectionName]) {
    const idx = localStore[collectionName].findIndex(item => item.id === docId)
    const record = { ...data, id: docId }
    if (idx >= 0) {
      localStore[collectionName][idx] = record
    } else {
      localStore[collectionName].push(record)
    }
    notifyLocalListeners(collectionName)
  }
  return true
}

/**
 * Deletes a document from a collection.
 */
export async function deleteDocument(collectionName, docId) {
  if (currentMode === 'live' && activeFirestore) {
    try {
      const docRef = doc(activeFirestore, collectionName, docId)
      await deleteDoc(docRef)
      return true
    } catch (err) {
      console.warn(`Live deleteDoc failed for ${collectionName}/${docId}:`, err)
    }
  }

  // Local fallback
  if (localStore[collectionName]) {
    localStore[collectionName] = localStore[collectionName].filter(item => item.id !== docId)
    notifyLocalListeners(collectionName)
  }
  return true
}

/**
 * Seeds or resets all collections to the initial realistic seed data.
 */
export async function seedCADDatabase() {
  if (currentMode === 'live' && activeFirestore) {
    try {
      // Seed hospitals
      for (const h of SEED_HOSPITALS) {
        await setDoc(doc(activeFirestore, 'hospitals', h.id), h)
      }
      // Seed units
      for (const u of SEED_UNITS) {
        await setDoc(doc(activeFirestore, 'units', u.id), u)
      }
      // Seed incidents
      for (const inc of SEED_INCIDENTS) {
        await setDoc(doc(activeFirestore, 'incidents', inc.id), inc)
      }
      // Seed traffic signals
      for (const ts of SEED_TRAFFIC_SIGNALS) {
        await setDoc(doc(activeFirestore, 'trafficSignals', ts.id), ts)
      }
      console.log('Live Firestore collections successfully seeded!')
      return { success: true, count: SEED_HOSPITALS.length + SEED_UNITS.length + SEED_INCIDENTS.length }
    } catch (err) {
      console.error('Failed to seed live Firestore:', err)
      return { success: false, error: err.message }
    }
  } else {
    // Reset local store
    localStore.hospitals = JSON.parse(JSON.stringify(SEED_HOSPITALS))
    localStore.units = JSON.parse(JSON.stringify(SEED_UNITS))
    localStore.incidents = JSON.parse(JSON.stringify(SEED_INCIDENTS))
    localStore.trafficSignals = JSON.parse(JSON.stringify(SEED_TRAFFIC_SIGNALS))

    notifyLocalListeners('hospitals')
    notifyLocalListeners('units')
    notifyLocalListeners('incidents')
    notifyLocalListeners('trafficSignals')

    return { success: true, count: SEED_HOSPITALS.length + SEED_UNITS.length + SEED_INCIDENTS.length }
  }
}
