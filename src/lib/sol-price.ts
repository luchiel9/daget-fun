import { getRedis, isRedisReady } from './redis';

const CACHE_KEY = 'sol_usd_price';
const CACHE_TTL = 300; // 5 minutes

export async function getSolUsdPrice(): Promise<number> {
    // Try Redis cache first
    if (isRedisReady()) {
        try {
            const cached = await getRedis().get(CACHE_KEY);
            if (cached) return parseFloat(cached);
        } catch { /* fall through */ }
    }

    // Try fetching from CoinGecko
    try {
        const res = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
            { signal: AbortSignal.timeout(5000) },
        );
        if (res.ok) {
            const data = await res.json();
            const price = data?.solana?.usd;
            if (typeof price === 'number' && price > 0) {
                if (isRedisReady()) {
                    getRedis().setex(CACHE_KEY, CACHE_TTL, price.toString()).catch(() => {});
                }
                return price;
            }
        }
    } catch { /* fall through */ }

    // Fallback to env var
    const envPrice = parseFloat(process.env.SOL_USD_PRICE || '');
    if (!isNaN(envPrice) && envPrice > 0) return envPrice;

    // Last resort fallback
    return 150;
}
