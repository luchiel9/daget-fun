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

        const { receiving_address } = body;

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

        // Update user
        await db
            .update(users)
            .set({
                receivingAddress: receiving_address,
                updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));

        return NextResponse.json({
            success: true,
            receiving_address,
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        console.error('Update user error:', error);
        return Errors.internal();
    }
}
