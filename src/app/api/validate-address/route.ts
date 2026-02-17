import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { getSolanaConnection, checkAtaExists } from '@/lib/solana';

export async function POST(req: NextRequest) {
    try {
        const { address, tokenMint } = await req.json();

        if (!address || typeof address !== 'string') {
            return NextResponse.json({ valid: false, exists: false, hasAta: false, message: 'Address is required' }, { status: 400 });
        }

        let pubkey: PublicKey;
        try {
            pubkey = new PublicKey(address);
        } catch {
            return NextResponse.json({ valid: false, exists: false, hasAta: false, message: 'Invalid address format' });
        }

        if (!PublicKey.isOnCurve(pubkey.toBuffer())) {
            return NextResponse.json({ valid: false, exists: false, hasAta: false, message: 'Address is not a valid wallet (off-curve)' });
        }

        // Check if account exists on-chain
        const connection = getSolanaConnection();
        const accountInfo = await connection.getAccountInfo(pubkey);

        if (!accountInfo) {
            return NextResponse.json({
                valid: true,
                exists: false,
                hasAta: false,
                message: 'Address not found on blockchain (no transaction history). Please use an active wallet.'
            });
        }

        // Check if wallet has an ATA for the specified token
        let hasAta = false;
        if (tokenMint && typeof tokenMint === 'string') {
            try {
                const mintPubkey = new PublicKey(tokenMint);
                hasAta = await checkAtaExists(connection, pubkey, mintPubkey);
            } catch {
                // If mint is invalid, skip ATA check
            }
        }

        return NextResponse.json({
            valid: true,
            exists: true,
            hasAta,
            message: hasAta ? 'Valid address' : 'Valid address but no token account found'
        });

    } catch (error) {
        console.error('Validation error:', error);
        return NextResponse.json({ valid: false, exists: false, hasAta: false, message: 'Validation failed' }, { status: 500 });
    }
}
