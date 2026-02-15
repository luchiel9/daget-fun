/**
 * Discord role verification helpers.
 * Uses the claimant's OAuth token (guilds.members.read scope) to check
 * guild membership and roles — no bot required.
 */

export interface DiscordVerifyResult {
    eligible: boolean;
    inGuild: boolean;
    userRoles: string[];
    error?: string;
}

/**
 * Verify that a user has at least one of the required roles in a Discord guild.
 * Uses GET /users/@me/guilds/{guild_id}/member (requires guilds.members.read scope).
 */
export async function verifyDiscordRoles(
    accessToken: string,
    guildId: string,
    requiredRoleIds: string[],
): Promise<DiscordVerifyResult> {
    try {
        const res = await fetch(
            `https://discord.com/api/users/@me/guilds/${guildId}/member`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            },
        );

        if (res.status === 404 || res.status === 403) {
            // User is not in the guild
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
        const userRoles: string[] = member.roles || [];

        // If no roles required, just guild membership is enough
        if (requiredRoleIds.length === 0) {
            return { eligible: true, inGuild: true, userRoles };
        }

        // OR logic: user needs at least ONE of the required roles
        const hasRole = requiredRoleIds.some((roleId) => userRoles.includes(roleId));

        return {
            eligible: hasRole,
            inGuild: true,
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
