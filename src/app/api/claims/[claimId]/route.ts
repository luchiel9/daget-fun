import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Errors } from '@/lib/errors';
import { db } from '@/db';
import { claims, dagets } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/claims/:claimId — Poll claim status.
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ claimId: string }> },
) {
    try {
        const user = await requireAuth();
        const { claimId } = await params;

        const claim = await db.query.claims.findFirst({
            where: eq(claims.id, claimId),
        });

        if (!claim) return Errors.notFound('Claim');

        // Check access: claimant or daget creator
        if (claim.claimantUserId !== user.id) {
            const daget = await db.query.dagets.findFirst({
                where: eq(dagets.id, claim.dagetId),
            });
            if (!daget || daget.creatorUserId !== user.id) {
                return Errors.forbidden('Not authorized to view this claim');
            }
        }

        return NextResponse.json({
            claim_id: claim.id,
            status: claim.status,
            amount_base_units: claim.amountBaseUnits,
            tx_signature: claim.txSignature,
            attempt_count: claim.attemptCount,
            last_error: claim.lastError,
            updated_at: (claim.confirmedAt || claim.failedAt || claim.submittedAt || claim.createdAt).toISOString(),
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        console.error('Claim status error:', error);
        return Errors.internal();
    }
}
