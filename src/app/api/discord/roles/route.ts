import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getDiscordAccessToken } from '@/lib/auth';
import { Errors } from '@/lib/errors';

export async function GET(request: NextRequest) {
    try {
        await requireAuth();

        const { searchParams } = new URL(request.url);
        const guildId = searchParams.get('guild_id');

        if (!guildId) {
            return Errors.validation('Guild ID is required');
        }

        // Strategy: Try User Token first (preferred for "Bot-less" setup if user has permissions)
        // Fallback to Bot Token if User Token fails (401/403) or is missing.

        let rolesData = null;
        let lastError = null;

        // 1. Try User Token
        const userToken = await getDiscordAccessToken();
        if (userToken) {
            try {
                const res = await fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
                    headers: {
                        Authorization: `Bearer ${userToken}`,
                    },
                });

                if (res.ok) {
                    rolesData = await res.json();
                } else {
                    const text = await res.text();
                    console.warn(`User Token role fetch failed [${res.status}]: ${text}`);
                    // We don't return error yet, we allow fallback to Bot
                }
            } catch (e) {
                console.error('User Token fetch error:', e);
            }
        }

        // 2. Try Bot Token if User Token failed
        if (!rolesData) {
            const botToken = process.env.DISCORD_BOT_TOKEN;
            if (botToken) {
                const res = await fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
                    headers: {
                        Authorization: `Bot ${botToken}`,
                    },
                });

                if (res.ok) {
                    rolesData = await res.json();
                } else {
                    const text = await res.text();
                    console.error(`Bot Token role fetch failed [${res.status}]: ${text}`);

                    if (res.status === 403 || res.status === 404) {
                        // This is the specific error 'Bot not in guild'
                        // But we should only return this if we haven't already returned a "User permission" error?
                        // Actually if both fail, we essentially say "Neither could fetch it".
                        // Returning BOT_NOT_IN_GUILD is useful to trigger the Invite UI.
                        return Errors.forbidden('BOT_NOT_IN_GUILD');
                    }
                    lastError = `Bot Error: ${res.status}`;
                }
            } else {
                console.warn('DISCORD_BOT_TOKEN missing, cannot use fallback.');
                lastError = 'Bot token missing and User token failed';
            }
        }

        if (!rolesData) {
            return Errors.internal(lastError || 'Failed to fetch roles with both User and Bot tokens.');
        }

        const roles = rolesData;

        // Filter out managed roles (like bot roles) if desired, but for now return all
        // Sort by position (descending) usually
        const simplifiedRoles = roles
            .sort((a: any, b: any) => b.position - a.position)
            .map((r: any) => ({
                id: r.id,
                name: r.name,
                color: r.color,
                managed: r.managed,
            }));

        return NextResponse.json(simplifiedRoles);
    } catch (error) {
        console.error('Handler error:', error);
        return Errors.internal();
    }
}
