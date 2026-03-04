import { db } from '@/db';
import { claims, dagets, wallets, notifications, users } from '@/db/schema';
import { eq, and, sql, lte, or, isNull } from 'drizzle-orm';
import { Keypair, PublicKey, Connection } from '@solana/web3.js';
import { getSolanaConnection, buildClaimTransaction } from '@/lib/solana';
import { NATIVE_SOL_MINT } from '@/lib/tokens';
import { decryptPrivateKey, zeroize } from '@/lib/crypto';
import bs58 from 'bs58';
import { WORKER_CONFIG } from '@/config/worker';
import { logger } from '@/lib/logger';
import { publishClaimStatus } from '@/lib/claim-events';
import type { ClaimRow } from './types';

const log = logger.child({ component: 'processor' });
const { SUBMITTED_TIMEOUT_SECONDS, BACKOFF_SCHEDULE, MAX_ATTEMPTS, JOB_BATCH_SIZE } = WORKER_CONFIG;

/** Thrown to signal the worker loop that the Solana RPC is unhealthy. */
export class RpcError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RpcError';
    }
}

const RPC_ERROR_PATTERNS = [
    'fetch failed', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT',
    '429', 'Too Many Requests', 'Internal Server Error',
    'getaddrinfo', 'socket hang up',
];

/**
 * Acquire pending claims using FOR UPDATE SKIP LOCKED lease pattern.
 * Returns up to 5 claims locked for 30 seconds.
 */
export async function acquireJobs() {
    const result = await db.execute(sql`
    WITH candidate AS (
      SELECT id
      FROM claims
      WHERE status IN ('created', 'failed_retryable', 'submitted')
        AND (next_retry_at IS NULL OR next_retry_at <= now())
        AND (locked_until IS NULL OR locked_until < now())
      ORDER BY created_at ASC
      LIMIT ${JOB_BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE claims c
    SET locked_until = now() + interval '30 seconds'
    FROM candidate
    WHERE c.id = candidate.id
    RETURNING c.*
  `);

    const rows = result as unknown as ClaimRow[];

    // Validate critical fields to guard against schema drift in raw SQL casts
    return rows.filter((row) => {
        if (!row.id || !row.daget_id || !row.status || !row.receiving_address) {
            log.error({ row }, 'acquireJobs: row missing critical fields, skipping');
            return false;
        }
        return true;
    });
}

/**
 * Process a single claim.
 */
export async function processClaim(claim: ClaimRow) {
    const connection = getSolanaConnection();

    try {
        if (claim.status === 'submitted') {
            // Polling-only recovery flow — never re-sign/re-send
            await pollSubmittedClaim(claim, connection);
            return;
        }

        // created or failed_retryable → build/sign/send
        await buildAndSendClaim(claim, connection);
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        log.error({ claimId: claim.id, err: errorMsg }, 'Claim error');

        const isUnrecoverable = isUnrecoverableError(errorMsg);

        if (isUnrecoverable || claim.attempt_count >= MAX_ATTEMPTS) {
            await setFailedPermanent(claim, errorMsg);
        } else {
            await setFailedRetryable(claim, errorMsg);
        }

        // Re-throw RPC errors so the worker loop can trip the circuit breaker
        if (RPC_ERROR_PATTERNS.some((p) => errorMsg.includes(p))) {
            throw new RpcError(errorMsg);
        }
    } finally {
        // Always clear lock
        await db.execute(sql`
      UPDATE claims SET locked_until = NULL WHERE id = ${claim.id}
    `);
    }
}

