import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { getSolanaConnection } from '@/lib/solana';

export async function POST(req: NextRequest) {
    try {
        const { address } = await req.json();

        if (!address || typeof address !== 'string') {
            return NextResponse.json({ valid: false, exists: false, message: 'Address is required' }, { status: 400 });
        }

        let pubkey: PublicKey;
        try {
            pubkey = new PublicKey(address);
        } catch {
            return NextResponse.json({ valid: false, exists: false, message: 'Invalid address format' });
        }

        if (!PublicKey.isOnCurve(pubkey.toBuffer())) {
            return NextResponse.json({ valid: false, exists: false, message: 'Address is not a valid wallet (off-curve)' });
        }

        // Check if account exists on-chain
        const connection = getSolanaConnection();
        const accountInfo = await connection.getAccountInfo(pubkey);

        if (!accountInfo) {
            return NextResponse.json({
                valid: true,
                exists: false,
                message: 'Address not found on blockchain (no transaction history). Please use an active wallet.'
            });
        }

        return NextResponse.json({
            valid: true,
            exists: true,
            message: 'Valid address'
        });

    } catch (error) {
        console.error('Validation error:', error);
        return NextResponse.json({ valid: false, exists: false, message: 'Validation failed' }, { status: 500 });
    }
}
