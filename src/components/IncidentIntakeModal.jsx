import React, { useState, useRef } from 'react'
import {
  X,
  HeartPulse,
  Flame,
  AlertTriangle,
  Zap,
  MapPin,
  Send,
  FileText,
  Sliders,
  Camera,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Sparkles
} from 'lucide-react'
import { classifySeverity } from '../logic/severityClassifier.js'

const PRESET_LOCATIONS = [
  { name: 'Civic Center Plaza', address: '335 McAllister St', lat: 37.7795, lng: -122.4175 },
  { name: 'Market & 5th St Retail Corridor', address: '870 Market St', lat: 37.7845, lng: -122.4068 },
  { name: 'Mission & 18th St Commercial Hub', address: '2200 Mission St', lat: 37.7618, lng: -122.4194 },
  { name: 'SOMA Tech District (Howard & 3rd)', address: '680 Howard St', lat: 37.7865, lng: -122.4000 },
  { name: 'Van Ness & Geary Transit Intersection', address: '1100 Van Ness Ave', lat: 37.7862, lng: -122.4218 }
]

const SAMPLE_CALL_PROMPTS = [
  {
    type: 'medical',
    label: 'Cardiac Arrest',
    desc: 'Elderly patron collapsed outside subway turnstiles, unconscious and not breathing, bystander initiating chest compressions'
  },
  {
    type: 'fire',
    label: 'Structure Fire',
    desc: 'Active flames and heavy smoke emerging from second floor apartment window, occupants trapped on fire escape'
  },
  {
    type: 'medical',
    label: 'Fall / Fracture',
    desc: 'Pedestrian slipped on wet stairs, severe pain and deformity in right forearm, suspected fracture'
  },
  {
    type: 'fire',
    label: 'Dumpster Fire',
    desc: 'Dumpster fire in rear alley behind restaurant, smoke odor present but no exposure to adjacent buildings'
  }
]

