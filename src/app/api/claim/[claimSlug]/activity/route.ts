import { NextResponse, type NextRequest } from 'next/server';
import { Errors } from '@/lib/errors';
import { db } from '@/db';
import { dagets, claims } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { checkRateLimit, rateLimiters, getClientIp } from '@/lib/rate-limit';
import { paginationSchema } from '@/lib/validation';

/**
 * GET /api/claim/[claimSlug]/activity — Public endpoint for live activity feed.
 * Returns recent claims for a daget (no auth required).
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ claimSlug: string }> },
) {
    try {
        // Rate limit by IP — public endpoint
        const ip = getClientIp(request);
        const limit = await checkRateLimit(rateLimiters.publicClaimPerIp, ip);
        if (!limit.success) return Errors.rateLimited();

        const { claimSlug } = await params;

        const { searchParams } = new URL(request.url);
        const parsed = paginationSchema.safeParse({
            limit: searchParams.get('limit') || 10,
        });
        const pageLimit = parsed.success ? parsed.data.limit : 10;

        // Find Daget by slug
        const daget = await db.query.dagets.findFirst({
            where: eq(dagets.claimSlug, claimSlug),
        });

        if (!daget) return Errors.notFound('Daget');

        const recentClaims = await db.query.claims.findMany({
            where: eq(claims.dagetId, daget.id),
            orderBy: [desc(claims.createdAt)],
            limit: pageLimit,
            with: {
                claimant: {
                    columns: {
                        discordUsername: true,
                        discordAvatarUrl: true,
                    }
                }
            }
        });

        return NextResponse.json({
            claims: recentClaims.map((c) => ({
                status: c.status,
                amount_base_units: c.amountBaseUnits,
                created_at: c.createdAt.toISOString(),
                claimant: {
                    discord_username: c.claimant.discordUsername,
                    discord_avatar_url: c.claimant.discordAvatarUrl,
                }
            })),
        });
    } catch (error: unknown) {
        console.error('Activity feed error:', error);
        return Errors.internal();
    }
}
