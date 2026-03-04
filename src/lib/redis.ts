import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
    _redis: Redis | undefined;
    _redisReady: boolean;
};

export function isRedisReady(): boolean {
    return globalForRedis._redisReady === true;
}

export function getRedis(): Redis {
    if (!globalForRedis._redis) {
        globalForRedis._redisReady = false;

        globalForRedis._redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: true,
            retryStrategy(times) {
                return Math.min(times * 200, 10_000);
            },
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

// Eagerly initialize Redis at module load time
getRedis();
