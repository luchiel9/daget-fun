import { describe, it, expect } from 'vitest';
import { toLocalDateString, toLocalTimeString, formatDisplayDate, formatDisplayTime } from '../raffle-date-utils';

/**
 * Test the data transformation that edit page performs on raffle_ends_at
 * before passing it to DagetForm as initialValues.
 *
 * Bug: edit page was truncating ISO string to 'YYYY-MM-DDTHH:mm' using
 * toISOString().slice(0, 16), which produces UTC-based parts. DagetForm
 * then parses this with new Date(str) which interprets it as local time,
 * causing a timezone offset in non-UTC timezones.
 *
 * Fix: pass the full ISO string so DagetForm's new Date(fullISO) correctly
 * interprets it as UTC and getHours()/getDate() return local values.
 */

/** Simulates what edit page does to transform the API response */
function transformRaffleEndsAt(apiValue: string | null): string {
    return apiValue ? new Date(apiValue).toISOString() : '';
}

describe('raffle_ends_at edit mode hydration', () => {
    const apiIsoString = '2026-03-20T10:30:00.000Z';

    it('transformRaffleEndsAt preserves full ISO string', () => {
        const result = transformRaffleEndsAt(apiIsoString);
        expect(result).toBe('2026-03-20T10:30:00.000Z');
    });

    it('transformRaffleEndsAt returns empty for null', () => {
        expect(transformRaffleEndsAt(null)).toBe('');
    });

    it('round-trips correctly: transform → hydrate → recombine matches original', () => {
        const transformed = transformRaffleEndsAt(apiIsoString);
        const date = toLocalDateString(new Date(transformed));
        const time = toLocalTimeString(new Date(transformed));

        const recombined = new Date(`${date}T${time}`);
        const original = new Date(apiIsoString);

        // Within 1 minute due to seconds truncation
        expect(Math.abs(recombined.getTime() - original.getTime())).toBeLessThan(60 * 1000);
    });

    it('hydrated date and time match the local representation', () => {
        const transformed = transformRaffleEndsAt(apiIsoString);
        const date = toLocalDateString(new Date(transformed));
        const time = toLocalTimeString(new Date(transformed));

        const localDate = new Date(apiIsoString);
        const expectedDate = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
        const expectedTime = `${String(localDate.getHours()).padStart(2, '0')}:${String(localDate.getMinutes()).padStart(2, '0')}`;

        expect(date).toBe(expectedDate);
        expect(time).toBe(expectedTime);
    });
});

describe('toLocalDateString', () => {
    it('returns YYYY-MM-DD in local timezone', () => {
        // Use a date where we know the local parts
        const d = new Date(2026, 5, 15, 14, 30); // June 15 2026, 2:30 PM local
        expect(toLocalDateString(d)).toBe('2026-06-15');
    });

    it('pads single-digit month and day', () => {
        const d = new Date(2026, 0, 5, 8, 0); // Jan 5
        expect(toLocalDateString(d)).toBe('2026-01-05');
    });

    it('returns empty string for Invalid Date', () => {
        expect(toLocalDateString(new Date('invalid'))).toBe('');
    });
});

describe('toLocalTimeString', () => {
    it('returns HH:MM in local timezone', () => {
        const d = new Date(2026, 5, 15, 14, 30);
        expect(toLocalTimeString(d)).toBe('14:30');
    });

    it('pads single-digit hours and minutes', () => {
        const d = new Date(2026, 5, 15, 3, 5);
        expect(toLocalTimeString(d)).toBe('03:05');
    });

    it('handles midnight', () => {
        const d = new Date(2026, 5, 15, 0, 0);
        expect(toLocalTimeString(d)).toBe('00:00');
    });

    it('returns empty string for Invalid Date', () => {
        expect(toLocalTimeString(new Date('invalid'))).toBe('');
    });
});

describe('formatDisplayDate', () => {
    it('returns "22 Mar 2026" format', () => {
        const d = new Date(2026, 2, 22); // March 22
        expect(formatDisplayDate(d)).toBe('22 Mar 2026');
    });

    it('handles single-digit day', () => {
        const d = new Date(2026, 0, 5); // Jan 5
        expect(formatDisplayDate(d)).toBe('5 Jan 2026');
    });

    it('returns empty string for Invalid Date', () => {
        expect(formatDisplayDate(new Date('invalid'))).toBe('');
    });
});

describe('formatDisplayTime', () => {
    it('returns 12-hour format with AM/PM', () => {
        const d = new Date(2026, 0, 1, 14, 30);
        expect(formatDisplayTime(d)).toBe('2:30 PM');
    });

    it('handles midnight as 12:00 AM', () => {
        const d = new Date(2026, 0, 1, 0, 0);
        expect(formatDisplayTime(d)).toBe('12:00 AM');
    });

    it('handles noon as 12:00 PM', () => {
        const d = new Date(2026, 0, 1, 12, 0);
        expect(formatDisplayTime(d)).toBe('12:00 PM');
    });

    it('pads single-digit minutes', () => {
        const d = new Date(2026, 0, 1, 9, 5);
        expect(formatDisplayTime(d)).toBe('9:05 AM');
    });

    it('returns empty string for Invalid Date', () => {
        expect(formatDisplayTime(new Date('invalid'))).toBe('');
    });
});
