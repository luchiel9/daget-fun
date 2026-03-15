import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    displayToBaseUnits,
    baseUnitsToDisplay,
    getTokenConfig,
    NATIVE_SOL_MINT,
    TOKEN_CONFIG,
} from '../tokens';

describe('NATIVE_SOL_MINT', () => {
    it('equals "native"', () => {
        expect(NATIVE_SOL_MINT).toBe('native');
    });
});

describe('displayToBaseUnits', () => {
    it('converts "10.50" with 6 decimals to 10500000', () => {
        expect(displayToBaseUnits('10.50', 6)).toBe(10_500_000);
    });

    it('converts "1" with 9 decimals to 1000000000', () => {
        expect(displayToBaseUnits('1', 9)).toBe(1_000_000_000);
    });

    it('converts "0.000001" with 6 decimals to 1', () => {
        expect(displayToBaseUnits('0.000001', 6)).toBe(1);
    });

    it('throws on invalid input', () => {
        expect(() => displayToBaseUnits('abc', 6)).toThrow('Invalid display amount');
    });

    it('throws on negative input', () => {
        expect(() => displayToBaseUnits('-5', 6)).toThrow('Invalid display amount');
    });

    it('throws on zero input', () => {
        expect(() => displayToBaseUnits('0', 6)).toThrow('Invalid display amount');
    });

    it('throws when amount exceeds MAX_SAFE_INTEGER', () => {
        // 9999999999 * 10^9 exceeds MAX_SAFE_INTEGER
        expect(() => displayToBaseUnits('9999999999', 9)).toThrow(
            'Amount exceeds safe integer range',
        );
    });
});

describe('baseUnitsToDisplay', () => {
    it('converts 10500000 with 6 decimals to "10.50"', () => {
        expect(baseUnitsToDisplay(10_500_000, 6)).toBe('10.50');
    });

    it('converts 1000000000 with 9 decimals to "1.00"', () => {
        expect(baseUnitsToDisplay(1_000_000_000, 9)).toBe('1.00');
    });
});

describe('getTokenConfig', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
    });

    it('returns correct USDC config for mainnet-beta', () => {
        vi.stubEnv('SOLANA_CLUSTER', 'mainnet-beta');
        vi.stubEnv('NEXT_PUBLIC_SOLANA_CLUSTER', '');

        const usdc = getTokenConfig('USDC');
        expect(usdc.mint).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
        expect(usdc.decimals).toBe(6);
    });

    it('returns correct USDT config for mainnet-beta', () => {
        vi.stubEnv('SOLANA_CLUSTER', 'mainnet-beta');
        vi.stubEnv('NEXT_PUBLIC_SOLANA_CLUSTER', '');

        const usdt = getTokenConfig('USDT');
        expect(usdt.mint).toBe('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
        expect(usdt.decimals).toBe(6);
    });

    it('returns correct SOL config for mainnet-beta', () => {
        vi.stubEnv('SOLANA_CLUSTER', 'mainnet-beta');
        vi.stubEnv('NEXT_PUBLIC_SOLANA_CLUSTER', '');

        const sol = getTokenConfig('SOL');
        expect(sol.mint).toBe('native');
        expect(sol.decimals).toBe(9);
    });

    it('SOL mint is "native"', () => {
        vi.stubEnv('SOLANA_CLUSTER', 'mainnet-beta');
        vi.stubEnv('NEXT_PUBLIC_SOLANA_CLUSTER', '');

        expect(getTokenConfig('SOL').mint).toBe(NATIVE_SOL_MINT);
    });

    it('USDC has 6 decimals', () => {
        vi.stubEnv('SOLANA_CLUSTER', 'mainnet-beta');
        vi.stubEnv('NEXT_PUBLIC_SOLANA_CLUSTER', '');

        expect(getTokenConfig('USDC').decimals).toBe(6);
    });

    it('SOL has 9 decimals', () => {
        vi.stubEnv('SOLANA_CLUSTER', 'mainnet-beta');
        vi.stubEnv('NEXT_PUBLIC_SOLANA_CLUSTER', '');

        expect(getTokenConfig('SOL').decimals).toBe(9);
    });

    it('throws on unknown cluster', () => {
        vi.stubEnv('SOLANA_CLUSTER', 'unknown-cluster');
        vi.stubEnv('NEXT_PUBLIC_SOLANA_CLUSTER', '');

        expect(() => getTokenConfig('USDC')).toThrow('Unknown SOLANA_CLUSTER: unknown-cluster');
    });
});
