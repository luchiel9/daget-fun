import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Errors, ErrorCodes } from '@/lib/errors';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { executeRaffleDraw } from '@/worker/raffle-draw';

interface DrawLockRow {
    id: string;
    name: string;
    status: string;
    daget_type: string;
    total_amount_base_units: number;
    total_winners: number;
    raffle_ends_at: string;
    raffle_drawn_at: string | null;
    discord_channel_id: string | null;
    discord_message_id: string | null;
    draw_attempt_count: number;
    claim_slug: string;
    token_symbol: string;
    token_decimals: number;
    creator_user_id: string;
}

/**
 * POST /api/dagets/:dagetId/draw — Trigger early raffle draw.
 * Creator-only. Atomically sets raffle_ends_at=now() and executes draw.
 */
export async function POST(
    _request: Request,
    { params }: { params: Promise<{ dagetId: string }> },
) {
    try {
        const user = await requireAuth();
        const { dagetId } = await params;

        // Atomic CAS: update raffle_ends_at=now() only if status='active'
        // This returns the UPDATED row with the new raffle_ends_at
        const result = await db.execute(sql`
            UPDATE dagets
            SET raffle_ends_at = now(), updated_at = now()
            WHERE id = ${dagetId} AND daget_type = 'raffle' AND status = 'active'
            RETURNING id, name, status, daget_type, total_amount_base_units, total_winners,
                      raffle_ends_at, raffle_drawn_at, discord_channel_id, discord_message_id,
                      draw_attempt_count, claim_slug, token_symbol, token_decimals, creator_user_id
        `);

        const daget = (result as unknown as DrawLockRow[])[0];
        if (!daget) {
            // Lookup to give a better error message
            const existing = await db.execute(sql`
                SELECT status, daget_type, creator_user_id FROM dagets WHERE id = ${dagetId}
            `);
            const row = (existing as unknown as Array<{ status: string; daget_type: string; creator_user_id: string }>)[0];
            if (!row) return Errors.notFound('Daget');
            if (row.creator_user_id !== user.id) return Errors.forbidden('Not the creator');
            if (row.daget_type !== 'raffle') return Errors.conflict(ErrorCodes.DAGET_NOT_ACTIVE, 'This is not a raffle.');
            return Errors.conflict(
                ErrorCodes.DAGET_NOT_ACTIVE,
                row.status === 'drawing' ? 'Draw is already in progress.' : `Raffle is ${row.status}.`,
            );
        }

        if (daget.creator_user_id !== user.id) {
            return Errors.forbidden('Not the creator');
        }

        // Execute draw with the UPDATED raffle_ends_at (now, not the future date)
        await executeRaffleDraw(daget);

        return NextResponse.json({
            daget_id: dagetId,
            status: 'closed',
            message: 'Raffle draw completed.',
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        console.error('Early draw error:', error);
        return Errors.internal();
    }
}
