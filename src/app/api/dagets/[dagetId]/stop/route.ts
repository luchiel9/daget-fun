import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Errors, ErrorCodes } from '@/lib/errors';
import { db } from '@/db';
import { dagets, notifications } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

        // Update status to stopped
        await db.update(dagets)
            .set({
                status: 'stopped',
                stoppedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(dagets.id, dagetId));

        // Create notification
        await db.insert(notifications).values({
            userId: user.id,
            type: 'daget_stopped',
            title: 'Daget Stopped',
            body: `You stopped "${daget.name}".`,
            relatedDagetId: dagetId,
        });

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
