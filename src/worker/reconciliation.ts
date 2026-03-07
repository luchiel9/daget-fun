import { db } from '@/db';
import { claims, dagets, notifications } from '@/db/schema';
import { eq, and, sql, lt } from 'drizzle-orm';
import { getSolanaConnection } from '@/lib/solana';
import { WORKER_CONFIG } from '@/config/worker';
import { logger } from '@/lib/logger';
import { getRedis, isRedisReady } from '@/lib/redis';
import { confirmClaim } from './processor';
import type { StaleSubmittedRow, ConfirmedClaimRow } from './types';

const log = logger.child({ component: 'reconciliation' });
const { SUBMITTED_TIMEOUT_SECONDS, MAX_ATTEMPTS } = WORKER_CONFIG;

/**
 * Reconciliation job — runs every 10 minutes.
 * 1. Find claims in 'submitted' older than timeout and re-check on-chain.
 * 2. Verify DB 'confirmed' claims still exist on-chain.
 * 3. Fix drift by transitioning statuses.
 * Idempotent: does not re-sign/re-send transactions.
 */
export async function runReconciliation() {
    log.info('Starting reconciliation run...');
    const connection = getSolanaConnection();

    // 1. Check stale submitted claims
    const staleSubmitted = await db.execute(sql`
    SELECT id, tx_signature, submitted_at, attempt_count
    FROM claims
    WHERE status = 'submitted'
    AND submitted_at < now() - make_interval(secs => ${SUBMITTED_TIMEOUT_SECONDS})
    LIMIT 20
  `) as unknown as StaleSubmittedRow[];

    for (const claim of staleSubmitted) {
        try {
            if (!claim.tx_signature) {
                // No signature — reset to failed_retryable
                await db.execute(sql`
          UPDATE claims SET
            status = 'failed_retryable',
            last_error = 'reconciliation: submitted_without_signature',
            locked_until = NULL
          WHERE id = ${claim.id} AND status = 'submitted'
        `);
                continue;
            }

            // Check on-chain status
            const status = await connection.getSignatureStatus(claim.tx_signature);

            if (status.value?.confirmationStatus === 'finalized') {
                if (status.value.err) {
                    await db.execute(sql`
            UPDATE claims SET
              status = 'failed_retryable',
              last_error = ${'reconciliation: tx_error'},
              locked_until = NULL
            WHERE id = ${claim.id} AND status = 'submitted'
          `);
                } else {
                    await confirmClaim({ id: claim.id });
                }
            } else {
                // Not yet finalized — check if expired
                if (claim.attempt_count >= MAX_ATTEMPTS) {
                    await db.execute(sql`
            UPDATE claims SET
              status = 'failed_permanent',
              last_error = 'reconciliation: submitted_timeout_max_attempts',
              locked_until = NULL,
              failed_at = now()
            WHERE id = ${claim.id} AND status = 'submitted'
          `);
                } else {
                    await db.execute(sql`
            UPDATE claims SET
              status = 'failed_retryable',
              last_error = 'reconciliation: submitted_timeout',
              attempt_count = attempt_count + 1,
              locked_until = NULL
            WHERE id = ${claim.id} AND status = 'submitted'
          `);
                }
            }
        } catch (error) {
            log.error({ claimId: claim.id, err: error }, 'Error checking stale claim');
        }
    }

    // 2. Verify confirmed claims (sample check)
    const recentConfirmed = await db.execute(sql`
    SELECT id, tx_signature
    FROM claims
    WHERE status = 'confirmed'
    AND confirmed_at > now() - interval '1 hour'
    AND tx_signature IS NOT NULL
    LIMIT 10
  `) as unknown as ConfirmedClaimRow[];

    for (const claim of recentConfirmed) {
        try {
            const status = await connection.getSignatureStatus(claim.tx_signature);
            if (!status.value || status.value.err) {
                log.warn({ claimId: claim.id }, 'Confirmed claim may have issues on-chain');
                await trackReconciliationFailure(claim.id);
            } else {
                // Reset counter on success
                await resetReconciliationFailure(claim.id);
            }
        } catch {
            // Network issues — don't count as reconciliation failure
        }
    }

    log.info({ staleCount: staleSubmitted.length, confirmedCount: recentConfirmed.length }, 'Reconciliation complete');
}

const RECONCILIATION_FAIL_THRESHOLD = 3;
const RECONCILIATION_COUNTER_TTL = 86400; // 24h

async function trackReconciliationFailure(claimId: string): Promise<void> {
    if (!isRedisReady()) return;
    try {
        const key = `reconciliation:fail:${claimId}`;
        const count = await getRedis().incr(key);
        await getRedis().expire(key, RECONCILIATION_COUNTER_TTL);

        if (count === RECONCILIATION_FAIL_THRESHOLD) {
            log.error({ claimId, failCount: count }, 'Reconciliation failure threshold reached');
            await createReconciliationAlert(claimId);
        }
    } catch (err) {
        log.error({ claimId, err }, 'Failed to track reconciliation failure');
    }
}

async function resetReconciliationFailure(claimId: string): Promise<void> {
    if (!isRedisReady()) return;
    try {
        await getRedis().del(`reconciliation:fail:${claimId}`);
    } catch { /* ignore */ }
}

async function createReconciliationAlert(claimId: string): Promise<void> {
    try {
        // Look up claim → daget → creator
        const claim = await db.query.claims.findFirst({
            where: eq(claims.id, claimId),
        });
        if (!claim) return;

        const daget = await db.query.dagets.findFirst({
            where: eq(dagets.id, claim.dagetId),
        });
        if (!daget) return;

        // Spam guard: check if a reconciliation alert already exists for this claim
        const existing = await db.execute(sql`
            SELECT 1 FROM notifications
            WHERE related_claim_id = ${claimId}
            AND type = 'claim_failed'
            AND title = 'Reconciliation Alert'
            LIMIT 1
        `);
        if ((existing as unknown[]).length > 0) return;

        await db.insert(notifications).values({
            userId: daget.creatorUserId,
            type: 'claim_failed',
            title: 'Reconciliation Alert',
            body: `Claim for "${daget.name}" shows on-chain issues after ${RECONCILIATION_FAIL_THRESHOLD} consecutive checks. Please verify transaction manually.`,
            relatedDagetId: daget.id,
            relatedClaimId: claimId,
        });
    } catch (err) {
        log.error({ claimId, err }, 'Failed to create reconciliation alert');
    }
}
