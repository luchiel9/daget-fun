import Redis from 'ioredis';

/**
 * Rate limiters per endpoint, per blueprint §4.6.
 */

const isProduction = process.env.NODE_ENV === 'production';

// Survive Next.js hot reloads in dev without leaking connections
const globalForRedis = globalThis as unknown as {
    _redis: Redis | undefined;
    _redisReady: boolean;
};

function isRedisReady(): boolean {
    return globalForRedis._redisReady === true;
}

function getRedis(): Redis {
    if (!globalForRedis._redis) {
        globalForRedis._redisReady = false;

        globalForRedis._redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: true,
            retryStrategy(times) {
                // Exponential backoff: 200ms, 400ms, 800ms... max 10s
                return Math.min(times * 200, 10_000);
            },
        });

        // Register the Lua script once so ioredis uses EVALSHA on subsequent calls
        globalForRedis._redis.defineCommand('ratelimit', {
            numberOfKeys: 1,
            lua: `
                local current = redis.call("INCR", KEYS[1])
                if current == 1 then
                    redis.call("EXPIRE", KEYS[1], ARGV[1])
                end
                local ttl = redis.call("TTL", KEYS[1])
                if ttl == -1 then
                    redis.call("EXPIRE", KEYS[1], ARGV[1])
                end
                local pttl = redis.call("PTTL", KEYS[1])
                return {current, pttl}
            `,
        });

        globalForRedis._redis.on('ready', () => {
            globalForRedis._redisReady = true;
            console.log('[Redis] Connected and ready');
        });

        globalForRedis._redis.on('error', (err) => {
            console.error('[Redis] Connection error:', err.message);
        });

        globalForRedis._redis.on('close', () => {
            globalForRedis._redisReady = false;
            console.warn('[Redis] Connection closed');
        });

        globalForRedis._redis.connect().catch(() => {
            // Handled by the 'error' event listener above
        });
    }
    return globalForRedis._redis;
}

// Convert "1 m" format to seconds
function parseWindowToSeconds(window: string): number {
    const [valStr, unit] = window.split(' ');
    const val = parseInt(valStr, 10);
    switch (unit) {
        case 's': return val;
        case 'm': return val * 60;
        case 'h': return val * 60 * 60;
        case 'd': return val * 60 * 60 * 24;
        default: return 60;
    }
}

export interface RateLimiterConfig {
    tokens: number;
    windowSeconds: number;
    prefix: string;
}

function createLimiter(
    tokens: number,
    window: `${number} ${'s' | 'm' | 'h' | 'd'}`,
    prefix: string,
): RateLimiterConfig {
    return {
        tokens,
        windowSeconds: parseWindowToSeconds(window),
        prefix,
    };
}

export const rateLimiters = {
    /** POST /api/claims: 30/min/user */
    claimsPerUser: () => createLimiter(30, '1 m', 'claims:user'),
    /** POST /api/claims: 60/min/ip */
    claimsPerIp: () => createLimiter(60, '1 m', 'claims:ip'),
    /** POST /api/dagets: 20/hour/user */
    dagetsPerUser: () => createLimiter(20, '1 h', 'dagets:user'),
    /** POST /api/wallet/generate: 5/day/user */
    walletGenPerUser: () => createLimiter(5, '1 d', 'wallet-gen:user'),
    /** POST /api/export-key/request: 5/day/user */
    exportReqPerUser: () => createLimiter(5, '1 d', 'export-req:user'),
    /** POST /api/export-key/download: 20/hour/user */
    exportDlPerUser: () => createLimiter(20, '1 h', 'export-dl:user'),
    /** POST /api/export-key/download: 30/day/user */
    exportDlPerUserDaily: () => createLimiter(30, '1 d', 'export-dl-daily:user'),
    /** POST /api/export-key/download: 60/day/ip */
    exportDlPerIp: () => createLimiter(60, '1 d', 'export-dl:ip'),
    /** POST /api/claims/:claimId/retry: 10/hour/user */
    retryPerUser: () => createLimiter(10, '1 h', 'retry:user'),
    /** POST /api/claims/:claimId/retry: 30/hour/ip */
    retryPerIp: () => createLimiter(30, '1 h', 'retry:ip'),
    /** POST /api/validate-address: 60/min/ip — prevents RPC cost abuse */
    validateAddressPerIp: () => createLimiter(60, '1 m', 'validate-address:ip'),
    /** GET /api/discord/guilds + /roles: 60/min/user — prevents Discord API proxy abuse */
    discordApiPerUser: () => createLimiter(60, '1 m', 'discord-api:user'),
    /** GET /api/claim/:slug/verify: 30/min/user — Discord API call per request */
    verifyPerUser: () => createLimiter(30, '1 m', 'verify:user'),
    /** GET /api/wallet/balances: 60/min/user — Solana RPC call per request */
    walletBalancesPerUser: () => createLimiter(60, '1 m', 'wallet-bal:user'),
    /** GET /api/claim/:slug: 120/min/ip — public endpoint, no auth required */
    publicClaimPerIp: () => createLimiter(120, '1 m', 'public-claim:ip'),
};

