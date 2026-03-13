import { NextResponse } from 'next/server';
import { Errors } from '@/lib/errors';
import { db } from '@/db';
import { dagets, dagetRequirements } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { checkRateLimit, rateLimiters, getClientIp } from '@/lib/rate-limit';

/**
 * GET /api/claim/:claimSlug — Public Daget data for claim page.
 * No auth required.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ claimSlug: string }> },
) {
    try {
        const ip = getClientIp(request);
        const limit = await checkRateLimit(rateLimiters.publicClaimPerIp, ip);
        if (!limit.success) return Errors.rateLimited();

        const { claimSlug } = await params;

        const daget = await db.query.dagets.findFirst({
            where: eq(dagets.claimSlug, claimSlug),
            with: {
                creator: true,
            }
        });

        if (!daget) return Errors.notFound('Daget');

        // Get requirements for summary
        const requirements = await db.query.dagetRequirements.findMany({
            where: eq(dagetRequirements.dagetId, daget.id),
        });

        const requirementsSummary = requirements
            .map((r) => r.discordRoleNameSnapshot || r.discordRoleId)
            .join(' or ');

        const responseData: Record<string, unknown> = {
            id: daget.id,
            name: daget.name,
            message_html: daget.messageHtml,
            status: daget.status,
            token_symbol: daget.tokenSymbol,
            token_decimals: daget.tokenDecimals,
            token_mint: daget.tokenMint,
            total_winners: daget.totalWinners,
            claimed_count: daget.claimedCount,
            daget_type: daget.dagetType,
            discord_guild_name: daget.discordGuildName,
            discord_guild_icon: daget.discordGuildIcon,
            discord_guild_id: requirements[0]?.discordGuildId,
            author_discord_id: daget.creator.discordUserId,
            author_discord_username: daget.creator.discordUsername,
            author_discord_avatar_url: daget.creator.discordAvatarUrl,
            requirements: requirements.map(r => ({
                role_id: r.discordRoleId,
                role_name: r.discordRoleNameSnapshot || r.discordRoleId,
                role_color: r.discordRoleColor,
            })),
            requirements_summary: requirementsSummary || 'No specific roles required',
        };

        // Raffle-specific fields
        if (daget.dagetType === 'raffle') {
            responseData.raffle_ends_at = daget.raffleEndsAt?.toISOString() ?? null;
            responseData.raffle_drawn_at = daget.raffleDrawnAt?.toISOString() ?? null;
            responseData.total_amount_base_units = daget.totalAmountBaseUnits;
            // Only expose draw proof after draw is complete
            if (daget.status === 'closed' && daget.drandRound) {
                responseData.drand_round = daget.drandRound.toString();
                responseData.drand_randomness = daget.drandRandomness;
            }
        }

        return NextResponse.json(responseData);
    } catch (error) {
        console.error('Public daget error:', error);
        return Errors.internal();
    }
}
