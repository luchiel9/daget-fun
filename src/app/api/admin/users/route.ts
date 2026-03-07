import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { Errors } from '@/lib/errors';
import { db } from '@/db';
import { users } from '@/db/schema';
import { sql, and, desc, lt, ilike } from 'drizzle-orm';
import { decodeCursor, encodeCursor } from '@/lib/cursor';
import { getSolUsdPrice } from '@/lib/sol-price';

export async function GET(request: NextRequest) {
    try {
        await requireAdmin();
    } catch (e: any) {
        if (e.message === 'AUTH_REQUIRED') return Errors.unauthorized();
        if (e.message === 'ADMIN_REQUIRED') return Errors.forbidden('Admin access required');
        return Errors.internal();
    }

    try {
        const solPrice = await getSolUsdPrice();
        const { searchParams } = request.nextUrl;
        const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
        const cursor = searchParams.get('cursor');
        const search = searchParams.get('search')?.trim();

        const conditions = [];
        if (cursor) {
            const decoded = decodeCursor(cursor);
            if (decoded) conditions.push(lt(users.createdAt, new Date(decoded.v)));
        }
        if (search) {
            conditions.push(ilike(users.discordUsername, `%${search}%`));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Subquery approach: get users first, then aggregate
        const userRows = await db.select({
            id: users.id,
            discordUserId: users.discordUserId,
            discordUsername: users.discordUsername,
            discordAvatarUrl: users.discordAvatarUrl,
            receivingAddress: users.receivingAddress,
            isAdmin: users.isAdmin,
            createdAt: users.createdAt,
            lastLoginAt: users.lastLoginAt,
            dagetsCreated: sql<number>`(select count(*)::int from dagets d where d.creator_user_id = "users"."id")`,
            fundedUsd: sql<number>`(select coalesce(sum(
                case when d2.token_symbol = 'SOL'
                    then d2.total_amount_base_units::numeric / 1e9 * ${solPrice}
                    else d2.total_amount_base_units::numeric / 1e6
                end
            ), 0)::numeric(12,2)
            from dagets d2 where d2.creator_user_id = "users"."id")`,
            totalClaims: sql<number>`(select count(*)::int from claims c where c.claimant_user_id = "users"."id")`,
            confirmedClaims: sql<number>`(select count(*)::int from claims c2 where c2.claimant_user_id = "users"."id" and c2.status = 'confirmed')`,
            claimedUsd: sql<number>`(select coalesce(sum(
                case when d.token_symbol = 'SOL'
                    then c3.amount_base_units::numeric / 1e9 * ${solPrice}
                    else c3.amount_base_units::numeric / 1e6
                end
            ), 0)::numeric(12,2)
            from claims c3 join dagets d on d.id = c3.daget_id
            where c3.claimant_user_id = "users"."id" and c3.status = 'confirmed' and c3.amount_base_units is not null)`,
        })
            .from(users)
            .where(whereClause)
            .orderBy(desc(users.createdAt))
            .limit(limit + 1);

        const hasMore = userRows.length > limit;
        const items = hasMore ? userRows.slice(0, limit) : userRows;
        const lastItem = items[items.length - 1];
        const nextCursor = hasMore
            ? encodeCursor(lastItem.createdAt.toISOString(), lastItem.id)
            : null;

        return NextResponse.json({
            users: items.map(u => ({
                id: u.id,
                discord_user_id: u.discordUserId,
                discord_username: u.discordUsername,
                discord_avatar_url: u.discordAvatarUrl,
                receiving_address: u.receivingAddress,
                is_admin: u.isAdmin,
                created_at: u.createdAt,
                last_login_at: u.lastLoginAt,
                dagets_created: u.dagetsCreated,
                funded_usd: parseFloat(String(u.fundedUsd)) || 0,
                total_claims: u.totalClaims,
                confirmed_claims: u.confirmedClaims,
                claimed_usd: parseFloat(String(u.claimedUsd)) || 0,
            })),
            next_cursor: nextCursor,
        });
    } catch (e) {
        console.error('[Admin Users]', e);
        return Errors.internal();
    }
}
