/**
 * Discord role verification helpers.
 * Uses the claimant's OAuth token (guilds.members.read scope) to check
 * guild membership and roles — no bot required.
 *
 * Caches user+guild → roles[] in Redis (5-min TTL) to mitigate
 * Discord's ~50 req/s rate limit under burst traffic.
 */

import { getRedis, isRedisReady } from '@/lib/redis';

const DISCORD_ROLE_CACHE_TTL = 300; // 5 minutes

export interface DiscordVerifyResult {
    eligible: boolean;
    inGuild: boolean;
    userRoles: string[];
    error?: string;
}

/**
 * Verify that a user has at least one of the required roles in a Discord guild.
 * Uses GET /users/@me/guilds/{guild_id}/member (requires guilds.members.read scope).
 *
 * @param discordUserId - Used as part of the Redis cache key (never sent to Discord API)
 */
export async function verifyDiscordRoles(
    accessToken: string,
    guildId: string,
    requiredRoleIds: string[],
    discordUserId?: string,
): Promise<DiscordVerifyResult> {
    try {
        // Try cache first
        const cachedRoles = discordUserId
            ? await getCachedRoles(discordUserId, guildId)
            : null;

        let userRoles: string[];
        let inGuild: boolean;

        if (cachedRoles !== null) {
            // Cache hit
            userRoles = cachedRoles;
            inGuild = true;
        } else {
            // Cache miss — call Discord API
            const res = await fetch(
                `https://discord.com/api/users/@me/guilds/${guildId}/member`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                },
            );

            if (res.status === 404 || res.status === 403) {
                return {
                    eligible: false,
                    inGuild: false,
                    userRoles: [],
                    error: 'You are not a member of the required Discord server.',
                };
            }

            if (!res.ok) {
                const text = await res.text();
                console.error(`Discord member check failed [${res.status}]:`, text);
                return {
                    eligible: false,
                    inGuild: false,
                    userRoles: [],
                    error: 'Failed to verify Discord membership. Please try logging in again.',
                };
            }

            const member = await res.json();
            userRoles = member.roles || [];
            inGuild = true;

            // Cache on success (fire-and-forget)
            if (discordUserId) {
                cacheRoles(discordUserId, guildId, userRoles).catch(() => {});
            }
        }

        // If no roles required, just guild membership is enough
        if (requiredRoleIds.length === 0) {
            return { eligible: true, inGuild, userRoles };
        }

        // OR logic: user needs at least ONE of the required roles
        const hasRole = requiredRoleIds.some((roleId) => userRoles.includes(roleId));

        return {
            eligible: hasRole,
            inGuild,
            userRoles,
            error: hasRole
                ? undefined
                : 'You do not have any of the required roles in this server.',
        };
    } catch (error) {
        console.error('Discord verify error:', error);
        return {
            eligible: false,
            inGuild: false,
            userRoles: [],
            error: 'Failed to verify Discord roles. Please try again.',
        };
    }
}

function cacheKey(userId: string, guildId: string): string {
    return `discord:roles:${userId}:${guildId}`;
}

async function getCachedRoles(userId: string, guildId: string): Promise<string[] | null> {
    if (!isRedisReady()) return null;
    try {
        const cached = await getRedis().get(cacheKey(userId, guildId));
        if (!cached) return null;
        return JSON.parse(cached);
    } catch {
        return null;
    }
}

async function cacheRoles(userId: string, guildId: string, roles: string[]): Promise<void> {
    if (!isRedisReady()) return;
    await getRedis().set(cacheKey(userId, guildId), JSON.stringify(roles), 'EX', DISCORD_ROLE_CACHE_TTL);
}
