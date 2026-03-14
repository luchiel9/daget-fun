import { db } from '@/db';
import { notifications } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { createHash, createHmac } from 'crypto';
import { logger } from '@/lib/logger';
import { firstRoundAfter, fetchDrandRound, type DrandBeacon } from '@/config/drand';
import { announceWinners, type WinnerInfo } from '@/lib/discord-bot';

const log = logger.child({ component: 'raffle-draw' });

const DRAW_TICK_INTERVAL_MS = 30_000; // 30 seconds
const RECOVERY_TICK_INTERVAL_MS = 60_000; // 60 seconds
const STUCK_DRAW_THRESHOLD_MINUTES = 5;
const MAX_DRAW_ATTEMPTS = 3;

interface RaffleDaget {
    id: string;
    name: string;
    status: string;
    daget_type: string;
    total_amount_base_units: number;
    total_winners: number;
    raffle_ends_at: string | null;
    raffle_drawn_at: string | null;
    discord_channel_id: string | null;
    discord_message_id: string | null;
    draw_attempt_count: number;
    claim_slug: string;
    token_symbol: string;
    token_decimals: number;
    creator_user_id: string;
}

interface RaffleEntry {
    id: string;
    claimant_user_id: string;
    receiving_address: string;
}

/**
 * Check for raffles ready to draw and execute the draw.
 * Called every 30 seconds from the worker loop.
 */
export async function drawTick(): Promise<void> {
    try {
        // Find one raffle ready to draw (FOR UPDATE SKIP LOCKED prevents race)
        const result = await db.execute(sql`
            SELECT id, name, status, daget_type, total_amount_base_units, total_winners,
                   raffle_ends_at, raffle_drawn_at, discord_channel_id, discord_message_id,
                   draw_attempt_count, claim_slug, token_symbol, token_decimals, creator_user_id
            FROM dagets
            WHERE daget_type = 'raffle'
              AND status = 'active'
              AND raffle_ends_at <= now()
              AND raffle_drawn_at IS NULL
            FOR UPDATE SKIP LOCKED
            LIMIT 1
        `);

        const daget = (result as unknown as RaffleDaget[])[0];
        if (!daget) return; // Nothing to draw

        log.info({ dagetId: daget.id, name: daget.name }, 'Starting raffle draw');

        await executeRaffleDraw(daget);
    } catch (err) {
        log.error({ err }, 'Draw tick error');
    }
}

/**
 * Recovery: reset stuck draws (in 'drawing' state too long).
 * Called every 60 seconds from the worker loop.
 */
export async function recoveryTick(): Promise<void> {
    try {
        const result = await db.execute(sql`
            UPDATE dagets
            SET status = 'active', draw_attempt_count = draw_attempt_count + 1, updated_at = now()
            WHERE daget_type = 'raffle'
              AND status = 'drawing'
              AND raffle_drawn_at IS NULL
              AND updated_at < now() - interval '${sql.raw(String(STUCK_DRAW_THRESHOLD_MINUTES))} minutes'
              AND draw_attempt_count < ${MAX_DRAW_ATTEMPTS}
            RETURNING id, draw_attempt_count
        `);

        const reset = result as unknown as Array<{ id: string; draw_attempt_count: number }>;
        for (const r of reset) {
            log.warn({ dagetId: r.id, attempt: r.draw_attempt_count }, 'Reset stuck draw for retry');
        }

        // Check for permanently stuck draws
        const stuck = await db.execute(sql`
            SELECT id FROM dagets
            WHERE daget_type = 'raffle'
              AND status = 'drawing'
              AND raffle_drawn_at IS NULL
              AND draw_attempt_count >= ${MAX_DRAW_ATTEMPTS}
        `);
        const stuckRows = stuck as unknown as Array<{ id: string }>;
        for (const s of stuckRows) {
            log.error({ dagetId: s.id }, 'Raffle stuck in drawing state after max attempts — needs manual intervention');
        }
    } catch (err) {
        log.error({ err }, 'Recovery tick error');
    }
}

/**
 * Execute a raffle draw for the given daget.
 * Can be called from worker tick or early draw endpoint.
 */
