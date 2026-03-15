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

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Returns '22 Mar 2026' format in local timezone, or '' for invalid dates. */
export function formatDisplayDate(d: Date): string {
    if (isNaN(d.getTime())) return '';
    return `${d.getDate()} ${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** Returns '2:30 PM' format in local timezone, or '' for invalid dates. */
export function formatDisplayTime(d: Date): string {
    if (isNaN(d.getTime())) return '';
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Full month name for calendar header. */
export function getMonthName(month: number): string {
    return MONTH_NAMES_FULL[month];
}

/** Days in a given month (0-indexed month). */
export function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

/** Day of week the month starts on (0 = Sun). */
export function getFirstDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 1).getDay();
}
