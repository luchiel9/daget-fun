import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Errors } from '@/lib/errors';
import { db } from '@/db';
import { claims, users } from '@/db/schema';
import { eq, and, desc, lt } from 'drizzle-orm';
import { paginationSchema } from '@/lib/validation';
import { encodeCursor, decodeCursor } from '@/lib/cursor';

/**
 * GET /api/dagets/:dagetId/activity — Recent activity feed for a Daget.
 * Publicly accessible (but maybe restricted to Daget participants/creator in future? For now public is fine or authenticated user).
 * We'll require auth since it's a dashboard feature.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ dagetId: string }> },
) {
    try {
        // Optional: Require auth? detailed info might be sensitive? 
        // Showing "masked" name is fine public, but avatar/username... 
        // Dashboard is authenticated, so yes.
        const user = await requireAuth();
        const { dagetId } = await params;

        const { searchParams } = new URL(request.url);
        // Default limit 10, max 50
        const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
        const cursor = searchParams.get('cursor') || undefined;

        // Build query
        const claimConditions: any[] = [eq(claims.dagetId, dagetId)];

        if (cursor) {
            const decoded = decodeCursor(cursor);
            if (decoded) {
                claimConditions.push(lt(claims.createdAt, new Date(decoded.v)));
            }
        }

        const claimResults = await db.query.claims.findMany({
            where: and(...claimConditions),
            orderBy: [desc(claims.createdAt)],
            limit: limit + 1,
            with: {
                claimant: {
                    columns: {
                        discordUsername: true,
                        discordAvatarUrl: true,
                    }
                }
            },
        });

        const hasMore = claimResults.length > limit;
        const items = claimResults.slice(0, limit);
        const nextCursor = hasMore && items.length > 0
            ? encodeCursor(items[items.length - 1].createdAt.toISOString(), items[items.length - 1].id)
            : null;

        return NextResponse.json({
            items: items.map((c) => ({
                claim_id: c.id,
                status: c.status,
                amount_base_units: c.amountBaseUnits,
                tx_signature: c.txSignature,
                created_at: c.createdAt.toISOString(),
                // User details
                claimant: {
                    discord_username: c.claimant?.discordUsername,
                    discord_avatar_url: c.claimant?.discordAvatarUrl,
                }
            })),
            next_cursor: nextCursor,
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        console.error('Activity feed error:', error);
        return Errors.internal();
    }
}
