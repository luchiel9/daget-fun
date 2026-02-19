import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Errors } from '@/lib/errors';
import { db } from '@/db';
import { notifications, claims, users, dagets } from '@/db/schema';
import { eq, and, desc, lt } from 'drizzle-orm';
import { paginationSchema } from '@/lib/validation';
import { encodeCursor, decodeCursor } from '@/lib/cursor';

/** Escape user/DB-sourced strings before interpolating into an HTML body. */
function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export async function GET(request: NextRequest) {
    try {
        const user = await requireAuth();
        const { searchParams } = new URL(request.url);
        const parsed = paginationSchema.safeParse({
            cursor: searchParams.get('cursor') || undefined,
            limit: searchParams.get('limit') || 20,
        });
        if (!parsed.success) return Errors.validation('Invalid query');
        const { cursor, limit } = parsed.data;

        // Base query with joins
        let query = db
            .select({
                notification: notifications,
                claim: claims,
                claimant: users,
                daget: dagets,
            })
            .from(notifications)
            .leftJoin(dagets, eq(notifications.relatedDagetId, dagets.id))
            .leftJoin(claims, eq(notifications.relatedClaimId, claims.id))
            .leftJoin(users, eq(claims.claimantUserId, users.id)) as any;

        query = query.where(eq(notifications.userId, user.id))
            .orderBy(desc(notifications.createdAt))
            .limit(limit + 1);

        if (cursor) {
            const decoded = decodeCursor(cursor);
            if (decoded) {
                query = query.where(
                    and(
                        eq(notifications.userId, user.id),
                        lt(notifications.createdAt, new Date(decoded.v))
                    )
                ) as any;
            }
        }

        const results = await query;

        const hasMore = results.length > limit;
        const items = results.slice(0, limit);
        const nextCursor = hasMore && items.length > 0
            ? encodeCursor(items[items.length - 1].notification.createdAt.toISOString(), items[items.length - 1].notification.id)
            : null;

        const mappedItems = items.map((item: any) => {
            const { notification, claim, claimant, daget } = item;
            let body = notification.body;
            let icon_url = null;

            // Dynamic formatting for claim confirmations
            if (notification.type === 'claim_confirmed' && claim && claimant && daget) {
                const amount = (Number(claim.amountBaseUnits) || 0) / Math.pow(10, daget.tokenDecimals);
                const discordName = claimant.discordUsername || 'Unknown User';

                // Format: [claimant_photo] [claimant name] Claimed 0.1 USDC from [Daget Name]
                // Escape creator-controlled (daget.name) and Discord-controlled (discordName)
                // values before interpolating into HTML to prevent stored XSS.
                // amount is a number (safe); tokenSymbol is constrained to USDC/USDT (safe).
                body = `<b>${escapeHtml(discordName)}</b> Claimed <b>${amount} ${daget.tokenSymbol}</b> from <b>${escapeHtml(daget.name)}</b>`;
                icon_url = claimant.discordAvatarUrl;
            }

            return {
                id: notification.id,
                type: notification.type,
                title: notification.title,
                body: body,
                is_read: notification.isRead,
                created_at: notification.createdAt.toISOString(),
                icon_url: icon_url,
            };
        });

        return NextResponse.json({
            items: mappedItems,
            next_cursor: nextCursor,
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        console.error('Notification API Error:', error);
        return Errors.internal();
    }
}
