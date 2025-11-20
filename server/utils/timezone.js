/**
 * Timezone utilities for Philippines (UTC+8)
 * Ensures consistent timezone handling across the application
 */

const PHILIPPINES_OFFSET = 8 * 60; // UTC+8 in minutes

/**
 * Get current time in Philippines timezone
 * @returns {Date} Current date/time adjusted to Philippines timezone
 */
export function getPhilippinesTime() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (PHILIPPINES_OFFSET * 60000));
}

/**
 * Convert a date string/object to Philippines timezone
 * @param {Date|string} date - Date to convert
 * @returns {Date} Date adjusted to Philippines timezone
 */
export function toPhilippinesTime(date) {
  if (!date) return null;
  const d = new Date(date);
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (PHILIPPINES_OFFSET * 60000));
}

/**
 * Get today's date string in Philippines timezone (YYYY-MM-DD)
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function getTodayPhilippines() {
  return getPhilippinesTime().toISOString().split('T')[0];
}

/**
 * Get yesterday's date string in Philippines timezone (YYYY-MM-DD)
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function getYesterdayPhilippines() {
  const date = getPhilippinesTime();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

/**
 * Format date for display in Philippines timezone
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatPhilippinesDateTime(date) {
  if (!date) return '';
  const phDate = toPhilippinesTime(date);
  return phDate.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

export default {
  getPhilippinesTime,
  toPhilippinesTime,
  getTodayPhilippines,
  getYesterdayPhilippines,
  formatPhilippinesDateTime
};
