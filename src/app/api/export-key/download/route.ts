import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Errors, ErrorCodes } from '@/lib/errors';
import { db } from '@/db';
import { wallets, exportTokens, walletExports } from '@/db/schema';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { checkRateLimit, rateLimiters } from '@/lib/rate-limit';
import { decryptPrivateKey, zeroize } from '@/lib/crypto';
import { exportKeyDownloadSchema } from '@/lib/validation';
import { headers } from 'next/headers';
import bs58 from 'bs58';

export async function POST(request: Request) {
    try {
        const user = await requireAuth();

        // Rate limit
        const limit = await checkRateLimit(rateLimiters.exportDlPerUser, user.id);
        if (!limit.success) return Errors.rateLimited();

        const body = await request.json();
        const parsed = exportKeyDownloadSchema.safeParse(body);
        if (!parsed.success) {
            return Errors.validation('Invalid export token format');
        }

        // Atomically consume the token in a single statement.
        // This prevents a TOCTOU race where two concurrent requests both pass
        // the "already used" check before either marks it as used.
        const now = new Date();
        const [tokenRecord] = await db
            .update(exportTokens)
            .set({ usedAt: now })
            .where(
                and(
                    eq(exportTokens.token, parsed.data.export_token),
                    eq(exportTokens.userId, user.id),
                    isNull(exportTokens.usedAt),
                    gt(exportTokens.expiresAt, now),
                ),
            )
            .returning();

        if (!tokenRecord) {
            // Distinguish between not-found, already-used, and expired for useful errors.
            const existing = await db.query.exportTokens.findFirst({
                where: eq(exportTokens.token, parsed.data.export_token),
            });
            if (!existing) return Errors.notFound('Token');
            if (existing.userId !== user.id) return Errors.forbidden('Token does not belong to this session');
            if (existing.usedAt) return Errors.conflict(ErrorCodes.EXPORT_TOKEN_USED, 'Token already used');
            return Errors.conflict(ErrorCodes.EXPORT_TOKEN_EXPIRED, 'Token expired');
        }

        // Get wallet
        const wallet = await db.query.wallets.findFirst({
            where: eq(wallets.id, tokenRecord.walletId),
        });

        if (!wallet || !wallet.encryptedPrivateKey) {
            return Errors.notFound('Wallet key');
        }

        // Decrypt private key
        let privateKeyBytes: Uint8Array | null = null;
        try {
            privateKeyBytes = await decryptPrivateKey(
                wallet.encryptedPrivateKey,
                wallet.encryptionVersion,
            );

            // Prepare response as downloadable .txt file
            const headerStore = await headers();
            const ip = headerStore.get('x-forwarded-for') || headerStore.get('x-real-ip') || '';
            const userAgent = headerStore.get('user-agent') || '';

            // Audit log
            await db.insert(walletExports).values({
                walletId: wallet.id,
                userId: user.id,
                result: 'success',
                ip: ip.split(',')[0]?.trim() || null,
                userAgent,
            });

            // Update wallet last_exported_at
            await db.update(wallets)
                .set({ lastExportedAt: new Date() })
                .where(eq(wallets.id, wallet.id));

            // Convert to base58 encoded string for export
            // The private key is a 64-byte ed25519 secret key (seed + public)
            const keyString = bs58.encode(privateKeyBytes);

            return new NextResponse(keyString, {
                status: 200,
                headers: {
                    'Content-Type': 'text/plain',
                    'Content-Disposition': 'attachment; filename="daget-private-key.txt"',
                    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                },
            });
        } finally {
            if (privateKeyBytes) zeroize(privateKeyBytes);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        console.error('Export key download error:', error);
        return Errors.internal();
    }
}
