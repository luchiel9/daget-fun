import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Errors, ErrorCodes } from '@/lib/errors';
import { db } from '@/db';
import { claims, dagets, claimRetryAudit } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { checkRateLimit, rateLimiters } from '@/lib/rate-limit';
import { headers } from 'next/headers';

/**
 * POST /api/claims/:claimId/retry — Manual retry for failed_permanent claim.
 */
export async function POST(
    _request: Request,
    { params }: { params: Promise<{ claimId: string }> },
) {
    try {
        const user = await requireAuth();
        const { claimId } = await params;

        // Rate limit
        const limit = await checkRateLimit(rateLimiters.retryPerUser, user.id);
        if (!limit.success) return Errors.rateLimited();

        const claim = await db.query.claims.findFirst({
            where: eq(claims.id, claimId),
        });

        if (!claim) return Errors.notFound('Claim');

        // Authorization: claimant can retry their own, creator can retry their daget's claims
        const isClaimant = claim.claimantUserId === user.id;
        let isCreator = false;
        if (!isClaimant) {
            const daget = await db.query.dagets.findFirst({
                where: eq(dagets.id, claim.dagetId),
            });
            isCreator = daget?.creatorUserId === user.id;
        }

        if (!isClaimant && !isCreator) {
            return Errors.forbidden('Not authorized to retry this claim');
        }

        // Atomic update guard: only allow retry from failed_permanent
        const [updated] = await db.update(claims)
            .set({
                status: 'created',
                attemptCount: 0,
                txSignature: null,
                lastError: null,
                nextRetryAt: new Date(), // Schedule immediate processing
                lockedUntil: null,
            })
            .where(and(
                eq(claims.id, claimId),
                eq(claims.status, 'failed_permanent'),
            ))
            .returning();

        if (!updated) {
            // Check if it's a cooldown issue (retried in last 30s)
            if (claim.status === 'failed_permanent') {
                return Errors.conflict(ErrorCodes.RETRY_COOLDOWN, 'Please wait 30 seconds between retries');
            }
            return Errors.conflict(ErrorCodes.CLAIM_NOT_RETRYABLE, `Claim status is "${claim.status}", not "failed_permanent"`);
        }

        // Audit log
        const headerStore = await headers();
        await db.insert(claimRetryAudit).values({
            claimId,
            userId: user.id,
            result: 'retry_accepted',
            ip: headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
            userAgent: headerStore.get('user-agent') || null,
        });

        return NextResponse.json({
            claim_id: claimId,
            status: 'created',
            attempt_count: 0,
            message: 'Retry accepted',
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        console.error('Claim retry error:', error);
        return Errors.internal();
    }
}
