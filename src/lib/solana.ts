import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    TransactionInstruction,
    sendAndConfirmTransaction,
    SystemProgram,
    clusterApiUrl,
} from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountIdempotentInstruction,
    createTransferCheckedInstruction,
    getAccount,
    TokenAccountNotFoundError,
} from '@solana/spl-token';

/**
 * Get a Solana connection instance.
 */
export function getSolanaConnection(): Connection {
    const cluster = (process.env.SOLANA_CLUSTER || 'devnet') as 'mainnet-beta' | 'devnet';
    const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl(cluster);
    return new Connection(rpcUrl, 'finalized');
}

/**
 * Derive Associated Token Account (ATA) for a wallet + mint.
 */
export async function deriveATA(
    owner: PublicKey,
    mint: PublicKey,
): Promise<PublicKey> {
    return getAssociatedTokenAddress(mint, owner, true);
}

/**
 * Build a claim transaction:
 * 1. Create ATA for claimant if needed (rent paid by creator wallet)
 * 2. transferChecked from creator ATA → claimant ATA
 */
export async function buildClaimTransaction(params: {
    creatorKeypair: Keypair;
    claimantAddress: PublicKey;
    mintAddress: PublicKey;
    tokenDecimals: number;
    amountBaseUnits: number;
    connection: Connection;
}): Promise<Transaction> {
    const { creatorKeypair, claimantAddress, mintAddress, tokenDecimals, amountBaseUnits, connection } = params;

    const creatorATA = await deriveATA(creatorKeypair.publicKey, mintAddress);
    const claimantATA = await deriveATA(claimantAddress, mintAddress);

    const instructions: TransactionInstruction[] = [];

    // Create claimant ATA if it doesn't exist (idempotent — won't fail if already exists)
    // ATA rent is paid by creator wallet per blueprint §4.4 step 6
    instructions.push(
        createAssociatedTokenAccountIdempotentInstruction(
            creatorKeypair.publicKey, // payer
            claimantATA,              // ata
            claimantAddress,          // owner
            mintAddress,              // mint
        )
    );

    // Transfer tokens
    instructions.push(
        createTransferCheckedInstruction(
            creatorATA,                        // source
            mintAddress,                       // mint
            claimantATA,                       // destination
            creatorKeypair.publicKey,          // owner/signer
            BigInt(amountBaseUnits),           // amount
            tokenDecimals,                     // decimals
        )
    );

    const tx = new Transaction().add(...instructions);

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = creatorKeypair.publicKey;

    return tx;
}

/**
 * Estimate per-claim fee in lamports.
 * base_fee + priority_fee, with 30% safety margin.
 */
export async function estimateClaimFee(
    connection: Connection,
    creatorPublicKey: PublicKey,
    mintAddress: PublicKey,
): Promise<number> {
    // Build a sample transferChecked message for fee estimation
    const sampleATA = await deriveATA(creatorPublicKey, mintAddress);

    const sampleIxs = [
        createAssociatedTokenAccountIdempotentInstruction(
            creatorPublicKey, sampleATA, creatorPublicKey, mintAddress,
        ),
        createTransferCheckedInstruction(
            sampleATA, mintAddress, sampleATA, creatorPublicKey,
            BigInt(1), 6,
        ),
    ];

    const tx = new Transaction().add(...sampleIxs);
    const { blockhash } = await connection.getLatestBlockhash('finalized');
    tx.recentBlockhash = blockhash;
    tx.feePayer = creatorPublicKey;

    const message = tx.compileMessage();
    const baseFee = await connection.getFeeForMessage(message, 'finalized');

    // Get priority fee estimate
    let priorityFee = 0;
    try {
        const fees = await connection.getRecentPrioritizationFees();
        if (fees.length > 0) {
            // Use median priority fee, capped at 50000 lamports
            const sorted = fees.map(f => f.prioritizationFee).sort((a, b) => a - b);
            priorityFee = Math.min(sorted[Math.floor(sorted.length / 2)], 50000);
        }
    } catch {
        // Ignore priority fee errors
    }

    const totalFee = (baseFee.value || 5000) + priorityFee;
    // 30% safety margin per blueprint
    return Math.ceil(totalFee * 1.30);
}

/**
 * Check SOL balance of a wallet.
 */
export async function getSolBalance(
    connection: Connection,
    publicKey: PublicKey,
): Promise<number> {
    return connection.getBalance(publicKey);
}

/**
 * Check SPL token balance.
 */
export async function getTokenBalance(
    connection: Connection,
    owner: PublicKey,
    mint: PublicKey,
): Promise<number> {
    try {
        const ata = await deriveATA(owner, mint);
        const account = await getAccount(connection, ata);
        return Number(account.amount);
    } catch (e) {
        if (e instanceof TokenAccountNotFoundError) return 0;
        throw e;
    }
}