export async function executeRaffleDraw(daget: RaffleDaget): Promise<void> {
    // For raffles without an end time, use draw time as the drand seed anchor
    const raffleEndsAtUnix = daget.raffle_ends_at
        ? Math.floor(new Date(daget.raffle_ends_at).getTime() / 1000)
        : Math.floor(Date.now() / 1000);

    // Step 1: Fetch drand randomness BEFORE changing status
    let beacon: DrandBeacon;
    try {
        const targetRound = firstRoundAfter(raffleEndsAtUnix);
        beacon = await fetchDrandRound(targetRound);
        log.info({ dagetId: daget.id, round: beacon.round }, 'Fetched drand beacon');
    } catch (err) {
        log.error({ dagetId: daget.id, err }, 'Failed to fetch drand beacon — will retry');
        return; // Release lock, recovery tick will handle retry
    }

    // Step 2: Set status = 'drawing' (prevent new entries)
    const lockResult = await db.execute(sql`
        UPDATE dagets SET status = 'drawing', updated_at = now()
        WHERE id = ${daget.id} AND status = 'active'
        RETURNING id
    `);
    if ((lockResult as unknown as Array<{ id: string }>).length === 0) {
        log.warn({ dagetId: daget.id }, 'Daget no longer active, skipping draw');
        return;
    }

    try {
        // Step 3: Fetch all entries sorted by ID (deterministic order)
        const entries = await db.execute(sql`
            SELECT id, claimant_user_id, receiving_address
            FROM claims
            WHERE daget_id = ${daget.id} AND status = 'created'
            ORDER BY id ASC
        `) as unknown as RaffleEntry[];

        const entryCount = entries.length;
        const actualWinners = Math.min(entryCount, daget.total_winners);

        // Step 4: Calculate amount per winner (always divide by totalWinners, not actualWinners)
        const amountPerWinner = Math.floor(daget.total_amount_base_units / daget.total_winners);

        // Step 5: Deterministic shuffle using drand randomness
        const sortedEntryIds = entries.map((e) => e.id).join(',');
        const seed = createHash('sha256')
            .update(beacon.randomness + daget.id + sortedEntryIds)
            .digest();

        // Fisher-Yates shuffle with rejection sampling (unbiased)
        const shuffled = [...entries];
        const rng = createDeterministicRng(seed);

        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = rng.uniformInt(i + 1);
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const winners = shuffled.slice(0, actualWinners);
        const losers = shuffled.slice(actualWinners);

        // Step 6: Single atomic transaction for all updates
        await db.transaction(async (tx) => {
            // Mark winners: set amount, is_raffle_winner = true (status stays 'created' for worker pickup)
            if (winners.length > 0) {
                const winnerIds = winners.map((w) => w.id);
                await tx.execute(sql`
                    UPDATE claims
                    SET is_raffle_winner = true,
                        amount_base_units = ${amountPerWinner}
                    WHERE id = ANY(${winnerIds})
                `);
            }

            // Mark losers: is_raffle_winner = false, status = 'released'
            if (losers.length > 0) {
                const loserIds = losers.map((l) => l.id);
                await tx.execute(sql`
                    UPDATE claims
                    SET is_raffle_winner = false,
                        status = 'released',
                        released_at = now()
                    WHERE id = ANY(${loserIds})
                `);
            }

            // Close the raffle with drand data
            await tx.execute(sql`
                UPDATE dagets
                SET raffle_drawn_at = now(),
                    status = 'closed',
                    drand_round = ${beacon.round},
                    drand_randomness = ${beacon.randomness},
                    updated_at = now()
                WHERE id = ${daget.id}
            `);
        });

        log.info({
            dagetId: daget.id,
            entries: entryCount,
            winners: actualWinners,
            amountPerWinner,
            drandRound: beacon.round,
        }, 'Raffle draw completed');

        // Step 7: Best-effort notifications and Discord announcements
        await createDrawNotifications(daget, winners, losers, amountPerWinner).catch((err) => {
            log.error({ dagetId: daget.id, err }, 'Failed to create draw notifications');
        });

        if (daget.discord_channel_id) {
            await sendDiscordAnnouncement(daget, winners, amountPerWinner).catch((err) => {
                log.error({ dagetId: daget.id, err }, 'Failed to send Discord winner announcement');
            });
        }
    } catch (err) {
        // If anything fails after setting status='drawing', recovery tick will handle it
        log.error({ dagetId: daget.id, err }, 'Draw execution failed — status remains drawing for recovery');
        throw err;
    }
}

