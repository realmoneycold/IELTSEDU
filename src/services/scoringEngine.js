// ═══════════════════════════════════════════════════════════════
// IELTS Scoring Engine — IELTSPRACTICE
//
// Converts raw correct-answer counts into IELTS band scores (0–9)
// using official Cambridge mark-to-band conversion tables.
// ═══════════════════════════════════════════════════════════════

'use strict';

// Official IELTS Academic Reading band conversion
// Format: [minCorrect, band]  — sorted descending by minCorrect
const READING_BAND_MAP = [
  [39, 9.0], [37, 8.5], [35, 8.0], [33, 7.5],
  [30, 7.0], [27, 6.5], [23, 6.0], [19, 5.5],
  [15, 5.0], [13, 4.5], [10, 4.0], [6,  3.5],
  [4,  3.0],
];

// Official IELTS Listening band conversion
const LISTENING_BAND_MAP = [
  [39, 9.0], [37, 8.5], [35, 8.0], [32, 7.5],
  [30, 7.0], [26, 6.5], [23, 6.0], [18, 5.5],
  [16, 5.0], [13, 4.5], [11, 4.0], [7,  3.5],
  [4,  3.0],
];

/**
 * Convert a raw correct count into an IELTS band score.
 *
 * @param {string} testType      - 'READING' | 'LISTENING' | 'WRITING' | 'SPEAKING'
 * @param {number} correctCount  - Number of correctly answered questions
 * @param {number} totalQuestions - Total number of questions in the test
 * @returns {number} IELTS band score (0.0 – 9.0, in 0.5 increments)
 */
function calculateBand(testType, correctCount, totalQuestions) {
  if (!totalQuestions || totalQuestions === 0) return 0;

  const type = (testType || '').toUpperCase();

  // Reading and Listening use official mark tables
  if (type === 'READING') {
    return lookupBand(READING_BAND_MAP, correctCount);
  }
  if (type === 'LISTENING') {
    return lookupBand(LISTENING_BAND_MAP, correctCount);
  }

  // Writing and Speaking: approximate from percentage
  // Real IELTS Writing/Speaking requires human grading;
  // for auto-graded MCQ proxies we use a linear band approximation.
  const pct = (correctCount / totalQuestions) * 100;
  return percentageToBand(pct);
}

/**
 * Look up a band score from a sorted conversion table.
 * @param {Array} table  - [[minCorrect, band], ...]  descending by minCorrect
 * @param {number} correct
 * @returns {number} band
 */
function lookupBand(table, correct) {
  for (const [minCorrect, band] of table) {
    if (correct >= minCorrect) return band;
  }
  return 1.0; // Below all thresholds
}

/**
 * Approximate band from percentage score.
 * @param {number} pct 0–100
 * @returns {number} band 0–9
 */
function percentageToBand(pct) {
  if (pct >= 97) return 9.0;
  if (pct >= 93) return 8.5;
  if (pct >= 87) return 8.0;
  if (pct >= 82) return 7.5;
  if (pct >= 75) return 7.0;
  if (pct >= 67) return 6.5;
  if (pct >= 57) return 6.0;
  if (pct >= 47) return 5.5;
  if (pct >= 40) return 5.0;
  if (pct >= 32) return 4.5;
  if (pct >= 25) return 4.0;
  if (pct >= 18) return 3.5;
  if (pct >= 10) return 3.0;
  return 2.0;
}

/**
 * Calculate the overall band from 4 sectional bands.
 * Official IELTS rounding: average of 4 bands, rounded to nearest 0.5.
 *
 * @param {Object} bands { reading, listening, writing, speaking }
 * @returns {number} overall band
 */
function calculateOverallBand({ reading = 0, listening = 0, writing = 0, speaking = 0 }) {
  const avg = (reading + listening + writing + speaking) / 4;
  // Round to nearest 0.5
  return Math.round(avg * 2) / 2;
}

/**
 * Get a descriptive label for a band score.
 * @param {number} band
 * @returns {string}
 */
function getBandLabel(band) {
  if (band >= 9)   return 'Expert';
  if (band >= 8)   return 'Very Good';
  if (band >= 7)   return 'Good';
  if (band >= 6)   return 'Competent';
  if (band >= 5)   return 'Modest';
  if (band >= 4)   return 'Limited';
  if (band >= 3)   return 'Extremely Limited';
  return 'Non-User';
}

/**
 * Get color for band display (CSS color string).
 * @param {number} band
 * @returns {string}
 */
function getBandColor(band) {
  if (band >= 8)  return '#16a34a'; // green
  if (band >= 7)  return '#2563eb'; // blue
  if (band >= 6)  return '#7c3aed'; // purple
  if (band >= 5)  return '#d97706'; // amber
  return '#dc2626';                  // red
}

module.exports = {
  calculateBand,
  calculateOverallBand,
  getBandLabel,
  getBandColor,
  percentageToBand,
};
