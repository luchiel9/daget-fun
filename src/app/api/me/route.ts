import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Errors } from '@/lib/errors';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/me — Get current user's profile
 */
export async function GET() {
    try {
        const user = await requireAuth();

        return NextResponse.json({
            id: user.id,
            discord_id: user.discordUserId,
            discord_username: user.discordUsername,
            discord_avatar_url: user.discordAvatarUrl,
            receiving_address: user.receivingAddress,
            finished_guide: user.finishedGuide,
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        console.error('Get user error:', error);
        return Errors.internal();
    }
}

/**
 * PATCH /api/me — Update current user's profile
 */
export async function PATCH(request: Request) {
    try {
        const user = await requireAuth();
        const body = await request.json();

        const { receiving_address, finished_guide } = body;

        // Validate Solana address — same rules as the claims schema (base58, 32-44 chars).
        if (receiving_address !== undefined && receiving_address !== null) {
            if (
                typeof receiving_address !== 'string' ||
                receiving_address.length < 32 ||
                receiving_address.length > 44 ||
                !/^[1-9A-HJ-NP-Za-km-z]+$/.test(receiving_address)
            ) {
                return Errors.validation('Invalid Solana address');
            }
        }

        const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
        if (receiving_address !== undefined) updates.receivingAddress = receiving_address;
        if (finished_guide !== undefined) updates.finishedGuide = finished_guide;

        // Update user
        await db
            .update(users)
            .set(updates)
            .where(eq(users.id, user.id));

        return NextResponse.json({
            success: true,
            receiving_address,
            finished_guide: updates.finishedGuide,
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        console.error('Update user error:', error);
        return Errors.internal();
    }
}
