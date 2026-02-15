import { NextResponse } from 'next/server';
import { requireAuth, getDiscordAccessToken } from '@/lib/auth';
import { Errors } from '@/lib/errors';

export async function GET() {
    try {
        // Ensure user is authenticated
        await requireAuth();

        // Get Discord access token from session
        const accessToken = await getDiscordAccessToken();
        if (!accessToken) {
            return Errors.validation('Discord account not connected or session expired. Please sign in again.');
        }

        // Fetch guilds from Discord
        const res = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!res.ok) {
            const error = await res.json();
            console.error('Discord API Error (Guilds):', error);
            if (res.status === 401) {
                return Errors.unauthorized('Discord session expired');
            }
            return Errors.internal('Failed to fetch Discord servers');
        }

        const guilds = await res.json();

        // Return simplified guild structure
        const simplifiedGuilds = guilds.map((g: any) => ({
            id: g.id,
            name: g.name,
            icon: g.icon,
            permissions: g.permissions,
        }));

        return NextResponse.json(simplifiedGuilds);
    } catch (error) {
        console.error('Handler error:', error);
        return Errors.internal();
    }
}
