import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/redis', () => ({
    getRedis: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue('OK'),
    })),
    isRedisReady: vi.fn(() => false),
}));

import { verifyDiscordRoles } from '../discord-verify';
import { getRedis, isRedisReady } from '@/lib/redis';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const ACCESS_TOKEN = 'test-access-token';
const GUILD_ID = '111111111111111111';
const USER_ID = '222222222222222222';
const ROLE_A = '333333333333333333';
const ROLE_B = '444444444444444444';
const ROLE_C = '555555555555555555';

function mockDiscordMemberResponse(roles: string[], status = 200) {
    mockFetch.mockResolvedValueOnce({
        ok: status >= 200 && status < 300,
        status,
        json: async () => ({ roles }),
        text: async () => JSON.stringify({ roles }),
    });
}

function mockDiscordErrorResponse(status: number, body = 'error') {
    mockFetch.mockResolvedValueOnce({
        ok: false,
        status,
        json: async () => ({ message: body }),
        text: async () => body,
    });
}

describe('verifyDiscordRoles', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(isRedisReady).mockReturnValue(false);
    });

    it('calls the correct Discord API endpoint with bearer token', async () => {
        mockDiscordMemberResponse([ROLE_A]);

        await verifyDiscordRoles(ACCESS_TOKEN, GUILD_ID, [ROLE_A]);

        expect(mockFetch).toHaveBeenCalledWith(
            `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
            {
                headers: {
                    Authorization: `Bearer ${ACCESS_TOKEN}`,
                },
            },
        );
    });

    describe('role matching', () => {
        it('returns eligible: true when user has the required role', async () => {
            mockDiscordMemberResponse([ROLE_A, ROLE_B]);

            const result = await verifyDiscordRoles(ACCESS_TOKEN, GUILD_ID, [ROLE_A]);

            expect(result).toEqual({
                eligible: true,
                inGuild: true,
                userRoles: [ROLE_A, ROLE_B],
                // no error property when eligible
            });
            expect(result.error).toBeUndefined();
        });

        it('returns eligible: false with error when user is missing required roles', async () => {
            mockDiscordMemberResponse([ROLE_C]);

            const result = await verifyDiscordRoles(ACCESS_TOKEN, GUILD_ID, [ROLE_A, ROLE_B]);

            expect(result).toEqual({
                eligible: false,
                inGuild: true,
                userRoles: [ROLE_C],
                error: 'You do not have any of the required roles in this server.',
            });
        });

        it('uses OR logic — eligible if user has at least ONE required role', async () => {
            mockDiscordMemberResponse([ROLE_B]);

            const result = await verifyDiscordRoles(ACCESS_TOKEN, GUILD_ID, [ROLE_A, ROLE_B]);

            expect(result.eligible).toBe(true);
            expect(result.inGuild).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('returns eligible: false when user has no roles at all', async () => {
            mockDiscordMemberResponse([]);

            const result = await verifyDiscordRoles(ACCESS_TOKEN, GUILD_ID, [ROLE_A]);

            expect(result.eligible).toBe(false);
            expect(result.error).toBe('You do not have any of the required roles in this server.');
        });
    });

    describe('no required roles (guild membership only)', () => {
        it('returns eligible: true when requiredRoleIds is empty and user is in guild', async () => {
            mockDiscordMemberResponse([]);

            const result = await verifyDiscordRoles(ACCESS_TOKEN, GUILD_ID, []);

            expect(result).toEqual({
                eligible: true,
                inGuild: true,
                userRoles: [],
            });
            expect(result.error).toBeUndefined();
        });

        it('returns eligible: true with empty requiredRoleIds even when user has roles', async () => {
            mockDiscordMemberResponse([ROLE_A, ROLE_B]);

            const result = await verifyDiscordRoles(ACCESS_TOKEN, GUILD_ID, []);

            expect(result.eligible).toBe(true);
            expect(result.inGuild).toBe(true);
            expect(result.userRoles).toEqual([ROLE_A, ROLE_B]);
        });
    });

    describe('user not in guild', () => {
        it('returns inGuild: false and eligible: false on 404', async () => {
            mockDiscordErrorResponse(404);

            const result = await verifyDiscordRoles(ACCESS_TOKEN, GUILD_ID, [ROLE_A]);

            expect(result).toEqual({
                eligible: false,
                inGuild: false,
                userRoles: [],
                error: 'You are not a member of the required Discord server.',
            });
        });

        it('returns inGuild: false and eligible: false on 403', async () => {
            mockDiscordErrorResponse(403);

            const result = await verifyDiscordRoles(ACCESS_TOKEN, GUILD_ID, [ROLE_A]);

            expect(result).toEqual({
                eligible: false,
                inGuild: false,
                userRoles: [],
                error: 'You are not a member of the required Discord server.',
            });
        });
    });

    describe('Discord API errors', () => {
        it('returns error message on 500 server error', async () => {
            mockDiscordErrorResponse(500, 'Internal Server Error');

            const result = await verifyDiscordRoles(ACCESS_TOKEN, GUILD_ID, [ROLE_A]);

            expect(result).toEqual({
                eligible: false,
                inGuild: false,
                userRoles: [],
                error: 'Failed to verify Discord membership. Please try logging in again.',
            });
        });

        it('returns error message on 429 rate limit', async () => {
            mockDiscordErrorResponse(429, 'Rate limited');

            const result = await verifyDiscordRoles(ACCESS_TOKEN, GUILD_ID, [ROLE_A]);

            expect(result).toEqual({
                eligible: false,
                inGuild: false,
                userRoles: [],
                error: 'Failed to verify Discord membership. Please try logging in again.',
            });
        });

        it('returns error message on 401 unauthorized', async () => {
            mockDiscordErrorResponse(401, 'Unauthorized');

            const result = await verifyDiscordRoles(ACCESS_TOKEN, GUILD_ID, [ROLE_A]);

            expect(result).toEqual({
                eligible: false,
                inGuild: false,
                userRoles: [],
                error: 'Failed to verify Discord membership. Please try logging in again.',
            });
        });
    });

    describe('network/fetch errors', () => {
        it('returns eligible: false with error on network failure', async () => {
            mockFetch.mockRejectedValueOnce(new Error('fetch failed'));

            const result = await verifyDiscordRoles(ACCESS_TOKEN, GUILD_ID, [ROLE_A]);

            expect(result).toEqual({
                eligible: false,
                inGuild: false,
                userRoles: [],
                error: 'Failed to verify Discord roles. Please try again.',
            });
        });

        it('returns eligible: false with error on DNS resolution failure', async () => {
            mockFetch.mockRejectedValueOnce(new TypeError('getaddrinfo ENOTFOUND discord.com'));

            const result = await verifyDiscordRoles(ACCESS_TOKEN, GUILD_ID, [ROLE_A]);

            expect(result).toEqual({
                eligible: false,
                inGuild: false,
                userRoles: [],
                error: 'Failed to verify Discord roles. Please try again.',
            });
        });
    });

    describe('missing roles array in response', () => {
        it('defaults to empty roles when member.roles is undefined', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({}), // no roles field
            });

            const result = await verifyDiscordRoles(ACCESS_TOKEN, GUILD_ID, [ROLE_A]);

            expect(result.userRoles).toEqual([]);
            expect(result.eligible).toBe(false);
            expect(result.inGuild).toBe(true);
        });
    });

    describe('Redis caching', () => {
        it('does not attempt cache lookup when discordUserId is not provided', async () => {
            vi.mocked(isRedisReady).mockReturnValue(true);
            mockDiscordMemberResponse([ROLE_A]);

            await verifyDiscordRoles(ACCESS_TOKEN, GUILD_ID, [ROLE_A]);
            // Without userId, no cache interaction should occur, but fetch should be called
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('skips cache when Redis is not ready', async () => {
            vi.mocked(isRedisReady).mockReturnValue(false);
            mockDiscordMemberResponse([ROLE_A]);

            const result = await verifyDiscordRoles(ACCESS_TOKEN, GUILD_ID, [ROLE_A], USER_ID);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(result.eligible).toBe(true);
        });

        it('uses cached roles when available (cache hit)', async () => {
            vi.mocked(isRedisReady).mockReturnValue(true);
            const mockGet = vi.fn().mockResolvedValue(JSON.stringify([ROLE_A, ROLE_B]));
            const mockSet = vi.fn().mockResolvedValue('OK');
            vi.mocked(getRedis).mockReturnValue({ get: mockGet, set: mockSet } as any);

            const result = await verifyDiscordRoles(ACCESS_TOKEN, GUILD_ID, [ROLE_A], USER_ID);

            expect(mockGet).toHaveBeenCalledWith(`discord:roles:${USER_ID}:${GUILD_ID}`);
            // Should NOT call Discord API when cache hit
            expect(mockFetch).not.toHaveBeenCalled();
            expect(result).toEqual({
                eligible: true,
                inGuild: true,
                userRoles: [ROLE_A, ROLE_B],
            });
        });

        it('calls Discord API on cache miss and caches the result', async () => {
            vi.mocked(isRedisReady).mockReturnValue(true);
            const mockGet = vi.fn().mockResolvedValue(null);
            const mockSet = vi.fn().mockResolvedValue('OK');
            vi.mocked(getRedis).mockReturnValue({ get: mockGet, set: mockSet } as any);

            mockDiscordMemberResponse([ROLE_A]);

            const result = await verifyDiscordRoles(ACCESS_TOKEN, GUILD_ID, [ROLE_A], USER_ID);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(result.eligible).toBe(true);

            // Should cache the roles with TTL
            // Give fire-and-forget a tick to execute
            await vi.waitFor(() => {
                expect(mockSet).toHaveBeenCalledWith(
                    `discord:roles:${USER_ID}:${GUILD_ID}`,
                    JSON.stringify([ROLE_A]),
                    'EX',
                    30,
                );
            });
        });

        it('does not cache when user is not in guild (404)', async () => {
            vi.mocked(isRedisReady).mockReturnValue(true);
            const mockGet = vi.fn().mockResolvedValue(null);
            const mockSet = vi.fn().mockResolvedValue('OK');
            vi.mocked(getRedis).mockReturnValue({ get: mockGet, set: mockSet } as any);

            mockDiscordErrorResponse(404);

            await verifyDiscordRoles(ACCESS_TOKEN, GUILD_ID, [ROLE_A], USER_ID);

            expect(mockSet).not.toHaveBeenCalled();
        });

        it('does not cache when discordUserId is not provided', async () => {
            vi.mocked(isRedisReady).mockReturnValue(true);
            const mockGet = vi.fn().mockResolvedValue(null);
            const mockSet = vi.fn().mockResolvedValue('OK');
            vi.mocked(getRedis).mockReturnValue({ get: mockGet, set: mockSet } as any);

            mockDiscordMemberResponse([ROLE_A]);

            await verifyDiscordRoles(ACCESS_TOKEN, GUILD_ID, [ROLE_A]);
            // Allow fire-and-forget to settle
            await new Promise((r) => setTimeout(r, 10));

            expect(mockSet).not.toHaveBeenCalled();
        });

        it('gracefully handles Redis get errors (falls through to API)', async () => {
            vi.mocked(isRedisReady).mockReturnValue(true);
            const mockGet = vi.fn().mockRejectedValue(new Error('Redis connection lost'));
            const mockSet = vi.fn().mockResolvedValue('OK');
            vi.mocked(getRedis).mockReturnValue({ get: mockGet, set: mockSet } as any);

            mockDiscordMemberResponse([ROLE_A]);

            const result = await verifyDiscordRoles(ACCESS_TOKEN, GUILD_ID, [ROLE_A], USER_ID);

            // Should fall through to Discord API
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(result.eligible).toBe(true);
        });

        it('cache hit sets inGuild to true', async () => {
            vi.mocked(isRedisReady).mockReturnValue(true);
            const mockGet = vi.fn().mockResolvedValue(JSON.stringify([]));
            vi.mocked(getRedis).mockReturnValue({ get: mockGet, set: vi.fn() } as any);

            const result = await verifyDiscordRoles(ACCESS_TOKEN, GUILD_ID, [], USER_ID);

            expect(result.inGuild).toBe(true);
            expect(result.eligible).toBe(true);
        });
    });
});