async function buildAndSendClaim(claim: ClaimRow, connection: Connection) {
    // Load Daget + wallet
    const daget = await db.query.dagets.findFirst({
        where: eq(dagets.id, claim.daget_id),
    });
    if (!daget) throw new Error('Daget not found');

    const wallet = await db.query.wallets.findFirst({
        where: eq(wallets.id, daget.creatorWalletId),
    });
    if (!wallet || !wallet.encryptedPrivateKey) throw new Error('Wallet key not available');

    // Decrypt private key (Decrypt-Use-Zeroize pattern)
    let secretKey: Uint8Array | null = null;
    try {
        secretKey = await decryptPrivateKey(
            wallet.encryptedPrivateKey,
            wallet.encryptionVersion,
        );

        const creatorKeypair = Keypair.fromSecretKey(secretKey);
        const rawAddress = claim.receiving_address.trim();
        if (!rawAddress) {
            throw new Error(`Empty receiving address in claim ${claim.id}`);
        }
        const claimantAddress = new PublicKey(rawAddress);
        if (claim.amount_base_units == null) {
            throw new Error(`Claim ${claim.id} has no amount_base_units`);
        }
        const isNativeSol = daget.tokenMint === NATIVE_SOL_MINT;
        // For native SOL we don't use mint; pass a dummy PublicKey for the SPL path (unused when isNativeSol)
        const mintAddress = isNativeSol
            ? new PublicKey('11111111111111111111111111111111')
            : new PublicKey(daget.tokenMint);

        // Build transaction
        const tx = await buildClaimTransaction({
            creatorKeypair,
            claimantAddress,
            mintAddress,
            tokenDecimals: daget.tokenDecimals,
            amountBaseUnits: claim.amount_base_units,
            connection,
            isNativeSol,
        });

        // Sign (signature is now deterministic)
        tx.sign(creatorKeypair);
        const txSignature = bs58.encode(tx.signature!);

        // Step 10: Write tx_signature to DB BEFORE sending (exactly-once guard)
        await db.execute(sql`
      UPDATE claims SET
        tx_signature = ${txSignature},
        status = 'submitted',
        submitted_at = now(),
        attempt_count = attempt_count + 1,
        locked_until = NULL
      WHERE id = ${claim.id}
    `);

        publishClaimStatus({ claimId: claim.id, status: 'submitted', txSignature });

        // Step 11: Send the transaction
        const rawTx = tx.serialize();
        await connection.sendRawTransaction(rawTx, {
            skipPreflight: false,
            preflightCommitment: 'finalized',
        });

        // Step 12: Poll for finalized confirmation
        const confirmation = await connection.confirmTransaction(
            {
                signature: txSignature,
                blockhash: tx.recentBlockhash!,
                lastValidBlockHeight: tx.lastValidBlockHeight!,
            },
            'finalized',
        );

        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        // Success!
        await confirmClaim(claim);
    } finally {
        if (secretKey) zeroize(secretKey);
    }
}

/**
 * Shared confirm logic: update DB status, send notification, publish SSE event.
 * Called from buildAndSendClaim, pollSubmittedClaim, and reconciliation.
 *
 * Accepts either a full ClaimRow (from worker) or just { id } (from reconciliation),
 * and looks up whatever is needed from the DB.
 */
export async function confirmClaim(claimOrId: ClaimRow | { id: string }) {
    const claimId = claimOrId.id;

    await db.execute(sql`
    UPDATE claims SET
      status = 'confirmed',
      confirmed_at = now(),
      locked_until = NULL,
      last_error = NULL
    WHERE id = ${claimId}
  `);

    // Look up the full claim row for notification details
    const fullClaim = await db.query.claims.findFirst({
        where: eq(claims.id, claimId),
    });
    if (!fullClaim) {
        log.warn({ claimId }, 'confirmClaim: claim not found after update');
        return;
    }

    const daget = await db.query.dagets.findFirst({
        where: eq(dagets.id, fullClaim.dagetId),
    });
    if (daget) {
        const claimantUser = await db.query.users.findFirst({
            where: eq(users.id, fullClaim.claimantUserId),
        });
        const discordName = claimantUser?.discordUsername || 'Unknown User';
        const amount = (Number(fullClaim.amountBaseUnits) || 0) / Math.pow(10, daget.tokenDecimals);

        await db.insert(notifications).values({
            userId: daget.creatorUserId,
            type: 'claim_confirmed',
            title: 'Claim Confirmed',
            body: `**${discordName}** claimed **${amount} ${daget.tokenSymbol}**.`,
            relatedDagetId: daget.id,
            relatedClaimId: claimId,
        });
    }

    log.info({ claimId, txSignature: fullClaim.txSignature }, 'Claim confirmed');
    publishClaimStatus({ claimId, status: 'confirmed', txSignature: fullClaim.txSignature });
}

