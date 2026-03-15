import { describe, it, expect, vi } from 'vitest';
import { cryptoJitter } from '../processor';

describe('cryptoJitter', () => {
    it('returns a value between 0 and maxValue', () => {
        for (let i = 0; i < 100; i++) {
            const result = cryptoJitter(100);
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(100);
        }
    });

    it('returns 0 when maxValue is 0', () => {
        expect(cryptoJitter(0)).toBe(0);
    });

    it('does not use Math.random', () => {
        const spy = vi.spyOn(Math, 'random');
        cryptoJitter(100);
        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });
});
