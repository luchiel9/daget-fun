import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Errors } from '@/lib/errors';
import { db } from '@/db';
import { wallets } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSolanaConnection, getSolBalance, getTokenBalance, deriveATA } from '@/lib/solana';
import { getTokenConfig, baseUnitsToDisplay } from '@/lib/tokens';
import { PublicKey } from '@solana/web3.js';

export async function GET() {
    try {
        const user = await requireAuth();

        // Get active wallet
        const wallet = await db.query.wallets.findFirst({
            where: and(eq(wallets.userId, user.id), eq(wallets.isActive, true)),
        });

        if (!wallet) {
            return Errors.notFound('Wallet');
        }

        const connection = getSolanaConnection();
        const publicKey = new PublicKey(wallet.publicKey);

        // Fetch balances in parallel
        const usdcConfig = getTokenConfig('USDC');
        const usdtConfig = getTokenConfig('USDT');

        const [solBalance, usdcBalance, usdtBalance] = await Promise.all([
            getSolBalance(connection, publicKey),
            getTokenBalance(connection, publicKey, new PublicKey(usdcConfig.mint)),
            getTokenBalance(connection, publicKey, new PublicKey(usdtConfig.mint)),
        ]);

        return NextResponse.json({
            wallet_public_key: wallet.publicKey,
            sol_base_units: solBalance,
            usdc_base_units: usdcBalance,
            usdt_base_units: usdtBalance,
            sol: (solBalance / 1e9).toFixed(9),
            usdc: baseUnitsToDisplay(usdcBalance, usdcConfig.decimals),
            usdt: baseUnitsToDisplay(usdtBalance, usdtConfig.decimals),
            updated_at: new Date().toISOString(),
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        console.error('Wallet balances error:', error);
        return Errors.internal();
    }
}
