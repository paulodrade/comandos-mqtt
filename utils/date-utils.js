/**
 * @file date-utils.js
 * @description Utility functions for date and time formatting.
 */

export const DateUtils = {
  /**
   * Formats a date into a Brazilian timestamp string: DD/MM/YYYY HH:mm
   * @param {Date} date - The date to format.
   * @returns {string}
   */
  formatTimestamp(date = new Date()) {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
};
