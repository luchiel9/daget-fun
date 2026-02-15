import { acquireJobs, processClaim } from './processor';

const TICK_INTERVAL_MS = 3000; // 3 seconds
let running = false;
let lastTickAt: Date | null = null;
let lastClaimProcessedAt: Date | null = null;

/**
 * Main worker loop — runs as a background process.
 * Picks up pending claims every 3 seconds and processes them.
 */
async function runLoop() {
    console.log('[Worker] Starting background transaction processor...');
    running = true;

    while (running) {
        try {
            lastTickAt = new Date();

            const jobs = await acquireJobs();

            if (jobs.length > 0) {
                console.log(`[Worker] Acquired ${jobs.length} jobs`);

                for (const job of jobs) {
                    try {
                        await processClaim(job);
                        lastClaimProcessedAt = new Date();
                    } catch (error) {
                        console.error(`[Worker] Failed to process claim ${job.id}:`, error);
                    }
                }
            }
        } catch (error) {
            console.error('[Worker] Loop error:', error);
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
    console.log('[Worker] SIGTERM received, shutting down...');
    running = false;
});

process.on('SIGINT', () => {
    console.log('[Worker] SIGINT received, shutting down...');
    running = false;
});

// Start the worker
runLoop().catch((error) => {
    console.error('[Worker] Fatal error:', error);
    process.exit(1);
});
