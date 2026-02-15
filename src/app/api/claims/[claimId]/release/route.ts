import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Errors, ErrorCodes } from '@/lib/errors';
import { db } from '@/db';
import { claims, dagets, notifications } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * POST /api/claims/:claimId/release — Release slot (creator only).
 */
export async function POST(
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

        // Only creator can release
        const daget = await db.query.dagets.findFirst({
            where: eq(dagets.id, claim.dagetId),
        });
        if (!daget || daget.creatorUserId !== user.id) {
            return Errors.forbidden('Only the Daget creator can release slots');
        }

        // Atomic release: SELECT FOR UPDATE + status check
        const result = await db.transaction(async (tx) => {
            const [lockedClaim] = await tx.execute(sql`
        SELECT status FROM claims WHERE id = ${claimId} FOR UPDATE
      `) as any[];

            if (!lockedClaim || lockedClaim.status !== 'failed_permanent') {
                return { error: true };
            }

            await tx.execute(sql`
        UPDATE claims SET status = 'released', released_at = NOW()
        WHERE id = ${claimId}
      `);

            await tx.execute(sql`
        UPDATE dagets SET claimed_count = claimed_count - 1, updated_at = NOW()
        WHERE id = ${claim.dagetId}
      `);

            // Re-activate if was closed
            await tx.execute(sql`
        UPDATE dagets SET status = 'active'
        WHERE id = ${claim.dagetId} AND status = 'closed'
      `);

            return { success: true };
        });

        if ('error' in result) {
            return Errors.conflict(ErrorCodes.CLAIM_NOT_RETRYABLE,
                'Claim is not in failed_permanent status');
        }

        // Notification
        await db.insert(notifications).values({
            userId: claim.claimantUserId,
            type: 'claim_released',
            title: 'Claim Slot Released',
            body: `The creator released your claim slot for "${daget.name}".`,
            relatedDagetId: daget.id,
            relatedClaimId: claimId,
        });

        return NextResponse.json({
            claim_id: claimId,
            status: 'released',
            message: 'Slot released',
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        console.error('Claim release error:', error);
        return Errors.internal();
    }
}