// Sanitize identifier to prevent oversized or malformed Redis keys
function sanitizeIdentifier(id: string): string {
    // Truncate to 128 chars and strip control characters
    return id.slice(0, 128).replace(/[\x00-\x1f\s]/g, '_');
}

/**
 * Extract client IP from request headers.
 *
 * Priority:
 *  1. CF-Connecting-IP — set by Cloudflare to the real client IP (cannot be spoofed
 *     by the client because Cloudflare overwrites it). This is the correct header
 *     when behind Cloudflare Tunnel → Traefik → Next.js.
 *  2. X-Real-IP — set by Nginx/Traefik if no Cloudflare.
 *  3. X-Forwarded-For (rightmost) — last resort.
 *
 * Falls back to 'unresolved:<random>' so unidentifiable clients each get
 * their own bucket instead of sharing a single 'unknown' bucket
 * (which would let one attacker block all unresolved clients).
 */
export function getClientIp(request: { headers: { get(name: string): string | null } }): string {
    // Cloudflare sets this to the true client IP; it's overwritten at the edge
    // so the client cannot spoof it (unlike XFF which is append-only).
    const cfIp = request.headers.get('cf-connecting-ip');
    if (cfIp) return cfIp;

    const realIp = request.headers.get('x-real-ip');
    if (realIp) return realIp;

    const xff = request.headers.get('x-forwarded-for');
    if (xff) {
        const parts = xff.split(',').map(s => s.trim()).filter(Boolean);
        const ip = parts[parts.length - 1];
        if (ip) return ip;
    }

    return `unresolved:${Math.random().toString(36).slice(2)}`;
}

// Extend Redis type to include our custom command
interface RateLimitRedis extends Redis {
    ratelimit(key: string, windowSeconds: number): Promise<[number, number]>;
}

/**
 * Check rate limit (Fixed Window counting). Returns { success, remaining, reset }.
 *
 * Production: fail-closed — if Redis is down, requests are denied.
 * Dev: fail-open — allows requests through for convenience.
 */
export async function checkRateLimit(
    limiterFactory: () => RateLimiterConfig,
    identifier: string,
): Promise<{ success: boolean; remaining: number; reset: number }> {
    // Ensure Redis connection is initiated (lazy-connect on first call)
    getRedis();

    // If Redis hasn't finished connecting yet, short-circuit
    if (!isRedisReady()) {
        if (isProduction) {
            console.error('[RateLimit] Redis not ready, denying request (fail-closed)');
            return { success: false, remaining: 0, reset: Date.now() + 60_000 };
        }
        return { success: true, remaining: 999, reset: 0 };
    }

    try {
        const config = limiterFactory();
        const client = getRedis() as RateLimitRedis;
        const key = `ratelimit:${config.prefix}:${sanitizeIdentifier(identifier)}`;

        const result = await client.ratelimit(key, config.windowSeconds);
        const current = result[0];
        const ttl = result[1]; // in milliseconds

        const success = current <= config.tokens;
        const remaining = Math.max(0, config.tokens - current);
        const reset = Date.now() + (ttl > 0 ? ttl : config.windowSeconds * 1000);

        return {
            success,
            remaining,
            reset,
        };
    } catch (error) {
        if (isProduction) {
            console.error('[RateLimit] Redis unavailable, denying request:', error);
            return { success: false, remaining: 0, reset: Date.now() + 60_000 };
        }
        console.warn('[RateLimit] Redis unavailable, allowing request:', error);
        return { success: true, remaining: 999, reset: 0 };
    }
}
