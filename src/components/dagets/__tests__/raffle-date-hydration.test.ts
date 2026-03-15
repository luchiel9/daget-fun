import { describe, it, expect } from 'vitest';

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
    // This is the CURRENT (buggy) logic from edit/page.tsx line 53-55:
    // return apiValue ? new Date(apiValue).toISOString().slice(0, 16) : '';
    //
    // This is what it SHOULD do:
    return apiValue ? new Date(apiValue).toISOString() : '';
}

/** Simulates what DagetForm does to hydrate raffleDate from initialValues */
function hydrateRaffleDate(raffleEndsAt: string): string {
    if (!raffleEndsAt) return '';
    const d = new Date(raffleEndsAt);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Simulates what DagetForm does to hydrate raffleTime from initialValues */
function hydrateRaffleTime(raffleEndsAt: string): string {
    if (!raffleEndsAt) return '';
    const d = new Date(raffleEndsAt);
    if (isNaN(d.getTime())) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

describe('raffle_ends_at edit mode hydration', () => {
    // Use a fixed UTC time that we can verify
    const apiIsoString = '2026-03-20T10:30:00.000Z';

    it('transformRaffleEndsAt preserves full ISO string', () => {
        const result = transformRaffleEndsAt(apiIsoString);
        // Must be a valid ISO string that new Date() can parse correctly
        expect(result).toBe('2026-03-20T10:30:00.000Z');
    });

    it('transformRaffleEndsAt returns empty for null', () => {
        expect(transformRaffleEndsAt(null)).toBe('');
    });

    it('round-trips correctly: transform → hydrate → recombine matches original', () => {
        const transformed = transformRaffleEndsAt(apiIsoString);
        const date = hydrateRaffleDate(transformed);
        const time = hydrateRaffleTime(transformed);

        // Recombine the way DagetForm does on submit
        const recombined = new Date(`${date}T${time}`);

        // The original UTC time
        const original = new Date(apiIsoString);

        // They should represent the same moment (within 1 minute due to seconds truncation)
        expect(Math.abs(recombined.getTime() - original.getTime())).toBeLessThan(60 * 1000);
    });

    it('hydrated date and time match the local representation', () => {
        const transformed = transformRaffleEndsAt(apiIsoString);
        const date = hydrateRaffleDate(transformed);
        const time = hydrateRaffleTime(transformed);

        // The hydrated values should match what the user sees in their local timezone
        const localDate = new Date(apiIsoString);
        const expectedDate = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
        const expectedTime = `${String(localDate.getHours()).padStart(2, '0')}:${String(localDate.getMinutes()).padStart(2, '0')}`;

        expect(date).toBe(expectedDate);
        expect(time).toBe(expectedTime);
    });
});
