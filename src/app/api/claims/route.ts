import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, getDiscordAccessToken } from '@/lib/auth';
import { Errors, ErrorCodes } from '@/lib/errors';
import { db } from '@/db';
import { dagets, claims, dagetRequirements } from '@/db/schema';
import { eq, and, desc, lt, sql, type SQL } from 'drizzle-orm';
import { createClaimSchema, paginationSchema } from '@/lib/validation';
import { checkIdempotency, storeIdempotency } from '@/lib/idempotency';
import { checkRateLimit, rateLimiters, getClientIp } from '@/lib/rate-limit';
import { encodeCursor, decodeCursor } from '@/lib/cursor';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { verifyDiscordRoles } from '@/lib/discord-verify';
import type { LockedDagetRow, ClaimedSumRow } from '@/worker/types';

/**
 * POST /api/claims — Reserve a claim slot.
 * Anti-overclaim: row lock + counter increment in one atomic DB transaction.
 */
export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth();

        // Rate limit — per user AND per IP to prevent multi-account bypass
        const ip = getClientIp(request);
        const [userLimit, ipLimit] = await Promise.all([
            checkRateLimit(rateLimiters.claimsPerUser, user.id),
            checkRateLimit(rateLimiters.claimsPerIp, ip),
        ]);
        if (!userLimit.success || !ipLimit.success) return Errors.rateLimited();

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return Errors.validation('Invalid JSON body');
        }

        // Idempotency
        const idempotencyKey = request.headers.get('Idempotency-Key');
        if (!idempotencyKey || idempotencyKey.length > 128) {
            return Errors.validation('Idempotency-Key header is required (max 128 characters)');
        }
        const replay = await checkIdempotency(idempotencyKey, user.id, 'POST /api/claims', body);
        if (replay) return replay;

        // Validate
        const parsed = createClaimSchema.safeParse(body);
        if (!parsed.success) {
            return Errors.validation('Invalid input', { errors: parsed.error.flatten() });
        }
        const { claim_slug, receiving_address } = parsed.data;

        // Find Daget by slug
        const daget = await db.query.dagets.findFirst({
            where: eq(dagets.claimSlug, claim_slug),
        });
        if (!daget) return Errors.notFound('Daget');

        if (daget.status !== 'active') {
            if (daget.status === 'drawing') {
                return Errors.conflict(ErrorCodes.DAGET_NOT_ACTIVE, 'Raffle draw is in progress.');
            }
            return Errors.conflict(ErrorCodes.DAGET_NOT_ACTIVE,
                daget.status === 'stopped'
                    ? 'This Daget has been stopped by the creator.'
                    : 'Daget is fully claimed.');
        }

        // Raffle-specific: check end date
        if (daget.dagetType === 'raffle' && daget.raffleEndsAt && new Date() >= daget.raffleEndsAt) {
            return Errors.conflict(ErrorCodes.DAGET_NOT_ACTIVE, 'This raffle has ended.');
        }

        // Creators cannot claim their own Daget
        if (daget.creatorUserId === user.id) {
            return Errors.forbidden('You cannot claim a Daget you created.');
        }

        // ── Discord Role Verification ──
        const requirements = await db.query.dagetRequirements.findMany({
            where: eq(dagetRequirements.dagetId, daget.id),
        });

        if (requirements.length > 0) {
            const accessToken = await getDiscordAccessToken();
            if (!accessToken) {
                return Errors.unauthorized('Discord session expired. Please log in again.');
            }

            // Group requirements by guild (should be one guild typically)
            const guildId = requirements[0].discordGuildId;
            const requiredRoleIds = requirements.map((r) => r.discordRoleId);

            const verification = await verifyDiscordRoles(accessToken, guildId, requiredRoleIds, user.discordUserId);

            if (!verification.eligible) {
                return Errors.forbidden(
                    verification.error || 'You do not meet the role requirements for this Daget.',
                );
            }
        }

        // Atomic slot reservation with row lock (anti-overclaim per blueprint §4.6)
        // This uses raw SQL for the SELECT FOR UPDATE + INSERT + UPDATE pattern
        const result = await db.transaction(async (tx) => {
            // Timeout the entire transaction at 10s — prevents unbounded lock hold
            // if the DB is slow or a downstream call stalls inside the tx.
            await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);

            // Lock the daget row
            const [lockedDaget] = await tx.execute(sql`
        SELECT claimed_count, total_winners, total_amount_base_units, daget_type,
               random_min_bps, random_max_bps, token_decimals
        FROM dagets WHERE id = ${daget.id} AND status = 'active' FOR UPDATE
      `) as unknown as LockedDagetRow[];

            if (!lockedDaget) {
                return { error: 'DAGET_NOT_ACTIVE' as const };
            }

            // Raffle allows unlimited entries; fixed/random are capped
            if (lockedDaget.daget_type !== 'raffle' && lockedDaget.claimed_count >= lockedDaget.total_winners) {
                return { error: 'FULLY_CLAIMED' as const };
            }

            // 1. Check if user already claimed this daget (DB unique index duplicate check)
            const existingClaim = await tx.query.claims.findFirst({
                where: and(eq(claims.dagetId, daget.id), eq(claims.claimantUserId, user.id)),
            });

            if (existingClaim) {
                // Allow re-claim if the previous claim was released by the creator
                if (existingClaim.status !== 'released') {
                    return { error: 'ALREADY_CLAIMED' as const, claim: existingClaim };
                }
                // Will reuse this row below instead of inserting
            }

            // 2. [SECURITY] Sybil Protection: Check if wallet address is reused for this Daget
            // Even if using different Discord accounts, we block the same wallet.
            const walletReuse = await tx.query.claims.findFirst({
                where: and(
                    eq(claims.dagetId, daget.id),
                    eq(claims.receivingAddress, receiving_address)
                ),
            });

            if (walletReuse && walletReuse.status !== 'released') {
                // Return ALREADY_CLAIMED to not leak that this wallet exists, or specific error
                // Using a specific error is better for debugging, generic is better for privacy.
                // Given the context, we'll be explicit.
                return { error: 'WALLET_ALREADY_USED' as const };
            }

            // Compute amount server-side (never from client)
            let amountBaseUnits: number | null;
            const totalAmount = Number(lockedDaget.total_amount_base_units);
            const totalWinners = lockedDaget.total_winners;
            const claimedCount = lockedDaget.claimed_count;

            if (lockedDaget.daget_type === 'raffle') {
                // Raffle: no amount until draw — entry only
                amountBaseUnits = null;
            } else if (lockedDaget.daget_type === 'fixed') {
                // Fixed: floor division, remainder to last claimer
                const perClaim = Math.floor(totalAmount / totalWinners);
                if (claimedCount === totalWinners - 1) {
                    // Last claimer gets remainder
                    amountBaseUnits = totalAmount - (perClaim * (totalWinners - 1));
                } else {
                    amountBaseUnits = perClaim;
                }
            } else {
                // Random mode
                // Exclude statuses that return money to the pool:
                //   - failed_permanent: never sent on-chain
                //   - released: creator freed the slot, funds returned to pool
                const claimedSoFar = await tx.execute(sql`
          SELECT COALESCE(SUM(amount_base_units), 0) as total
          FROM claims
          WHERE daget_id = ${daget.id}
          AND status NOT IN ('failed_permanent', 'released')
          AND amount_base_units IS NOT NULL
        `) as unknown as ClaimedSumRow[];
                const usedAmount = Number(claimedSoFar[0]?.total || 0);
                if (isNaN(usedAmount)) {
                    throw new Error(`Failed to calculate claimed amount for daget ${daget.id}`);
                }
                const remainingPool = totalAmount - usedAmount;
                const remainingClaimers = totalWinners - claimedCount;

                if (remainingClaimers === 1) {
                    // Final claimer gets all remaining
                    // Guard: pool should never be 0 here — if it is, something
                    // went wrong in prior random calculations. Fail loudly.
                    if (remainingPool <= 0) {
                        throw new Error(
                            `Pool exhausted for daget ${daget.id}: remainingPool=${remainingPool}. ` +
                            `Prior claims over-distributed the fund.`
                        );
                    }
                    amountBaseUnits = remainingPool;
                } else {
                    // Fair Share Algorithm
                    // Each claim is independently bounded between [minBps%, maxBps%] of
                    // the current fair share, where bps are basis points (100 bps = 1%).
                    //
                    // Previously the code used (maxBps - minBps) as a symmetric variance
                    // factor, which produced amounts OUTSIDE the [min, max] range.
                    // Correct approach: map the random float directly into [minAmount, maxAmount].
                    const fairShare = Math.floor(remainingPool / remainingClaimers);

                    const minBps = lockedDaget.random_min_bps ?? 10000;
                    const maxBps = lockedDaget.random_max_bps ?? 10000;

                    // Compute the absolute [min, max] amount for this claim
                    const minAmount = Math.floor(fairShare * minBps / 10000);
                    const maxAmount = Math.floor(fairShare * maxBps / 10000);

                    // [SECURITY] Use crypto for secure randomness instead of Math.random
                    const randomBuffer = crypto.randomBytes(4);
                    const randomFloat = randomBuffer.readUInt32LE(0) / 0xffffffff; // [0.0, 1.0]

                    // Map into [minAmount, maxAmount]
                    amountBaseUnits = minAmount + Math.floor(randomFloat * (maxAmount - minAmount + 1));

                    // Safety Checks
                    // 1. Minimum 1 unit
                    amountBaseUnits = Math.max(1, amountBaseUnits);

                    // 2. Ensure enough remains for subsequent claimers (1 unit each)
                    const claimsLeftAfterThis = remainingClaimers - 1;
                    const maxSafe = remainingPool - claimsLeftAfterThis;
                    amountBaseUnits = Math.min(amountBaseUnits, maxSafe);

                    // 3. maxSafe could itself be 0 if remainingPool equals remainingClaimers
                    //    (everyone gets exactly 1 unit). Ensure we never send 0.
                    amountBaseUnits = Math.max(1, amountBaseUnits);
                }
            }

            const isRaffle = lockedDaget.daget_type === 'raffle';

            // Insert claim or reset a released claim row (unique index: one per user per daget)
            let newClaim;
            if (existingClaim?.status === 'released') {
                [newClaim] = await tx.execute(sql`
                  UPDATE claims SET
                    status = 'created',
                    idempotency_key = ${idempotencyKey},
                    receiving_address = ${receiving_address},
                    amount_base_units = ${amountBaseUnits},
                    is_raffle_winner = NULL,
                    tx_signature = NULL,
                    attempt_count = 0,
                    last_error = NULL,
                    next_retry_at = NULL,
                    locked_until = NULL,
                    submitted_at = NULL,
                    confirmed_at = NULL,
                    failed_at = NULL,
                    released_at = NULL,
                    created_at = NOW()
                  WHERE id = ${existingClaim.id}
                  RETURNING *
                `) as unknown as any[];
            } else {
                [newClaim] = await tx.insert(claims).values({
                    dagetId: daget.id,
                    claimantUserId: user.id,
                    idempotencyKey,
                    receivingAddress: receiving_address,
                    amountBaseUnits,
                    isRaffleWinner: isRaffle ? null : null, // always null on insert
                    status: 'created',
                }).returning();
            }

            // Increment claimed_count
            await tx.execute(sql`
        UPDATE dagets SET
          claimed_count = claimed_count + 1,
          updated_at = NOW()
        WHERE id = ${daget.id}
      `);

            // Auto-close if fully claimed (skip for raffle — raffle closes via draw)
            if (!isRaffle && claimedCount + 1 >= totalWinners) {
                await tx.execute(sql`
          UPDATE dagets SET status = 'closed', updated_at = NOW()
          WHERE id = ${daget.id}
        `);
            }

            return { claim: newClaim };
        });

        if ('error' in result) {
            if (result.error === 'DAGET_NOT_ACTIVE') {
                return Errors.conflict(ErrorCodes.DAGET_NOT_ACTIVE, 'Daget is no longer active');
            }
            if (result.error === 'FULLY_CLAIMED') {
                return Errors.conflict(ErrorCodes.DAGET_FULLY_CLAIMED, 'Daget is fully claimed.');
            }
            if (result.error === 'ALREADY_CLAIMED') {
                return Errors.conflict(ErrorCodes.ALREADY_CLAIMED, 'You have already claimed this Daget.');
            }
            if (result.error === 'WALLET_ALREADY_USED') {
                return Errors.conflict(ErrorCodes.WALLET_ALREADY_USED, 'This wallet address has already been used for this Daget.');
            }
        }

        const claim = result.claim!;
        const isRaffleEntry = daget.dagetType === 'raffle';
        const responseBody = {
            claim_id: claim.id,
            status: isRaffleEntry ? 'entered' : 'created',
            message: isRaffleEntry
                ? `Raffle entry registered. Draw on ${daget.raffleEndsAt?.toISOString() ?? 'TBD'}.`
                : 'Claim queued',
        };

        await storeIdempotency(idempotencyKey, user.id, 'POST /api/claims', body, 202, responseBody);

        return NextResponse.json(responseBody, { status: 202 });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        console.error('Create claim error:', error);
        return Errors.internal();
    }
}

