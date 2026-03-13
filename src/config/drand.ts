import { z } from 'zod';

/** drand quicknet chain — 3-second period, unchained BLS mode */
export const DRAND_CONFIG = {
    CHAIN_HASH: '52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971',
    GENESIS_TIME: 1692803367,
    PERIOD: 3,
    RELAYS: [
        'https://api.drand.sh',
        'https://drand.cloudflare.com',
        'https://api2.drand.sh',
    ],
} as const;

/** Zod schema for validating drand beacon responses */
export const drandBeaconSchema = z.object({
    round: z.number().int().positive(),
    randomness: z.string().regex(/^[0-9a-f]{64}$/, 'Must be 64-char lowercase hex'),
    signature: z.string().min(1), // kept for future cryptographic verification
});

export type DrandBeacon = z.infer<typeof drandBeaconSchema>;

/**
 * Calculate the first drand round emitted AFTER the given timestamp.
 * Canonical formula: floor((timestamp - genesis) / period) + 2
 * +1 for 1-indexed rounds, +1 to get the NEXT round after timestamp.
 */
export function firstRoundAfter(timestampUnix: number): number {
    return Math.floor((timestampUnix - DRAND_CONFIG.GENESIS_TIME) / DRAND_CONFIG.PERIOD) + 2;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch a specific drand round with relay failover and clock-drift handling.
 * Tries each relay in order, retries on 404 (propagation delay).
 */
export async function fetchDrandRound(targetRound: number): Promise<DrandBeacon> {
    // Check if round should exist yet (handle server clock drift)
    const roundTimestamp = DRAND_CONFIG.GENESIS_TIME + (targetRound - 1) * DRAND_CONFIG.PERIOD;
    const now = Math.floor(Date.now() / 1000);
    if (roundTimestamp > now + 5) {
        const waitSeconds = roundTimestamp - now + 1;
        if (waitSeconds > 30) {
            throw new Error(`drand round ${targetRound} is ${waitSeconds}s in the future — refusing to wait`);
        }
        await sleep(waitSeconds * 1000);
    }

    const path = `/${DRAND_CONFIG.CHAIN_HASH}/public/${targetRound}`;
    const errors: string[] = [];

    for (const relay of DRAND_CONFIG.RELAYS) {
        try {
            const res = await fetch(relay + path, { signal: AbortSignal.timeout(10_000) });

            if (res.status === 404) {
                // Round not yet available — short retry for propagation delay
                await sleep(3000);
                const retry = await fetch(relay + path, { signal: AbortSignal.timeout(10_000) });
                if (!retry.ok) {
                    errors.push(`${relay}: 404 after retry`);
                    continue;
                }
                return drandBeaconSchema.parse(await retry.json());
            }

            if (!res.ok) {
                errors.push(`${relay}: HTTP ${res.status}`);
                continue;
            }

            return drandBeaconSchema.parse(await res.json());
        } catch (err) {
            errors.push(`${relay}: ${err instanceof Error ? err.message : String(err)}`);
            continue;
        }
    }

    throw new Error(`All drand relays failed: ${errors.join('; ')}`);
}

/**
 * Validate drand chain parameters against a relay's /info endpoint.
 * Call once on worker startup. Logs warning if unreachable, throws if mismatched.
 */
export async function validateDrandChainInfo(): Promise<void> {
    const url = `${DRAND_CONFIG.RELAYS[0]}/${DRAND_CONFIG.CHAIN_HASH}/info`;
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        if (!res.ok) {
            console.warn(`[drand] Could not fetch chain info (HTTP ${res.status}), using hardcoded constants`);
            return;
        }
        const info = await res.json();
        if (info.genesis_time !== DRAND_CONFIG.GENESIS_TIME) {
            throw new Error(`drand genesis_time mismatch: expected ${DRAND_CONFIG.GENESIS_TIME}, got ${info.genesis_time}`);
        }
        if (info.period !== DRAND_CONFIG.PERIOD) {
            throw new Error(`drand period mismatch: expected ${DRAND_CONFIG.PERIOD}, got ${info.period}`);
        }
    } catch (err) {
        if (err instanceof Error && err.message.includes('mismatch')) throw err;
        console.warn(`[drand] Chain info validation unreachable: ${err instanceof Error ? err.message : err}`);
    }
}
