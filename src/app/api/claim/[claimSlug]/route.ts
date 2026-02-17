import { NextResponse } from 'next/server';
import { Errors } from '@/lib/errors';
import { db } from '@/db';
import { dagets, dagetRequirements } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/claim/:claimSlug — Public Daget data for claim page.
 * No auth required.
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ claimSlug: string }> },
) {
    try {
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

        return NextResponse.json({
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
                role_name: r.discordRoleNameSnapshot || r.discordRoleId, // Fallback to ID if no name
                role_color: r.discordRoleColor,
            })),
            requirements_summary: requirementsSummary || 'No specific roles required',
        });
    } catch (error) {
        console.error('Public daget error:', error);
        return Errors.internal();
    }
}
