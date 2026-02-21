import { db } from '@/db';
import { claims, dagets } from '@/db/schema';
import { eq, and, sql, lt } from 'drizzle-orm';
import { getSolanaConnection } from '@/lib/solana';

const SUBMITTED_TIMEOUT_SECONDS = 90;

/**
 * Reconciliation job — runs every 10 minutes.
 * 1. Find claims in 'submitted' older than timeout and re-check on-chain.
 * 2. Verify DB 'confirmed' claims still exist on-chain.
 * 3. Fix drift by transitioning statuses.
 * Idempotent: does not re-sign/re-send transactions.
 */
export async function runReconciliation() {
    console.log('[Reconciliation] Starting reconciliation run...');
    const connection = getSolanaConnection();

    // 1. Check stale submitted claims
    const staleSubmitted = await db.execute(sql`
    SELECT id, tx_signature, submitted_at, attempt_count
    FROM claims
    WHERE status = 'submitted'
    AND submitted_at < now() - make_interval(secs => ${SUBMITTED_TIMEOUT_SECONDS})
    LIMIT 20
  `) as any[];

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
                    await db.execute(sql`
            UPDATE claims SET
              status = 'confirmed',
              confirmed_at = now(),
              locked_until = NULL
            WHERE id = ${claim.id} AND status = 'submitted'
          `);
                }
            } else {
                // Not yet finalized — check if expired
                if (claim.attempt_count >= 5) {
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
            console.error(`[Reconciliation] Error checking claim ${claim.id}:`, error);
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
  `) as any[];

    for (const claim of recentConfirmed) {
        try {
            const status = await connection.getSignatureStatus(claim.tx_signature);
            if (!status.value || status.value.err) {
                console.warn(`[Reconciliation] Confirmed claim ${claim.id} may have issues on-chain`);
                // Log but don't auto-transition confirmed claims
            }
        } catch {
            // Ignore — network issues
        }
    }

    console.log(`[Reconciliation] Done. Checked ${staleSubmitted.length} stale, ${recentConfirmed.length} confirmed.`);
}
