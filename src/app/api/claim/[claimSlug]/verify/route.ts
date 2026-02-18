import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, getDiscordAccessToken } from '@/lib/auth';
import { Errors } from '@/lib/errors';
import { db } from '@/db';
import { dagets, dagetRequirements, claims } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyDiscordRoles } from '@/lib/discord-verify';

/**
 * GET /api/claim/:claimSlug/verify — Check if the current user meets the role requirements.
 * Returns { eligible: boolean, error?: string }
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ claimSlug: string }> },
) {
    try {
        const user = await requireAuth();
        const { claimSlug } = await params;

        const daget = await db.query.dagets.findFirst({
            where: eq(dagets.claimSlug, claimSlug),
        });

        if (!daget) return Errors.notFound('Daget');

        // Creators cannot claim their own Daget
        if (daget.creatorUserId === user.id) {
            return NextResponse.json({
                eligible: false,
                isCreator: true,
                error: 'You cannot claim a Daget you created.',
            });
        }

        // Check if user has already claimed
        const existingClaim = await db.query.claims.findFirst({
            where: and(
                eq(claims.dagetId, daget.id),
                eq(claims.claimantUserId, user.id)
            ),
        });

        if (existingClaim) {
            return NextResponse.json({
                eligible: false,
                claimed: true,
                error: 'You have already claimed this Daget.',
            });
        }

        // Get requirements
        const requirements = await db.query.dagetRequirements.findMany({
            where: eq(dagetRequirements.dagetId, daget.id),
        });

        // If no requirements, user is eligible
        if (requirements.length === 0) {
            return NextResponse.json({ eligible: true });
        }

        // Get user's Discord token
        const accessToken = await getDiscordAccessToken();
        if (!accessToken) {
            return NextResponse.json({
                eligible: false,
                error: 'Discord session expired. Please log in again.',
            });
        }

        const guildId = requirements[0].discordGuildId;
        const requiredRoleIds = requirements.map((r) => r.discordRoleId);

        const result = await verifyDiscordRoles(accessToken, guildId, requiredRoleIds);

        return NextResponse.json({
            eligible: result.eligible,
            inGuild: result.inGuild,
            userRoles: result.userRoles,
            error: result.error,
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        console.error('Verify eligibility error:', error);
        return Errors.internal();
    }
}
