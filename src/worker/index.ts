import { acquireJobs, processClaim, RpcError } from './processor';
import { WORKER_CONFIG } from '@/config/worker';
import { logger } from '@/lib/logger';
import { CircuitBreaker } from '@/lib/circuit-breaker';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

const log = logger.child({ component: 'worker' });
const { TICK_INTERVAL_MS, CONCURRENCY } = WORKER_CONFIG;
const rpcCircuit = new CircuitBreaker({ name: 'solana-rpc', failureThreshold: 3, resetTimeoutMs: 30_000 });

let running = false;
let lastTickAt: Date | null = null;
let lastClaimProcessedAt: Date | null = null;

/**
 * Main worker loop — runs as a background process.
 * Picks up pending claims every 3 seconds and processes them.
 */
async function clearStaleLocks() {
    const result = await db.execute(sql`
    UPDATE claims
    SET locked_until = NULL
    WHERE locked_until IS NOT NULL AND locked_until < now()
  `);
    const count = (result as unknown as { rowCount?: number }).rowCount ?? 0;
    if (count > 0) {
        log.info({ count }, 'Cleared stale locks from previous run');
    }
}

async function runLoop() {
    log.info('Starting background transaction processor...');
    await clearStaleLocks();
    running = true;

    while (running) {
        try {
            lastTickAt = new Date();

            // Skip acquiring jobs when Solana RPC is down
            if (rpcCircuit.isOpen) {
                log.warn('Solana RPC circuit breaker open, skipping tick');
                await sleep(TICK_INTERVAL_MS);
                continue;
            }

            const jobs = await acquireJobs();

            if (jobs.length > 0) {
                log.info({ jobCount: jobs.length, concurrency: CONCURRENCY }, 'Acquired jobs');

                for (let i = 0; i < jobs.length; i += CONCURRENCY) {
                    const batch = jobs.slice(i, i + CONCURRENCY);
                    const results = await Promise.allSettled(
                        batch.map((job) => processClaim(job)),
                    );
                    for (const r of results) {
                        if (r.status === 'fulfilled') {
                            lastClaimProcessedAt = new Date();
                            rpcCircuit.recordSuccess();
                        } else {
                            log.error({ err: r.reason }, 'Claim processing failed');
                            // processClaim re-throws RpcError for RPC-related failures
                            if (r.reason instanceof RpcError) {
                                rpcCircuit.recordFailure();
                            }
                        }
                    }
                }
            }
        } catch (error) {
            log.error({ err: error }, 'Loop error');
        }

        // Wait before next tick
        await sleep(TICK_INTERVAL_MS);
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    log.info('SIGTERM received, shutting down...');
    running = false;
});

process.on('SIGINT', () => {
    log.info('SIGINT received, shutting down...');
    running = false;
});

// Start the worker
runLoop().catch((error) => {
    log.fatal({ err: error }, 'Fatal error');
    process.exit(1);
});
