/**
 * Severity classification engine.
 * Simple rule-based: keywords + incident type -> critical | moderate | low. No ML.
 */

const CRITICAL_KEYWORDS = [
  'cardiac', 'arrest', 'unconscious', 'unresponsive', 'stroke',
  'explosion', 'blast', 'trapped', 'heavy smoke', 'structure fire',
  'building fire', 'gunshot', 'gsw', 'severe', 'not breathing',
  'suffocation', 'multiple casualties', 'mci', 'active flames',
  'head trauma', 'arterial', 'amputation', 'drowning', 'cyanosis',
  'code blue', 'collapse', 'infant unresponsive', 'electrocution', 'toxic spill'
]

const LOW_KEYWORDS = [
  'dumpster fire', 'trash fire', 'rubbish fire', 'brush fire minor',
  'alarm test', 'false alarm', 'smoke detector beep', 'system chirp',
  'minor cut', 'sprain', 'minor scratch', 'controlled burn',
  'animal rescue', 'check-up', 'lift assist', 'routine transport',
  'mild nausea', 'cold symptoms', 'paper cut'
]

const MODERATE_KEYWORDS = [
  'fracture', 'broken', 'burn', 'chest pain', 'dizziness',
  'smoke odor', 'odor of smoke', 'kitchen fire', 'stove fire',
  'gas leak', 'collision', 'accident', 'fall', 'bleeding',
  'asthma', 'difficulty breathing', 'laceration', 'concussion',
  'fainting', 'seizure', 'dehydration', 'vehicle fire'
]

/**
 * Classifies an incident description and type into a severity level.
 * 
 * @param {string} description Free text reported by caller
 * @param {'medical' | 'fire'} type Incident type
 * @returns {{ severity: 'critical' | 'moderate' | 'low', matchedKeywords: string[], reason: string }}
 */
export function classifySeverity(description = '', type = 'medical') {
  const text = (description || '').toLowerCase()

  const criticalMatches = CRITICAL_KEYWORDS.filter(kw => text.includes(kw))
  const lowMatches = LOW_KEYWORDS.filter(kw => text.includes(kw))
  const moderateMatches = MODERATE_KEYWORDS.filter(kw => text.includes(kw))

  // 1. Critical rule triggers immediately override everything
  if (criticalMatches.length > 0) {
    return {
      severity: 'critical',
      matchedKeywords: criticalMatches,
      reason: `Flagged critical due to high-urgency keywords: [${criticalMatches.join(', ')}]`
    }
  }

  // 2. Specific low-urgency indicators (e.g. dumpster fire, minor cut, false alarm)
  if (lowMatches.length > 0) {
    return {
      severity: 'low',
      matchedKeywords: lowMatches,
      reason: `Flagged low priority based on keywords: [${lowMatches.join(', ')}]`
    }
  }

  // 3. Moderate rule triggers
  if (moderateMatches.length > 0) {
    return {
      severity: 'moderate',
      matchedKeywords: moderateMatches,
      reason: `Flagged moderate priority based on: [${moderateMatches.join(', ')}]`
    }
  }

  // Default fallback if no keywords matched
  return {
    severity: 'moderate',
    matchedKeywords: [],
    reason: 'Standard priority assigned (no specific keywords detected)'
  }
}
