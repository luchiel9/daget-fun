import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('cursor module', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('throws in production when CURSOR_SECRET is not set', async () => {
        process.env.NODE_ENV = 'production';
        delete process.env.CURSOR_SECRET;

        const mod = await import('../cursor');
        // Lazy check — throws on first use, not on import
        expect(() => mod.encodeCursor('2024-01-01', 'abc')).toThrow(
            'CURSOR_SECRET'
        );
    });

    it('does not throw in development when CURSOR_SECRET is not set', async () => {
        process.env.NODE_ENV = 'development';
        delete process.env.CURSOR_SECRET;

        const mod = await import('../cursor');
        // Should work fine with dev fallback
        const encoded = mod.encodeCursor('2024-01-01', 'abc');
        expect(encoded).toBeTruthy();
    });

    it('works in production when CURSOR_SECRET is set', async () => {
        process.env.NODE_ENV = 'production';
        process.env.CURSOR_SECRET = 'my-production-secret-key-thats-long-enough';

        const mod = await import('../cursor');
        const encoded = mod.encodeCursor('2024-01-01', 'abc');
        const decoded = mod.decodeCursor(encoded);
        expect(decoded).toEqual({ v: '2024-01-01', id: 'abc' });
    });
});
