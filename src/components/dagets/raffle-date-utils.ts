/**
 * Utilities for converting Date objects to local date/time strings
 * suitable for HTML <input type="date"> and <input type="time"> values.
 *
 * These always use the browser's local timezone (getFullYear, getMonth, etc.)
 * rather than UTC (toISOString), ensuring the user sees and picks dates
 * in their own timezone.
 */

/** Returns 'YYYY-MM-DD' in local timezone, or '' for invalid dates. */
export function toLocalDateString(d: Date): string {
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Returns 'HH:MM' in local timezone, or '' for invalid dates. */
export function toLocalTimeString(d: Date): string {
    if (isNaN(d.getTime())) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
