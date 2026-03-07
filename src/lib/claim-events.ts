import { getRedis, isRedisReady } from '@/lib/redis';

const CHANNEL_PREFIX = 'claim:status:';

export interface ClaimStatusEvent {
    claimId: string;
    status: string;
    txSignature?: string | null;
    confirmedAt?: string | null;
    failedAt?: string | null;
    lastError?: string | null;
}

/**
 * Publish a claim status change to Redis pub/sub.
 * Fire-and-forget — never blocks or fails claim processing.
 */
export async function publishClaimStatus(event: ClaimStatusEvent): Promise<void> {
    if (!isRedisReady()) return;
    try {
        await getRedis().publish(
            `${CHANNEL_PREFIX}${event.claimId}`,
            JSON.stringify(event),
        );
    } catch {
        // Intentionally swallowed — pub/sub failure must never affect claims
    }
}

export function claimChannel(claimId: string): string {
    return `${CHANNEL_PREFIX}${claimId}`;
}