export function IncidentIntakeModal({
  isOpen,
  onClose,
  onSubmitIncident
}) {
  const [type, setType] = useState('medical')
  const [description, setDescription] = useState('')
  const [selectedPreset, setSelectedPreset] = useState(0)
  const [lat, setLat] = useState(PRESET_LOCATIONS[0].lat)
  const [lng, setLng] = useState(PRESET_LOCATIONS[0].lng)
  const [address, setAddress] = useState(PRESET_LOCATIONS[0].address)
  const [manualOverride, setManualOverride] = useState(false)
  const [overrideSeverity, setOverrideSeverity] = useState('moderate')

  // Photo-based AI classification state
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false)
  const [photoAnalysisResult, setPhotoAnalysisResult] = useState(null)
  const [photoAnalysisError, setPhotoAnalysisError] = useState(null)

  const fileInputRef = useRef(null)

  // Live Rule-Based Severity Classification from text
  const classification = classifySeverity(description, type)
  const effectiveSeverity = manualOverride ? overrideSeverity : classification.severity

  // Reset photo state when modal closes or cleans up
  const handleResetPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview(null)
    setPhotoAnalysisResult(null)
    setPhotoAnalysisError(null)
    setIsAnalyzingPhoto(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Handle Photo Upload & CLIP Zero-Shot Classification
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPhotoFile(file)
    const previewUrl = URL.createObjectURL(file)
    setPhotoPreview(previewUrl)
    setPhotoAnalysisResult(null)
    setPhotoAnalysisError(null)
    setIsAnalyzingPhoto(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('http://localhost:8000/classify', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setPhotoAnalysisResult(data)

      // Auto-prefill incident type & severity based on CLIP classification
      if (data.type === 'fire') {
        setType('fire')
        setManualOverride(true)
        setOverrideSeverity(data.suggested_severity || 'moderate')
      } else if (data.type === 'accident') {
        // accident -> medical agency dispatch per specification
        setType('medical')
        setManualOverride(true)
        setOverrideSeverity(data.suggested_severity || 'moderate')
      } else {
        // "none" or "uncertain" -> don't prefill; user chooses manually
      }
    } catch (err) {
      console.warn('Photo classifier service unavailable:', err)
      setPhotoAnalysisError('Classifier service unreachable at http://localhost:8000. Please continue with manual entry.')
    } finally {
      setIsAnalyzingPhoto(false)
    }
  }

  // Update coordinates when preset changes
  const handlePresetChange = (idx) => {
    setSelectedPreset(idx)
    const loc = PRESET_LOCATIONS[idx]
    setLat(loc.lat)
    setLng(loc.lng)
    setAddress(loc.address)
  }

  const handleApplySample = (sample) => {
    setType(sample.type)
    setDescription(sample.desc)
  }

  const handleSubmit = (autoDispatch = false) => {
    if (!description.trim()) {
      alert('Please enter a description or call transcript.')
      return
    }

    const newIncident = {
      id: `inc-${Math.floor(1000 + Math.random() * 9000)}`,
      type,
      severity: effectiveSeverity,
      location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      status: 'pending',
      assignedUnitId: null,
      assignedHospitalId: null,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      description: description.trim(),
      address: address.trim(),
      classificationDetails: {
        ...classification,
        photoClassification: photoAnalysisResult || null
      }
    }

    onSubmitIncident(newIncident, autoDispatch)
    handleResetPhoto()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} className="text-critical" />
            <h3 style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.04em' }}>
              INCIDENT INTAKE // 911 CAD CALL LOG
            </h3>
          </div>
          <button className="btn btn-sm" onClick={onClose} style={{ padding: '2px 6px' }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Quick Sample Call Transcripts */}
          <div style={{ marginBottom: '14px' }}>
            <div className="form-label">Simulation Call Scenarios:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {SAMPLE_CALL_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="btn btn-sm"
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                  onClick={() => handleApplySample(prompt)}
                >
                  <FileText size={10} />
                  <span>{prompt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Photo-based Incident Identification Section */}
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', margin: 0 }}>
                <Camera size={12} className="text-dispatched" />
                <span>Incident Photo Identification (CLIP ViT-B/32)</span>
              </label>
              {photoFile && (
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ fontSize: '10px', padding: '1px 5px' }}
                  onClick={handleResetPhoto}
                >
                  <Trash2 size={10} />
                  <span>Clear Photo</span>
                </button>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {!photoFile ? (
              <div
                className="photo-upload-zone"
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                  <Upload size={16} />
                  <span style={{ fontSize: '12px' }}>Upload emergency scene photo for AI identification</span>
                </div>
                <div className="text-dim" style={{ fontSize: '10px', marginTop: '2px' }}>
                  Supported formats: JPEG, PNG, WebP — Evaluated against fire, accident, and normal scenes
                </div>
              </div>
            ) : (
              <div className="photo-preview-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                  {photoPreview && (
                    <img src={photoPreview} alt="Incident preview" className="photo-thumb" />
                  )}
                  <div style={{ overflow: 'hidden' }}>
                    <div className="font-mono text-primary" style={{ fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {photoFile.name}
                    </div>
                    <div className="font-mono text-dim" style={{ fontSize: '10px' }}>
                      {(photoFile.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isAnalyzingPhoto && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent-dispatched)', fontSize: '11px' }}>
                      <Loader2 size={13} className="spin-icon" />
                      <span className="font-mono">ANALYZING...</span>
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ fontSize: '10px', padding: '3px 8px' }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            {/* Error / Offline Fallback Notification */}
            {photoAnalysisError && (
              <div style={{
                marginTop: '6px',
                padding: '6px 10px',
                background: 'rgba(242, 169, 59, 0.1)',
                border: '1px solid rgba(242, 169, 59, 0.3)',
                borderRadius: '3px',
                fontSize: '11px',
                color: 'var(--accent-pending)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <AlertCircle size={13} style={{ flexShrink: 0 }} />
                <span>{photoAnalysisError}</span>
              </div>
            )}

            {/* CLIP Classification Result Banner */}
            {photoAnalysisResult && (
              <div className="clip-badge-container">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={13} className="text-dispatched" />
                    <span className="font-mono" style={{ fontSize: '11px', fontWeight: 600 }}>
                      SUGGESTION (OPERATOR CONFIRMATION REQUIRED):
                    </span>
                    <span className={`badge ${
                      photoAnalysisResult.type === 'fire'
                        ? 'badge-critical'
                        : photoAnalysisResult.type === 'accident'
                        ? 'badge-dispatched'
                        : photoAnalysisResult.type === 'none'
                        ? 'badge-available'
                        : 'badge-moderate'
                    }`}>
                      {photoAnalysisResult.type.toUpperCase()}
                    </span>
                  </div>

                  <div className="font-mono" style={{ fontSize: '11px' }}>
                    <span className="text-muted">CONFIDENCE: </span>
                    <strong style={{ color: photoAnalysisResult.confidence >= 0.5 ? 'var(--accent-available)' : 'var(--accent-pending)' }}>
                      {(photoAnalysisResult.confidence * 100).toFixed(1)}%
                    </strong>
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {photoAnalysisResult.type === 'fire' && (
                    <span>🔥 Identified fire event. Suggested incident type: <strong>Fire</strong>, suggested severity: <strong>{photoAnalysisResult.suggested_severity || 'moderate'}</strong>. Please verify or modify below.</span>
                  )}
                  {photoAnalysisResult.type === 'accident' && (
                    <span>🚑 Identified vehicle collision / accident. Suggested incident type: <strong>Medical</strong>, suggested severity: <strong>{photoAnalysisResult.suggested_severity || 'moderate'}</strong>. Please verify or modify below.</span>
                  )}
                  {(photoAnalysisResult.type === 'uncertain' || photoAnalysisResult.type === 'none') && (
                    <span style={{ color: 'var(--accent-pending)' }}>
                      Couldn't identify an emergency, please choose manually
                    </span>
                  )}
                </div>

                {photoAnalysisResult.scores && (
                  <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                    <div className="text-dim font-mono" style={{ fontSize: '9px', marginBottom: '4px' }}>
                      ZERO-SHOT LABEL CONFIDENCE SCORES:
                    </div>
                    {Object.entries(photoAnalysisResult.scores).map(([label, score]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', marginBottom: '2px' }}>
                        <span className="font-mono text-muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '340px' }}>
                          {label}
                        </span>
                        <span className="font-mono text-primary">{(score * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Emergency Type Selector */}
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label className="form-label" style={{ margin: 0 }}>Emergency Service Agency</label>
              {photoAnalysisResult && (
                <span className="text-dim font-mono" style={{ fontSize: '10px' }}>
                  (Operator override allowed)
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${type === 'medical' ? 'btn-primary' : ''}`}
                style={{
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                onClick={() => setType('medical')}
              >
                <HeartPulse size={15} className="text-critical" />
                <span>EMS / AMBULANCE DISPATCH</span>
              </button>
              <button
                type="button"
                className={`btn ${type === 'fire' ? 'btn-primary' : ''}`}
                style={{
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                onClick={() => setType('fire')}
              >
                <Flame size={15} style={{ color: '#F0883E' }} />
                <span>FIRE & RESCUE DISPATCH</span>
              </button>
            </div>
          </div>

          {/* Call Description / Narrative */}
          <div className="form-group">
            <label className="form-label">Caller Transcript / Incident Description</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="e.g. Male 58yo collapsed, gasping for air, unresponsive, possible cardiac arrest..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Live Rule-Based Severity Classification Banner */}
          <div style={{
            background: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="text-muted font-mono" style={{ fontSize: '11px' }}>
                  SEVERITY CLASSIFICATION:
                </span>
                <span className={`badge badge-${effectiveSeverity}`}>
                  {effectiveSeverity.toUpperCase()}
                </span>
                {manualOverride && (
                  <span className="badge badge-low" style={{ fontSize: '9px' }}>
                    OPERATOR / AI OVERRIDE
                  </span>
                )}
              </div>

              <button
                type="button"
                className="btn btn-sm"
                style={{ fontSize: '10px', padding: '2px 6px' }}
                onClick={() => setManualOverride(!manualOverride)}
              >
                <Sliders size={11} />
                <span>{manualOverride ? 'USE KEYWORDS' : 'OVERRIDE'}</span>
              </button>
            </div>

            {manualOverride ? (
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {['critical', 'moderate', 'low'].map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    className={`btn btn-sm ${overrideSeverity === sev ? `btn-danger` : ''}`}
                    style={{ flex: 1, textTransform: 'uppercase', fontSize: '11px' }}
                    onClick={() => setOverrideSeverity(sev)}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                <div>{classification.reason}</div>
                {classification.matchedKeywords.length > 0 && (
                  <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <span className="text-dim">Triggers:</span>
                    {classification.matchedKeywords.map((kw, i) => (
                      <span key={i} className="font-mono text-primary" style={{ background: 'var(--bg-panel)', padding: '1px 4px', borderRadius: '2px', border: '1px solid var(--border-color)' }}>
                        "{kw}"
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Location Selection */}
          <div className="form-group">
            <label className="form-label">Incident Geolocation</label>
            <select
              className="form-select"
              value={selectedPreset}
              onChange={(e) => handlePresetChange(Number(e.target.value))}
              style={{ marginBottom: '8px' }}
            >
              {PRESET_LOCATIONS.map((loc, idx) => (
                <option key={idx} value={idx}>
                  {loc.name} — {loc.address}
                </option>
              ))}
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '10px' }}>Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  className="form-input font-mono"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '10px' }}>Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  className="form-input font-mono"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button className="btn" onClick={() => { handleResetPhoto(); onClose(); }}>
            CANCEL
          </button>
          <button
            className="btn"
            onClick={() => handleSubmit(false)}
          >
            LOG TO QUEUE ONLY
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleSubmit(true)}
          >
            <Send size={13} />
            <span>CREATE & DISPATCH</span>
          </button>
        </div>
      </div>
    </div>
  )
}
