import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Errors } from '@/lib/errors';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
    try {
        const user = await requireAuth();

        await db
            .update(notifications)
            .set({ isRead: true })
            .where(eq(notifications.userId, user.id));

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        return Errors.internal();
    }
}
