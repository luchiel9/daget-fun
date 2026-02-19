import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limiters per endpoint, per blueprint §4.6.
 */

// Lazy initialization to avoid errors when env vars are not set
let redis: Redis | null = null;

function getRedis(): Redis {
    if (!redis) {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL!,
            token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        });
    }
    return redis;
}

function createLimiter(
    tokens: number,
    window: `${number} ${'s' | 'm' | 'h' | 'd'}`,
    prefix: string,
) {
    return new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(tokens, window),
        prefix: `ratelimit:${prefix}`,
        analytics: false,
    });
}

export const rateLimiters = {
    /** POST /api/claims: 3/min/user */
    claimsPerUser: () => createLimiter(3, '1 m', 'claims:user'),
    /** POST /api/claims: 10/min/ip */
    claimsPerIp: () => createLimiter(10, '1 m', 'claims:ip'),
    /** POST /api/dagets: 10/hour/user */
    dagetsPerUser: () => createLimiter(10, '1 h', 'dagets:user'),
    /** POST /api/wallet/generate: 3/day/user */
    walletGenPerUser: () => createLimiter(3, '1 d', 'wallet-gen:user'),
    /** POST /api/export-key/request: 3/day/user */
    exportReqPerUser: () => createLimiter(3, '1 d', 'export-req:user'),
    /** POST /api/export-key/download: 10/hour/user */
    exportDlPerUser: () => createLimiter(10, '1 h', 'export-dl:user'),
    /** POST /api/export-key/download: 30/day/user */
    exportDlPerUserDaily: () => createLimiter(30, '1 d', 'export-dl-daily:user'),
    /** POST /api/export-key/download: 60/day/ip */
    exportDlPerIp: () => createLimiter(60, '1 d', 'export-dl:ip'),
    /** POST /api/claims/:claimId/retry: 5/hour/user */
    retryPerUser: () => createLimiter(5, '1 h', 'retry:user'),
    /** POST /api/claims/:claimId/retry: 20/hour/ip */
    retryPerIp: () => createLimiter(20, '1 h', 'retry:ip'),
    /** POST /api/validate-address: 60/min/ip — prevents RPC cost abuse */
    validateAddressPerIp: () => createLimiter(60, '1 m', 'validate-address:ip'),
};

/**
 * Check rate limit. Returns { success, remaining, reset }.
 */
export async function checkRateLimit(
    limiterFactory: () => Ratelimit,
    identifier: string,
): Promise<{ success: boolean; remaining: number; reset: number }> {
    try {
        const limiter = limiterFactory();
        const result = await limiter.limit(identifier);
        return {
            success: result.success,
            remaining: result.remaining,
            reset: result.reset,
        };
    } catch {
        // If Redis is unavailable, allow through (fail-open for dev)
        console.warn('Rate limiter unavailable, allowing request');
        return { success: true, remaining: 999, reset: 0 };
    }
}
