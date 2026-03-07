import { type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Errors } from '@/lib/errors';
import { db } from '@/db';
import { claims } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import Redis from 'ioredis';
import { claimChannel } from '@/lib/claim-events';

export const dynamic = 'force-dynamic';

/**
 * GET /api/claims/stream?ids=id1,id2,id3 — SSE endpoint for claim status updates.
 * Multiplexed: one connection can subscribe to multiple claim IDs.
 * Client must query REST endpoint for current status on reconnect.
 */
export async function GET(request: NextRequest) {
    try {
        const user = await requireAuth();

        const idsParam = request.nextUrl.searchParams.get('ids');
        if (!idsParam) {
            return Errors.validation('ids query parameter is required');
        }

        const claimIds = idsParam.split(',').slice(0, 20); // Max 20 claims per connection
        if (claimIds.length === 0) {
            return Errors.validation('At least one claim ID is required');
        }

        // Verify the user owns these claims
        const userClaims = await db.query.claims.findMany({
            where: and(
                inArray(claims.id, claimIds),
                eq(claims.claimantUserId, user.id),
            ),
            columns: { id: true },
        });
        const validIds = new Set(userClaims.map((c) => c.id));
        const subscribedIds = claimIds.filter((id) => validIds.has(id));

        if (subscribedIds.length === 0) {
            return Errors.notFound('No valid claims found');
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            start(controller) {
                // Create a dedicated Redis subscriber connection
                const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
                    maxRetriesPerRequest: 3,
                    lazyConnect: true,
                });

                const channels = subscribedIds.map((id) => claimChannel(id));

                subscriber.subscribe(...channels).catch(() => {
                    controller.close();
                });

                subscriber.on('message', (_channel: string, message: string) => {
                    try {
                        controller.enqueue(encoder.encode(`data: ${message}\n\n`));
                    } catch {
                        // Stream closed
                    }
                });

                // Send initial keepalive
                controller.enqueue(encoder.encode(`: connected\n\n`));

                // Keepalive every 30s to prevent proxy timeouts
                const keepalive = setInterval(() => {
                    try {
                        controller.enqueue(encoder.encode(`: keepalive\n\n`));
                    } catch {
                        clearInterval(keepalive);
                    }
                }, 30_000);

                // Clean up on close
                request.signal.addEventListener('abort', () => {
                    clearInterval(keepalive);
                    subscriber.unsubscribe(...channels).catch(() => {});
                    subscriber.quit().catch(() => {});
                });
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
            },
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        console.error('Claims stream error:', error);
        return Errors.internal();
    }
}
