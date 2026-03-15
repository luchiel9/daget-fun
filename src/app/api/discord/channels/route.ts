import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Errors } from '@/lib/errors';
import { getPostableChannels } from '@/lib/discord-bot';
import { checkRateLimit, rateLimiters } from '@/lib/rate-limit';
import { z } from 'zod';

const querySchema = z.object({
    guild_id: z.string().regex(/^\d{17,20}$/, 'Invalid guild ID'),
});

/**
 * GET /api/discord/channels?guild_id={id}
 * Returns text channels where the bot can post embeds.
 * Rate-limited to prevent Discord API quota exhaustion.
 */
export async function GET(request: NextRequest) {
    try {
        const user = await requireAuth();

        // Rate limit — each call triggers ~3 Discord API requests
        const limit = await checkRateLimit(rateLimiters.discordApiPerUser, user.id);
        if (!limit.success) return Errors.rateLimited();

        const { searchParams } = new URL(request.url);
        const parsed = querySchema.safeParse({
            guild_id: searchParams.get('guild_id'),
        });

        if (!parsed.success) {
            return Errors.validation('Invalid guild_id parameter');
        }

        // Authorization: verify user has access to this guild via their OAuth guilds
        const guildsRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/discord/guilds`, {
            headers: { cookie: request.headers.get('cookie') || '' },
        });
        if (guildsRes.ok) {
            const guilds = await guildsRes.json();
            const hasAccess = guilds.some((g: { id: string }) => g.id === parsed.data.guild_id);
            if (!hasAccess) {
                return Errors.forbidden('You do not have access to this guild');
            }
        }

        const channels = await getPostableChannels(parsed.data.guild_id);

        return NextResponse.json({ channels });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        console.error('Discord channels error:', error);
        return Errors.internal();
    }
}