// ─── Deterministic CSPRNG using HKDF-expand ─────────────────────────────────

function createDeterministicRng(seed: Buffer) {
    let counter = 0;

    function nextBytes(n: number): Buffer {
        const result = createHmac('sha256', seed)
            .update(Buffer.from([counter >> 24, counter >> 16, counter >> 8, counter & 0xff]))
            .digest();
        counter++;
        return result.subarray(0, n);
    }

    return {
        /** Unbiased uniform integer in [0, max) using rejection sampling */
        uniformInt(max: number): number {
            if (max <= 1) return 0;

            // Find the largest multiple of max that fits in 32 bits
            const limit = 0x100000000;
            const reject = limit - (limit % max);

            // eslint-disable-next-line no-constant-condition
            while (true) {
                const bytes = nextBytes(4);
                const value = bytes.readUInt32BE(0);
                if (value < reject) {
                    return value % max;
                }
                // Rejection: re-derive (counter already incremented)
            }
        },
    };
}

// ─── Notifications ──────────────────────────────────────────────────────────

async function createDrawNotifications(
    daget: RaffleDaget,
    winners: RaffleEntry[],
    losers: RaffleEntry[],
    amountPerWinner: number,
) {
    const amountDisplay = amountPerWinner / Math.pow(10, daget.token_decimals);

    // Winner notifications
    const winnerNotifs = winners.map((w) => ({
        userId: w.claimant_user_id,
        type: 'raffle_won' as const,
        title: 'You won!',
        body: `You won the raffle **${daget.name}**! Your prize of **${amountDisplay} ${daget.token_symbol}** is being sent.`,
        relatedDagetId: daget.id,
    }));

    // Creator notification
    const creatorNotif = {
        userId: daget.creator_user_id,
        type: 'raffle_drawn' as const,
        title: 'Raffle Drawn',
        body: `Your raffle **${daget.name}** has been drawn. **${winners.length}** winner(s) selected from **${winners.length + losers.length}** entries.`,
        relatedDagetId: daget.id,
    };

    // Batch insert all notifications
    const allNotifs = [...winnerNotifs, creatorNotif];
    if (allNotifs.length > 0) {
        // Insert in batches of 500 to avoid query size limits
        for (let i = 0; i < allNotifs.length; i += 500) {
            await db.insert(notifications).values(allNotifs.slice(i, i + 500));
        }
    }
}

async function sendDiscordAnnouncement(
    daget: RaffleDaget,
    winners: RaffleEntry[],
    amountPerWinner: number,
) {
    const amountDisplay = (amountPerWinner / Math.pow(10, daget.token_decimals)).toString();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    const claimUrl = `${appUrl}/open/${daget.claim_slug}`;

    // Get Discord user IDs for winners
    const winnerUserIds = winners.map((w) => w.claimant_user_id);
    if (winnerUserIds.length === 0) return;
    const winnerUsers = await db.execute(sql`
        SELECT id, discord_user_id FROM users WHERE id = ANY(${winnerUserIds})
    `) as unknown as Array<{ id: string; discord_user_id: string }>;

    const userMap = new Map(winnerUsers.map((u) => [u.id, u.discord_user_id]));
    const winnerInfos: WinnerInfo[] = winners
        .map((w) => ({
            discordUserId: userMap.get(w.claimant_user_id) ?? '',
            amountDisplay,
        }))
        .filter((w) => w.discordUserId);

    await announceWinners(
        daget.discord_channel_id!,
        daget.name,
        daget.token_symbol,
        winnerInfos,
        claimUrl,
    );
}

export { DRAW_TICK_INTERVAL_MS, RECOVERY_TICK_INTERVAL_MS };
