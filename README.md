# PULSE // C4I CAD Emergency Dispatch & Operations Console

A high-density emergency computer-aided dispatch (CAD) console designed for municipal first-responder orchestration. Unifies EMS (Ambulance) and Fire & Rescue under a single operational flow with real-time telemetry, rule-based triage, capacity-aware hospital matching, and simulated emergency traffic signal preemption.

---

## ⚡ Architecture & Tech Stack

- **Frontend**: React 19 + Vite + Plain CSS Design Token System (`IBM Plex Sans` + `IBM Plex Mono`).
- **Map Engine**: Leaflet (Esri World Dark Gray Base cartography, free, zero API key friction).
- **Data & Realtime**: Firebase Firestore via direct client SDK + Firebase Hosting.
- **Fail-Safe Offline Mode**: Built-in reactive store that mirrors the Firestore realtime API contract, ensuring zero demo failures even if venue Wi-Fi drops.
- **Zero-Backend Rationale**: Talks directly to Firestore via client-side SDK. A dedicated Node/Express proxy layer was intentionally omitted to minimize deployment attack surface, eliminate cold-start latency, and maximize reliability for time-critical dispatch operations.

---

## 🚒 Key Capabilities & Workflows

### 1. Incident Intake & Rule-Based Severity Classification
- Simulates real-time 911 emergency intake calls.
- Rule-based keyword engine (no ungrounded black-box ML):
  - **Critical**: Cardiac arrest, unconscious, gunshot, structure fire, active flames, collapse.
  - **Moderate**: Fractures, burns, smoke odor, vehicle collision, lacerations, gas leak.
  - **Low**: Sprains, dumpster fire, false alarm, lift assist, minor cuts.
- Operator override allows manual triage adjustments when required.

### 2. Shared Dispatch Engine (Ambulance + Fire)
- Pure, deterministic scoring function:
  $$\text{Score} = \text{Distance}_{\text{Haversine}}(\text{km}) \times \text{TrafficFactor} \, (1.0 - 1.5)$$
- Automatically routes `ambulance` to medical incidents and `fire_truck` to fire emergencies.
- Selects the optimal available unit and calculates real-time ETA.

### 3. Capacity-Aware Hospital Resource Matching
- For medical emergencies, evaluates regional hospitals with active bed availability:
  - **Critical**: Filters for $\text{ICU Beds} > 0$.
  - **Moderate / Low**: Filters for $\text{General Beds} > 0$.
- Matches the nearest facility and atomically decrements the bed capacity upon assignment.

### 4. Live Leaflet Console & Simulated Movement
- Client-side interval (2.5s) nudges dispatched units along realistic waypoints:
  1. Base $\rightarrow$ Incident Scene (on-scene patient triage / fire suppression).
  2. Incident Scene $\rightarrow$ Hospital Emergency Bay (medical transport).
  3. Hospital $\rightarrow$ Base Station (returns to `available` status).

### 5. Traffic Signal Preemption Override (Green Corridor)
- Monitored fixed traffic signal nodes (Opticom IR preemption sensors).
- Dispatched units within 500 meters trigger an automatic signal override from **RED** to **GREEN**.
- Visual preemption HUD and pulsing green wave corridor indicators.

### 6. Future Architecture Roadmap
- Integrated "Future Work" presentation slide covering:
  - **Pillar 1**: Spatiotemporal Risk Prediction & System Status Management.
  - **Pillar 2**: Automated IoT Consumable Restocking & Turnaround Reduction.
  - **Pillar 3**: NENA/APCO Multi-Agency CAD-to-CAD Mutual Aid Federation.

---

## 🛠️ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build production bundle
npm run build

# 4. Preview production build
npm run preview
```

### Testing Core Logic Standalone
```bash
node src/logic/test-logic.js
```

### Firebase Hosting Deployment
```bash
npm run build
firebase deploy --only hosting
```
