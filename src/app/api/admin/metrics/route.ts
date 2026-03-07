import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { Errors } from '@/lib/errors';
import { db } from '@/db';
import { users, wallets, dagets, claims } from '@/db/schema';
import { sql, eq, and, gte, inArray } from 'drizzle-orm';
import { getSolUsdPrice } from '@/lib/sol-price';

function toUsd(baseUnits: number, tokenSymbol: string, tokenDecimals: number, solPrice: number): number {
    const display = baseUnits / 10 ** tokenDecimals;
    return tokenSymbol === 'SOL' ? display * solPrice : display; // USDC/USDT = $1
}

export async function GET() {
    try {
        await requireAdmin();
    } catch (e: any) {
        if (e.message === 'AUTH_REQUIRED') return Errors.unauthorized();
        if (e.message === 'ADMIN_REQUIRED') return Errors.forbidden('Admin access required');
        return Errors.internal();
    }

    try {
        const solPrice = await getSolUsdPrice();
        const now = new Date();
        const d24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const d7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const d30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [
            userStats,
            newUsers24h,
            newUsers7d,
            newUsers30d,
            walletsCount,
            dagetStats,
            dagetsByStatus,
            dagetsByType,
            volumeByToken,
            claimStats,
            claimsByStatus,
            claimedByToken,
            pendingQueue,
            stuckClaims,
            dailyDagets,
            dailyClaims,
        ] = await Promise.all([
            // Total users + users with receiving address
            db.select({
                total: sql<number>`count(*)::int`,
                withAddress: sql<number>`count(*) filter (where ${users.receivingAddress} is not null)::int`,
            }).from(users),

            // New users time windows
            db.select({ count: sql<number>`count(*)::int` }).from(users).where(gte(users.createdAt, d24h)),
            db.select({ count: sql<number>`count(*)::int` }).from(users).where(gte(users.createdAt, d7d)),
            db.select({ count: sql<number>`count(*)::int` }).from(users).where(gte(users.createdAt, d30d)),

            // Users with active wallets
            db.select({ count: sql<number>`count(distinct ${wallets.userId})::int` })
                .from(wallets).where(eq(wallets.isActive, true)),

            // Daget totals
            db.select({
                total: sql<number>`count(*)::int`,
                totalWinnerSlots: sql<number>`coalesce(sum(${dagets.totalWinners}), 0)::int`,
            }).from(dagets),

            // Dagets by status
            db.select({
                status: dagets.status,
                count: sql<number>`count(*)::int`,
            }).from(dagets).groupBy(dagets.status),

            // Dagets by type
            db.select({
                type: dagets.dagetType,
                count: sql<number>`count(*)::int`,
            }).from(dagets).groupBy(dagets.dagetType),

            // Total funded volume by token
            db.select({
                tokenSymbol: dagets.tokenSymbol,
                tokenDecimals: dagets.tokenDecimals,
                totalBaseUnits: sql<number>`coalesce(sum(${dagets.totalAmountBaseUnits}), 0)::bigint`,
                count: sql<number>`count(*)::int`,
            }).from(dagets).groupBy(dagets.tokenSymbol, dagets.tokenDecimals),

            // Claim totals
            db.select({
                total: sql<number>`count(*)::int`,
            }).from(claims),

            // Claims by status
            db.select({
                status: claims.status,
                count: sql<number>`count(*)::int`,
            }).from(claims).groupBy(claims.status),

            // Claimed amount by token (confirmed only)
            db.select({
                tokenSymbol: dagets.tokenSymbol,
                tokenDecimals: dagets.tokenDecimals,
                totalBaseUnits: sql<number>`coalesce(sum(${claims.amountBaseUnits}), 0)::bigint`,
                count: sql<number>`count(*)::int`,
            }).from(claims)
                .innerJoin(dagets, eq(claims.dagetId, dagets.id))
                .where(eq(claims.status, 'confirmed'))
                .groupBy(dagets.tokenSymbol, dagets.tokenDecimals),

            // Pending queue depth
            db.select({ count: sql<number>`count(*)::int` }).from(claims)
                .where(inArray(claims.status, ['created', 'submitted', 'failed_retryable'])),

            // Stuck claims (locked but lock expired)
            db.select({ count: sql<number>`count(*)::int` }).from(claims)
                .where(and(
                    inArray(claims.status, ['created', 'submitted', 'failed_retryable']),
                    sql`${claims.lockedUntil} < now()`,
                )),

            // Daily dagets created (last 30 days)
            db.select({
                date: sql<string>`to_char(${dagets.createdAt}::date, 'YYYY-MM-DD')`,
                count: sql<number>`count(*)::int`,
            }).from(dagets)
                .where(gte(dagets.createdAt, d30d))
                .groupBy(sql`${dagets.createdAt}::date`)
                .orderBy(sql`${dagets.createdAt}::date`),

            // Daily claims (last 30 days)
            db.select({
                date: sql<string>`to_char(${claims.createdAt}::date, 'YYYY-MM-DD')`,
                count: sql<number>`count(*)::int`,
            }).from(claims)
                .where(gte(claims.createdAt, d30d))
                .groupBy(sql`${claims.createdAt}::date`)
                .orderBy(sql`${claims.createdAt}::date`),
        ]);

        // Compute USD totals
        let totalFundedUsd = 0;
        const volumeBreakdown = volumeByToken.map(v => {
            const usd = toUsd(Number(v.totalBaseUnits), v.tokenSymbol, v.tokenDecimals, solPrice);
            totalFundedUsd += usd;
            return {
                tokenSymbol: v.tokenSymbol,
                totalBaseUnits: Number(v.totalBaseUnits),
                tokenDecimals: v.tokenDecimals,
                dagetCount: v.count,
                totalUsd: Math.round(usd * 100) / 100,
            };
        });

        let totalClaimedUsd = 0;
        const claimedBreakdown = claimedByToken.map(v => {
            const usd = toUsd(Number(v.totalBaseUnits), v.tokenSymbol, v.tokenDecimals, solPrice);
            totalClaimedUsd += usd;
            return {
                tokenSymbol: v.tokenSymbol,
                totalBaseUnits: Number(v.totalBaseUnits),
                tokenDecimals: v.tokenDecimals,
                claimCount: v.count,
                totalUsd: Math.round(usd * 100) / 100,
            };
        });

        const confirmed = claimsByStatus.find(c => c.status === 'confirmed')?.count || 0;
        const failedPerm = claimsByStatus.find(c => c.status === 'failed_permanent')?.count || 0;
        const successRate = confirmed + failedPerm > 0
            ? Math.round((confirmed / (confirmed + failedPerm)) * 10000) / 100
            : 100;

        return NextResponse.json({
            solPrice,
            users: {
                total: userStats[0].total,
                withAddress: userStats[0].withAddress,
                withWallet: walletsCount[0].count,
                new24h: newUsers24h[0].count,
                new7d: newUsers7d[0].count,
                new30d: newUsers30d[0].count,
            },
            dagets: {
                total: dagetStats[0].total,
                totalWinnerSlots: dagetStats[0].totalWinnerSlots,
                byStatus: Object.fromEntries(dagetsByStatus.map(s => [s.status, s.count])),
                byType: Object.fromEntries(dagetsByType.map(t => [t.type, t.count])),
                volumeByToken: volumeBreakdown,
                totalFundedUsd: Math.round(totalFundedUsd * 100) / 100,
            },
            claims: {
                total: claimStats[0].total,
                byStatus: Object.fromEntries(claimsByStatus.map(s => [s.status, s.count])),
                claimedByToken: claimedBreakdown,
                totalClaimedUsd: Math.round(totalClaimedUsd * 100) / 100,
                successRate,
            },
            health: {
                pendingQueue: pendingQueue[0].count,
                stuckClaims: stuckClaims[0].count,
                failedPermanent: failedPerm,
            },
            timeSeries: {
                dailyDagets,
                dailyClaims,
            },
        });
    } catch (e) {
        console.error('[Admin Metrics]', e);
        return Errors.internal();
    }
}
