import { NextResponse, type NextRequest } from 'next/server';
import { Errors } from '@/lib/errors';
import { db } from '@/db';
import { dagets, claims } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * GET /api/claim/[claimSlug]/activity — Public endpoint for live activity feed.
 * Returns recent claims for a daget (no auth required).
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ claimSlug: string }> },
) {
    try {
        const { claimSlug } = await params;

        // Find Daget by slug
        const daget = await db.query.dagets.findFirst({
            where: eq(dagets.claimSlug, claimSlug),
        });

        if (!daget) return Errors.notFound('Daget');

        // Get recent claims (limit to 10)
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // Max 50

        const recentClaims = await db.query.claims.findMany({
            where: eq(claims.dagetId, daget.id),
            orderBy: [desc(claims.createdAt)],
            limit,
        });

        return NextResponse.json({
            claims: recentClaims.map((c) => ({
                claim_id: c.id,
                status: c.status,
                amount_base_units: c.amountBaseUnits,
                tx_signature: c.txSignature,
                created_at: c.createdAt.toISOString(),
            })),
        });
    } catch (error: unknown) {
        console.error('Activity feed error:', error);
        return Errors.internal();
    }
}
