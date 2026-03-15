import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Errors, ErrorCodes } from '@/lib/errors';
import { db } from '@/db';
import { dagets, claims, notifications } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { updateRaffleEmbed, buildRaffleEmbedData } from '@/lib/discord-bot';

/**
 * POST /api/dagets/:dagetId/stop — Stop an active Daget.
 */
export async function POST(
    _request: Request,
    { params }: { params: Promise<{ dagetId: string }> },
) {
    try {
        const user = await requireAuth();
        const { dagetId } = await params;

        const daget = await db.query.dagets.findFirst({
            where: eq(dagets.id, dagetId),
        });

        if (!daget) return Errors.notFound('Daget');
        if (daget.creatorUserId !== user.id) return Errors.forbidden('Not the creator');

        if (daget.status !== 'active') {
            return Errors.conflict(
                ErrorCodes.DAGET_NOT_ACTIVE,
                `Daget is already ${daget.status}`,
            );
        }

        // Atomic CAS: stop only if still 'active' (prevents overwriting 'drawing'/'closed')
        const stopped = await db.transaction(async (tx) => {
            const lockResult = await tx.execute(sql`
                UPDATE dagets SET status = 'stopped', stopped_at = now(), updated_at = now()
                WHERE id = ${dagetId} AND status = 'active'
                RETURNING id
            `);
            if ((lockResult as unknown as Array<{ id: string }>).length === 0) {
                return false;
            }

            // Release all raffle entries on cancel
            if (daget.dagetType === 'raffle') {
                await tx.execute(sql`
                    UPDATE claims
                    SET status = 'released', is_raffle_winner = false, released_at = now()
                    WHERE daget_id = ${dagetId} AND status = 'created'
                `);
            }
            return true;
        });

        if (!stopped) {
            return Errors.conflict(ErrorCodes.DAGET_NOT_ACTIVE, 'Daget status changed — it may be drawing or already stopped.');
        }

        // Create notification
        await db.insert(notifications).values({
            userId: user.id,
            type: 'daget_stopped',
            title: 'Daget Stopped',
            body: `You stopped "${daget.name}".`,
            relatedDagetId: dagetId,
        });

        // Update Discord embed if applicable (best-effort)
        if (daget.dagetType === 'raffle' && daget.discordChannelId && daget.discordMessageId) {
            const embedData = buildRaffleEmbedData(daget, user.discordUserId);
            updateRaffleEmbed(daget.discordChannelId, daget.discordMessageId, embedData, 'stopped')
                .catch(() => {}); // best-effort
        }

        return NextResponse.json({
            daget_id: dagetId,
            status: 'stopped',
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        console.error('Stop daget error:', error);
        return Errors.internal();
    }
}
