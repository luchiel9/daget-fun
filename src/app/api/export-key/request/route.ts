import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Errors } from '@/lib/errors';
import { db } from '@/db';
import { wallets, exportTokens } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkRateLimit, rateLimiters } from '@/lib/rate-limit';
import crypto from 'crypto';

export async function POST() {
    try {
        const user = await requireAuth();

        // Rate limit
        const limit = await checkRateLimit(rateLimiters.exportReqPerUser, user.id);
        if (!limit.success) return Errors.rateLimited();

        // Get active wallet
        const wallet = await db.query.wallets.findFirst({
            where: and(eq(wallets.userId, user.id), eq(wallets.isActive, true)),
        });

        if (!wallet) {
            return Errors.notFound('Wallet');
        }

        // Generate one-time token (URL-safe, 43+ chars)
        const token = crypto.randomBytes(32).toString('base64url');

        // Store token with 60s TTL
        const expiresAt = new Date(Date.now() + 60 * 1000);

        await db.insert(exportTokens).values({
            userId: user.id,
            walletId: wallet.id,
            token,
            expiresAt,
        });

        return NextResponse.json({
            export_token: token,
            expires_in_seconds: 60,
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        console.error('Export key request error:', error);
        return Errors.internal();
    }
}
