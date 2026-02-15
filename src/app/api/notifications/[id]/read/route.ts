import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Errors } from '@/lib/errors';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const user = await requireAuth();
        const { id } = await params;

        const notification = await db.query.notifications.findFirst({
            where: and(eq(notifications.id, id), eq(notifications.userId, user.id)),
        });
        if (!notification) return Errors.notFound('Notification');

        await db.update(notifications)
            .set({ isRead: true })
            .where(eq(notifications.id, id));

        return NextResponse.json({ id, is_read: true });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        return Errors.internal();
    }
}
