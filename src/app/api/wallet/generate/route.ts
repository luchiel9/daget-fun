import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Errors, ErrorCodes } from '@/lib/errors';
import { db } from '@/db';
import { wallets, dagets } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { encryptPrivateKey, generateKeypairBytes } from '@/lib/crypto';
import { checkRateLimit, rateLimiters } from '@/lib/rate-limit';
import bs58 from 'bs58';

export async function POST(request: Request) {
    try {
        const user = await requireAuth();
        const body = await request.json().catch(() => ({}));
        const { rotate } = body;

        // Rate limit
        const limit = await checkRateLimit(rateLimiters.walletGenPerUser, user.id);
        if (!limit.success) return Errors.rateLimited();

        // Check if user already has an active wallet
        const existingWallet = await db.query.wallets.findFirst({
            where: and(eq(wallets.userId, user.id), eq(wallets.isActive, true)),
        });

        if (existingWallet && !rotate) {
            return Errors.conflict(ErrorCodes.WALLET_ACTIVE_EXISTS, 'Active wallet already exists');
        }

        // Generate keypair BEFORE the transaction — async CSPRNG cannot run inside a DB tx.
        const { publicKey, secretKey } = await generateKeypairBytes();
        const encrypted = await encryptPrivateKey(secretKey, 1);
        const publicKeyBase58 = bs58.encode(publicKey);

        // Atomic: deactivate/delete old wallet and insert new wallet in one transaction.
        // Without this, a concurrent read between deactivation and insertion would see
        // the user with no active wallet.
        const [wallet] = await db.transaction(async (tx) => {
            if (existingWallet) {
                // Check if wallet acts as creator for any dagets
                const hasDagets = await tx.query.dagets.findFirst({
                    where: eq(dagets.creatorWalletId, existingWallet.id),
                });

                if (hasDagets) {
                    // Soft delete if dependencies exist
                    await tx.update(wallets)
                        .set({ isActive: false, rotatedAt: new Date() })
                        .where(eq(wallets.id, existingWallet.id));
                } else {
                    // Hard delete if no dependencies (exports will cascade)
                    await tx.delete(wallets)
                        .where(eq(wallets.id, existingWallet.id));
                }
            }

            return tx.insert(wallets).values({
                userId: user.id,
                publicKey: publicKeyBase58,
                encryptedPrivateKey: encrypted.ciphertext,
                encryptionScheme: encrypted.scheme,
                encryptionKeyRef: encrypted.keyRef,
                encryptionVersion: encrypted.version,
                isActive: true,
            }).returning();
        });

        // Zeroize secret key
        secretKey.fill(0);

        return NextResponse.json({
            wallet_id: wallet.id,
            public_key: wallet.publicKey,
        }, { status: 200 });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        console.error('Wallet generate error:', error);
        return Errors.internal();
    }
}
