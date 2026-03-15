import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SignJWT } from 'jose';

const TEST_SECRET = 'test-session-secret-that-is-at-least-32-chars-long';
const DIFFERENT_SECRET = 'a-completely-different-secret-that-is-also-long-enough';

describe('session module', () => {
    beforeEach(() => {
        vi.stubEnv('SESSION_SECRET', TEST_SECRET);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('getSecret validation', () => {
        it('throws when SESSION_SECRET is not set', async () => {
            vi.stubEnv('SESSION_SECRET', '');

            const { createSessionToken } = await import('../session');
            await expect(
                createSessionToken({ userId: 'u1', discordUserId: 'd1' })
            ).rejects.toThrow('SESSION_SECRET env var is required');
        });

        it('throws when SESSION_SECRET is undefined', async () => {
            delete process.env.SESSION_SECRET;

            const { createSessionToken } = await import('../session');
            await expect(
                createSessionToken({ userId: 'u1', discordUserId: 'd1' })
            ).rejects.toThrow('SESSION_SECRET env var is required');
        });

        it('throws when SESSION_SECRET is shorter than 32 characters', async () => {
            vi.stubEnv('SESSION_SECRET', 'too-short');

            const { createSessionToken } = await import('../session');
            await expect(
                createSessionToken({ userId: 'u1', discordUserId: 'd1' })
            ).rejects.toThrow('SESSION_SECRET must be at least 32 characters');
        });

        it('throws when SESSION_SECRET is exactly 31 characters', async () => {
            vi.stubEnv('SESSION_SECRET', 'a'.repeat(31));

            const { createSessionToken } = await import('../session');
            await expect(
                createSessionToken({ userId: 'u1', discordUserId: 'd1' })
            ).rejects.toThrow('SESSION_SECRET must be at least 32 characters');
        });

        it('accepts SESSION_SECRET that is exactly 32 characters', async () => {
            vi.stubEnv('SESSION_SECRET', 'a'.repeat(32));

            const { createSessionToken } = await import('../session');
            const token = await createSessionToken({
                userId: 'u1',
                discordUserId: 'd1',
            });
            expect(token).toBeTruthy();
        });

        it('throws when SESSION_SECRET starts with "your-"', async () => {
            vi.stubEnv(
                'SESSION_SECRET',
                'your-secret-key-placeholder-that-is-long-enough'
            );

            const { createSessionToken } = await import('../session');
            await expect(
                createSessionToken({ userId: 'u1', discordUserId: 'd1' })
            ).rejects.toThrow('SESSION_SECRET appears to be a placeholder');
        });

        it('throws when SESSION_SECRET starts with "your_"', async () => {
            vi.stubEnv(
                'SESSION_SECRET',
                'your_secret_key_placeholder_that_is_long_enough'
            );

            const { createSessionToken } = await import('../session');
            await expect(
                createSessionToken({ userId: 'u1', discordUserId: 'd1' })
            ).rejects.toThrow('SESSION_SECRET appears to be a placeholder');
        });
    });

    describe('createSessionToken + verifySessionToken round-trip', () => {
        it('creates a token and verifies it, returning the original payload', async () => {
            const { createSessionToken, verifySessionToken } = await import(
                '../session'
            );
            const payload = {
                userId: 'user-123',
                discordUserId: 'discord-456',
            };

            const token = await createSessionToken(payload);
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3); // JWT has 3 parts

            const result = await verifySessionToken(token);
            expect(result).toEqual(payload);
        });

        it('preserves different payload values across round-trips', async () => {
            const { createSessionToken, verifySessionToken } = await import(
                '../session'
            );
            const payload = {
                userId: 'cm9abc123def',
                discordUserId: '1234567890123456789',
            };

            const token = await createSessionToken(payload);
            const result = await verifySessionToken(token);
            expect(result).toEqual(payload);
        });

        it('returns only userId and discordUserId from the verified token', async () => {
            const { createSessionToken, verifySessionToken } = await import(
                '../session'
            );
            const payload = {
                userId: 'user-1',
                discordUserId: 'disc-1',
            };

            const token = await createSessionToken(payload);
            const result = await verifySessionToken(token);

            // Should not include JWT standard claims like iss, aud, exp, iat
            expect(result).toEqual({
                userId: 'user-1',
                discordUserId: 'disc-1',
            });
            expect(Object.keys(result!)).toHaveLength(2);
        });
    });

    describe('verifySessionToken rejects invalid tokens', () => {
        it('returns null for garbage input', async () => {
            const { verifySessionToken } = await import('../session');

            expect(await verifySessionToken('')).toBeNull();
            expect(await verifySessionToken('not-a-jwt')).toBeNull();
            expect(await verifySessionToken('a.b.c')).toBeNull();
            expect(
                await verifySessionToken('eyJhbGciOiJIUzI1NiJ9.garbage.data')
            ).toBeNull();
        });

        it('returns null for a tampered token (modified payload)', async () => {
            const { createSessionToken, verifySessionToken } = await import(
                '../session'
            );

            const token = await createSessionToken({
                userId: 'user-1',
                discordUserId: 'disc-1',
            });

            // Tamper with the payload portion (second segment)
            const parts = token.split('.');
            // Flip a character in the payload
            const tamperedPayload =
                parts[1].charAt(0) === 'a'
                    ? 'b' + parts[1].slice(1)
                    : 'a' + parts[1].slice(1);
            const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

            const result = await verifySessionToken(tamperedToken);
            expect(result).toBeNull();
        });

        it('returns null for a tampered token (modified signature)', async () => {
            const { createSessionToken, verifySessionToken } = await import(
                '../session'
            );

            const token = await createSessionToken({
                userId: 'user-1',
                discordUserId: 'disc-1',
            });

            // Tamper with the signature (third segment)
            const parts = token.split('.');
            const tamperedSig =
                parts[2].charAt(0) === 'a'
                    ? 'b' + parts[2].slice(1)
                    : 'a' + parts[2].slice(1);
            const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSig}`;

            const result = await verifySessionToken(tamperedToken);
            expect(result).toBeNull();
        });

        it('returns null for a token signed with a different secret', async () => {
            const { verifySessionToken } = await import('../session');

            // Sign a token with a different secret directly using jose
            const differentKey = new TextEncoder().encode(DIFFERENT_SECRET);
            const token = await new SignJWT({
                userId: 'user-1',
                discordUserId: 'disc-1',
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt()
                .setIssuer('daget.fun')
                .setAudience('daget.fun:session')
                .setExpirationTime('7d')
                .sign(differentKey);

            const result = await verifySessionToken(token);
            expect(result).toBeNull();
        });

        it('returns null for a token with wrong issuer', async () => {
            const { verifySessionToken } = await import('../session');

            const key = new TextEncoder().encode(TEST_SECRET);
            const token = await new SignJWT({
                userId: 'user-1',
                discordUserId: 'disc-1',
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt()
                .setIssuer('wrong-issuer')
                .setAudience('daget.fun:session')
                .setExpirationTime('7d')
                .sign(key);

            const result = await verifySessionToken(token);
            expect(result).toBeNull();
        });

        it('returns null for a token with wrong audience', async () => {
            const { verifySessionToken } = await import('../session');

            const key = new TextEncoder().encode(TEST_SECRET);
            const token = await new SignJWT({
                userId: 'user-1',
                discordUserId: 'disc-1',
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt()
                .setIssuer('daget.fun')
                .setAudience('wrong-audience')
                .setExpirationTime('7d')
                .sign(key);

            const result = await verifySessionToken(token);
            expect(result).toBeNull();
        });

        it('returns null for an expired token', async () => {
            const { verifySessionToken } = await import('../session');

            const key = new TextEncoder().encode(TEST_SECRET);
            // Create a token that expired 1 second ago
            const token = await new SignJWT({
                userId: 'user-1',
                discordUserId: 'disc-1',
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt(Math.floor(Date.now() / 1000) - 3600) // issued 1 hour ago
                .setIssuer('daget.fun')
                .setAudience('daget.fun:session')
                .setExpirationTime(Math.floor(Date.now() / 1000) - 1) // expired 1 second ago
                .sign(key);

            const result = await verifySessionToken(token);
            expect(result).toBeNull();
        });
    });
});
