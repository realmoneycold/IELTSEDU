/**
 * Timezone utilities for consistent date handling
 */

/**
 * Returns the current date in UTC.
 * Use this when storing dates in the database.
 * @returns {Date}
 */
const getUTCNow = () => {
  return new Date();
};

/**
 * Normalizes a date to UTC if it isn't already.
 * @param {Date|string|number} date 
 * @returns {Date}
 */
const toUTCDate = (date) => {
  if (!date) return getUTCNow();
  const d = new Date(date);
  return d;
};

module.exports = {
  getUTCNow,
  toUTCDate
};