/**
 * GET /api/claims — Claimant claim history with cursor pagination.
 */
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

        const conditions: SQL[] = [eq(claims.claimantUserId, user.id)];
        if (cursor) {
            const decoded = decodeCursor(cursor);
            if (!decoded) return Errors.validation('Invalid cursor');
            conditions.push(lt(claims.createdAt, new Date(decoded.v)));
        }

        const results = await db.query.claims.findMany({
            where: and(...conditions),
            orderBy: [desc(claims.createdAt)],
            limit: limit + 1,
        });

        const hasMore = results.length > limit;
        const items = results.slice(0, limit);
        const nextCursor = hasMore && items.length > 0
            ? encodeCursor(items[items.length - 1].createdAt.toISOString(), items[items.length - 1].id)
            : null;

        // Get Daget info for display (name, token symbol, decimals)
        const dagetIds = Array.from(new Set(items.map((c) => c.dagetId)));
        const dagetInfo: Record<string, { name: string; tokenSymbol: string; tokenDecimals: number }> = {};
        if (dagetIds.length > 0) {
            const dagetsResult = await db.query.dagets.findMany({
                where: sql`id IN (${sql.join(dagetIds.map(id => sql`${id}`), sql`,`)})`,
                columns: { id: true, name: true, tokenSymbol: true, tokenDecimals: true },
            });
            dagetsResult.forEach((d) => {
                dagetInfo[d.id] = { name: d.name, tokenSymbol: d.tokenSymbol, tokenDecimals: d.tokenDecimals };
            });
        }

        return NextResponse.json({
            items: items.map((c) => ({
                claim_id: c.id,
                daget_id: c.dagetId,
                daget_name: dagetInfo[c.dagetId]?.name || 'Unknown',
                token_symbol: dagetInfo[c.dagetId]?.tokenSymbol || 'TOKEN',
                token_decimals: dagetInfo[c.dagetId]?.tokenDecimals ?? 6,
                status: c.status,
                amount_base_units: c.amountBaseUnits,
                tx_signature: c.txSignature,
                created_at: c.createdAt.toISOString(),
            })),
            next_cursor: nextCursor,
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        console.error('List claims error:', error);
        return Errors.internal();
    }
}
