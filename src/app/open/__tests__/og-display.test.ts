import { describe, it, expect } from 'vitest';
import { getOgModeLabel, getOgStatsLabel } from '../og-display-utils';

describe('getOgModeLabel', () => {
    it('returns "Fixed" for fixed daget type', () => {
        expect(getOgModeLabel('fixed')).toBe('Fixed');
    });

    it('returns "Random" for random daget type', () => {
        expect(getOgModeLabel('random')).toBe('Random');
    });

    it('returns "Raffle" for raffle daget type', () => {
        expect(getOgModeLabel('raffle')).toBe('Raffle');
    });
});

describe('getOgStatsLabel', () => {
    it('returns "Claimed X / Y" for fixed mode', () => {
        expect(getOgStatsLabel('fixed', 3, 10)).toEqual({
            label: 'Claimed',
            value: '3 / 10',
        });
    });

    it('returns "Claimed X / Y" for random mode', () => {
        expect(getOgStatsLabel('random', 5, 20)).toEqual({
            label: 'Claimed',
            value: '5 / 20',
        });
    });

    it('returns entries and winners for raffle mode', () => {
        expect(getOgStatsLabel('raffle', 3, 2)).toEqual({
            label: 'Entries',
            value: '3',
            secondaryLabel: 'Winners',
            secondaryValue: '2',
        });
    });
});
