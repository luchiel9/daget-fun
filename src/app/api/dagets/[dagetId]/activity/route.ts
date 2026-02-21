import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Errors } from '@/lib/errors';
import { db } from '@/db';
import { claims, dagets, users } from '@/db/schema';
import { eq, and, desc, lt } from 'drizzle-orm';
import { paginationSchema } from '@/lib/validation';
import { encodeCursor, decodeCursor } from '@/lib/cursor';

/**
 * GET /api/dagets/:dagetId/activity — Creator-only activity feed.
 * Returns claimant Discord usernames and avatars — restricted to the daget creator.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ dagetId: string }> },
) {
    try {
        const user = await requireAuth();
        const { dagetId } = await params;

        // Verify the caller is the daget creator before exposing claimant PII.
        const daget = await db.query.dagets.findFirst({
            where: eq(dagets.id, dagetId),
        });
        if (!daget) return Errors.notFound('Daget');
        if (daget.creatorUserId !== user.id) return Errors.forbidden('Not the creator');

        const { searchParams } = new URL(request.url);
        const parsedQuery = paginationSchema.safeParse({
            cursor: searchParams.get('cursor') || undefined,
            limit: searchParams.get('limit') || 10,
        });
        if (!parsedQuery.success) return Errors.validation('Invalid query');
        const { limit, cursor } = parsedQuery.data;

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