async function pollSubmittedClaim(claim: ClaimRow, connection: Connection) {
    if (!claim.tx_signature) {
        // No signature — shouldn't be submitted, reset to failed_retryable
        await setFailedRetryable(claim, 'submitted_without_signature');
        return;
    }

    // Check if submitted for too long
    const submittedAt = new Date(claim.submitted_at!);
    const elapsed = (Date.now() - submittedAt.getTime()) / 1000;

    if (elapsed > SUBMITTED_TIMEOUT_SECONDS) {
        // Timeout — check one more time on-chain
        try {
            const status = await connection.getSignatureStatus(claim.tx_signature);
            if (status.value?.confirmationStatus === 'finalized') {
                if (status.value.err) {
                    await setFailedRetryable(claim, `tx_error: ${JSON.stringify(status.value.err)}`);
                } else {
                    await confirmClaim(claim);
                }
                return;
            }
        } catch { /* ignore */ }

        // Not confirmed within timeout
        if (claim.attempt_count >= MAX_ATTEMPTS) {
            await setFailedPermanent(claim, 'submitted_timeout');
        } else {
            await setFailedRetryable(claim, 'submitted_timeout');
        }
        return;
    }

    // Still within timeout — poll
    try {
        const status = await connection.getSignatureStatus(claim.tx_signature);
        if (status.value?.confirmationStatus === 'finalized') {
            if (status.value.err) {
                await setFailedRetryable(claim, `tx_error: ${JSON.stringify(status.value.err)}`);
            } else {
                await confirmClaim(claim);
            }
        }
        // else: still pending — will be picked up next tick
    } catch {
        // Network error during poll — will retry next tick
    }
}

async function setFailedRetryable(claim: ClaimRow, error: string) {
    const attempt = (claim.attempt_count || 0);
    const backoffSeconds = BACKOFF_SCHEDULE[Math.min(attempt, BACKOFF_SCHEDULE.length - 1)];
    const jitter = Math.floor(backoffSeconds * 0.2 * Math.random());
    const nextRetryAt = new Date(Date.now() + (backoffSeconds + jitter) * 1000);

    await db.execute(sql`
    UPDATE claims SET
      status = 'failed_retryable',
      last_error = ${error},
      attempt_count = attempt_count + 1,
      next_retry_at = ${nextRetryAt.toISOString()}::timestamptz,
      locked_until = NULL,
      failed_at = now()
    WHERE id = ${claim.id}
  `);
    publishClaimStatus({ claimId: claim.id, status: 'failed_retryable', lastError: error });
}

async function setFailedPermanent(claim: ClaimRow, error: string) {
    await db.execute(sql`
    UPDATE claims SET
      status = 'failed_permanent',
      last_error = ${error},
      locked_until = NULL,
      failed_at = now()
    WHERE id = ${claim.id}
  `);
    publishClaimStatus({ claimId: claim.id, status: 'failed_permanent', lastError: error });

    // Notification
    const daget = await db.query.dagets.findFirst({
        where: eq(dagets.id, claim.daget_id),
    });
    if (daget) {
        await db.insert(notifications).values({
            userId: daget.creatorUserId,
            type: 'claim_failed',
            title: 'Claim Failed',
            body: `A claim for "${daget.name}" permanently failed. You can retry or release the slot.`,
            relatedDagetId: daget.id,
            relatedClaimId: claim.id,
        });
    }
}

function isUnrecoverableError(error: string): boolean {
    const unrecoverable = [
        'invalid account',
        'program error',
        'InvalidAccountData',
        'AccountNotFound',
        'custom program error',
        // Note: InsufficientFunds is intentionally retryable — creator can top up between retries
    ];
    return unrecoverable.some(pattern => error.toLowerCase().includes(pattern.toLowerCase()));
}
