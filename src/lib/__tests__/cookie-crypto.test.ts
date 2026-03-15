import { describe, it, expect, vi, beforeEach } from 'vitest';

const TEST_SECRET = 'test-session-secret-that-is-at-least-32-chars-long';

describe('cookie-crypto', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.stubEnv('SESSION_SECRET', TEST_SECRET);
    });

    async function loadModule() {
        return import('../cookie-crypto');
    }

    // ── Round-trip ──────────────────────────────────────────────────────

    describe('round-trip', () => {
        it('encrypt then decrypt returns original plaintext', async () => {
            const { encryptCookieValue, decryptCookieValue } =
                await loadModule();

            const plaintext = 'hello world';
            const encrypted = encryptCookieValue(plaintext);
            const decrypted = decryptCookieValue(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('empty string encrypts but decrypts to null (0-byte ciphertext trips length guard)', async () => {
            const { encryptCookieValue, decryptCookieValue } =
                await loadModule();

            // Empty plaintext produces iv(12) + tag(16) + 0 bytes = 28 bytes,
            // which is below the 29-byte minimum in decryptCookieValue.
            const encrypted = encryptCookieValue('');
            expect(decryptCookieValue(encrypted)).toBeNull();
        });

        it('handles long plaintext', async () => {
            const { encryptCookieValue, decryptCookieValue } =
                await loadModule();

            const plaintext = 'a'.repeat(10_000);
            const encrypted = encryptCookieValue(plaintext);
            const decrypted = decryptCookieValue(encrypted);

            expect(decrypted).toBe(plaintext);
        });
    });

    // ── Random IV ───────────────────────────────────────────────────────

    describe('random IV', () => {
        it('different plaintexts produce different ciphertexts', async () => {
            const { encryptCookieValue } = await loadModule();

            const a = encryptCookieValue('plaintext-a');
            const b = encryptCookieValue('plaintext-b');

            expect(a).not.toBe(b);
        });

        it('same plaintext encrypted twice produces different ciphertexts', async () => {
            const { encryptCookieValue } = await loadModule();

            const first = encryptCookieValue('identical');
            const second = encryptCookieValue('identical');

            expect(first).not.toBe(second);
        });
    });

    // ── Tampered / invalid ciphertext ───────────────────────────────────

    describe('tampered ciphertext returns null', () => {
        it('flipping a byte in the ciphertext portion fails auth tag verification', async () => {
            const { encryptCookieValue, decryptCookieValue } =
                await loadModule();

            const encrypted = encryptCookieValue('secret data');
            const buf = Buffer.from(encrypted, 'base64url');

            // Flip a byte in the encrypted payload (after iv[12] + tag[16] = 28)
            buf[28] ^= 0xff;

            const tampered = buf.toString('base64url');
            expect(decryptCookieValue(tampered)).toBeNull();
        });

        it('flipping a byte in the auth tag fails verification', async () => {
            const { encryptCookieValue, decryptCookieValue } =
                await loadModule();

            const encrypted = encryptCookieValue('secret data');
            const buf = Buffer.from(encrypted, 'base64url');

            // Flip a byte in the auth tag region (bytes 12-27)
            buf[15] ^= 0xff;

            const tampered = buf.toString('base64url');
            expect(decryptCookieValue(tampered)).toBeNull();
        });

        it('flipping a byte in the IV fails verification', async () => {
            const { encryptCookieValue, decryptCookieValue } =
                await loadModule();

            const encrypted = encryptCookieValue('secret data');
            const buf = Buffer.from(encrypted, 'base64url');

            // Flip a byte in the IV region (bytes 0-11)
            buf[0] ^= 0xff;

            const tampered = buf.toString('base64url');
            expect(decryptCookieValue(tampered)).toBeNull();
        });
    });

    // ── Truncated ciphertext ────────────────────────────────────────────

    describe('truncated ciphertext returns null', () => {
        it('returns null for data shorter than 29 bytes (iv + tag + min 1 byte)', async () => {
            const { decryptCookieValue } = await loadModule();

            // 28 bytes = exactly iv(12) + tag(16), no ciphertext byte
            const shortBuf = Buffer.alloc(28, 0x41);
            expect(decryptCookieValue(shortBuf.toString('base64url'))).toBeNull();
        });

        it('returns null for single-byte input', async () => {
            const { decryptCookieValue } = await loadModule();

            const singleByte = Buffer.from([0x42]).toString('base64url');
            expect(decryptCookieValue(singleByte)).toBeNull();
        });

        it('returns null for empty string', async () => {
            const { decryptCookieValue } = await loadModule();

            expect(decryptCookieValue('')).toBeNull();
        });
    });

    // ── Garbage input ───────────────────────────────────────────────────

    describe('garbage input returns null', () => {
        it('returns null for random non-base64url string', async () => {
            const { decryptCookieValue } = await loadModule();

            expect(decryptCookieValue('not-valid-ciphertext!!!')).toBeNull();
        });

        it('returns null for valid base64url but meaningless data', async () => {
            const { decryptCookieValue } = await loadModule();

            // 64 random bytes encoded as base64url — valid format but wrong key material
            const garbage = Buffer.alloc(64, 0xde).toString('base64url');
            expect(decryptCookieValue(garbage)).toBeNull();
        });

        it('returns null for JSON string', async () => {
            const { decryptCookieValue } = await loadModule();

            expect(decryptCookieValue('{"user":"admin"}')).toBeNull();
        });
    });

    // ── getDerivedKey validation ─────────────────────────────────────────

    describe('getDerivedKey validation (via encryptCookieValue)', () => {
        it('throws when SESSION_SECRET is missing', async () => {
            vi.stubEnv('SESSION_SECRET', '');
            // Also delete to cover the !secret falsy check
            delete process.env.SESSION_SECRET;

            const { encryptCookieValue } = await loadModule();

            expect(() => encryptCookieValue('test')).toThrow(
                'SESSION_SECRET env var is required',
            );
        });

        it('throws when SESSION_SECRET is empty string', async () => {
            vi.stubEnv('SESSION_SECRET', '');

            const { encryptCookieValue } = await loadModule();

            expect(() => encryptCookieValue('test')).toThrow(
                'SESSION_SECRET env var is required',
            );
        });

        it('throws when SESSION_SECRET is shorter than 32 characters', async () => {
            vi.stubEnv('SESSION_SECRET', 'only-31-chars-xxxxxxxxxxxxxxx');

            const { encryptCookieValue } = await loadModule();

            expect(() => encryptCookieValue('test')).toThrow(
                'SESSION_SECRET must be at least 32 characters',
            );
        });

        it('throws when SESSION_SECRET is a placeholder starting with "your-"', async () => {
            vi.stubEnv(
                'SESSION_SECRET',
                'your-secret-key-here-placeholder-value-long-enough',
            );

            const { encryptCookieValue } = await loadModule();

            expect(() => encryptCookieValue('test')).toThrow(
                'SESSION_SECRET appears to be a placeholder',
            );
        });

        it('throws when SESSION_SECRET is a placeholder starting with "your_"', async () => {
            vi.stubEnv(
                'SESSION_SECRET',
                'your_secret_key_here_placeholder_value_long_enough',
            );

            const { encryptCookieValue } = await loadModule();

            expect(() => encryptCookieValue('test')).toThrow(
                'SESSION_SECRET appears to be a placeholder',
            );
        });

        it('accepts a valid SESSION_SECRET of exactly 32 characters', async () => {
            vi.stubEnv('SESSION_SECRET', 'abcdefghijklmnopqrstuvwxyz123456');

            const { encryptCookieValue, decryptCookieValue } =
                await loadModule();

            const encrypted = encryptCookieValue('test');
            expect(decryptCookieValue(encrypted)).toBe('test');
        });
    });

    // ── Unicode plaintext round-trip ────────────────────────────────────

    describe('unicode plaintext round-trip', () => {
        it('handles emoji characters', async () => {
            const { encryptCookieValue, decryptCookieValue } =
                await loadModule();

            const plaintext = 'Hello World! \u{1F680}\u{1F30D}\u{2728}\u{1F389}';
            const encrypted = encryptCookieValue(plaintext);
            expect(decryptCookieValue(encrypted)).toBe(plaintext);
        });

        it('handles CJK characters', async () => {
            const { encryptCookieValue, decryptCookieValue } =
                await loadModule();

            const plaintext = '\u4F60\u597D\u4E16\u754C \u3053\u3093\u306B\u3061\u306F \uC548\uB155\uD558\uC138\uC694';
            const encrypted = encryptCookieValue(plaintext);
            expect(decryptCookieValue(encrypted)).toBe(plaintext);
        });

        it('handles mixed unicode and ASCII', async () => {
            const { encryptCookieValue, decryptCookieValue } =
                await loadModule();

            const plaintext = 'user:\u00FC\u00E4\u00F6 token:\u{1F4B0} id:123';
            const encrypted = encryptCookieValue(plaintext);
            expect(decryptCookieValue(encrypted)).toBe(plaintext);
        });

        it('handles multi-byte surrogate pair characters', async () => {
            const { encryptCookieValue, decryptCookieValue } =
                await loadModule();

            // U+1F600 (grinning face) is a 4-byte UTF-8 / surrogate pair in UTF-16
            const plaintext = '\u{1F600}\u{1F4A9}\u{1F47B}';
            const encrypted = encryptCookieValue(plaintext);
            expect(decryptCookieValue(encrypted)).toBe(plaintext);
        });
    });

    // ── Cross-key decryption ────────────────────────────────────────────

    describe('cross-key decryption', () => {
        it('ciphertext from one key cannot be decrypted with another', async () => {
            vi.stubEnv('SESSION_SECRET', TEST_SECRET);
            const mod1 = await loadModule();
            const encrypted = mod1.encryptCookieValue('sensitive');

            // Switch to a different secret
            vi.resetModules();
            vi.stubEnv(
                'SESSION_SECRET',
                'completely-different-secret-key-that-is-also-long-enough',
            );
            const mod2 = await import('../cookie-crypto');

            expect(mod2.decryptCookieValue(encrypted)).toBeNull();
        });
    });
});
