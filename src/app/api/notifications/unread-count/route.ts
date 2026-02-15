import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Errors } from '@/lib/errors';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET() {
    try {
        const user = await requireAuth();

        const result = await db
            .select({ count: sql<number>`count(*)` })
            .from(notifications)
            .where(
                and(
                    eq(notifications.userId, user.id),
                    eq(notifications.isRead, false)
                )
            );

        return NextResponse.json({ count: Number(result[0]?.count) || 0 });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        return Errors.internal();
    }
}
