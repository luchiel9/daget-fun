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

// Singleton to avoid creating a new HTTP connection on every call
const globalForSolana = globalThis as unknown as { _solanaConnection: Connection | undefined };

/**
 * Get a Solana connection instance (singleton).
 */
export function getSolanaConnection(): Connection {
    if (!globalForSolana._solanaConnection) {
        const cluster = (process.env.SOLANA_CLUSTER || 'mainnet-beta') as 'mainnet-beta';
        const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl(cluster);
        globalForSolana._solanaConnection = new Connection(rpcUrl, 'finalized');
    }
    return globalForSolana._solanaConnection;
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
 * - Native SOL: SystemProgram.transfer from creator to claimant.
 * - SPL (USDC/USDT): Create ATA for claimant if needed, then transferChecked from creator ATA → claimant ATA.
 */
export async function buildClaimTransaction(params: {
    creatorKeypair: Keypair;
    claimantAddress: PublicKey;
    mintAddress: PublicKey;
    tokenDecimals: number;
    amountBaseUnits: number;
    connection: Connection;
    isNativeSol?: boolean;
}): Promise<Transaction> {
    const { creatorKeypair, claimantAddress, mintAddress, tokenDecimals, amountBaseUnits, connection, isNativeSol } = params;

    const instructions: TransactionInstruction[] = [];

    if (isNativeSol) {
        // Native SOL: simple transfer (lamports)
        instructions.push(
            SystemProgram.transfer({
                fromPubkey: creatorKeypair.publicKey,
                toPubkey: claimantAddress,
                lamports: amountBaseUnits,
            })
        );
    } else {
        const creatorATA = await deriveATA(creatorKeypair.publicKey, mintAddress);
        const claimantATA = await deriveATA(claimantAddress, mintAddress);

        // Create claimant ATA if it doesn't exist (idempotent — won't fail if already exists)
        instructions.push(
            createAssociatedTokenAccountIdempotentInstruction(
                creatorKeypair.publicKey,
                claimantATA,
                claimantAddress,
                mintAddress,
            )
        );

        instructions.push(
            createTransferCheckedInstruction(
                creatorATA,
                mintAddress,
                claimantATA,
                creatorKeypair.publicKey,
                BigInt(amountBaseUnits),
                tokenDecimals,
            )
        );
    }

    const tx = new Transaction().add(...instructions);

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = creatorKeypair.publicKey;

    return tx;
}

/**
 * Estimate per-claim fee in lamports.
 * base_fee + priority_fee, with 30% safety margin.
 * For native SOL claims the tx is a single transfer (smaller); for SPL we use ATA + transferChecked.
 */
export async function estimateClaimFee(
    connection: Connection,
    creatorPublicKey: PublicKey,
    mintAddress: PublicKey,
    isNativeSol?: boolean,
): Promise<number> {
    let sampleIxs: TransactionInstruction[];

    if (isNativeSol) {
        sampleIxs = [
            SystemProgram.transfer({
                fromPubkey: creatorPublicKey,
                toPubkey: creatorPublicKey, // dummy destination for size estimate
                lamports: 1,
            }),
        ];
    } else {
        const sampleATA = await deriveATA(creatorPublicKey, mintAddress);
        sampleIxs = [
            createAssociatedTokenAccountIdempotentInstruction(
                creatorPublicKey, sampleATA, creatorPublicKey, mintAddress,
            ),
            createTransferCheckedInstruction(
                sampleATA, mintAddress, sampleATA, creatorPublicKey,
                BigInt(1), 6,
            ),
        ];
    }

    const tx = new Transaction().add(...sampleIxs);
    const { blockhash } = await connection.getLatestBlockhash('finalized');
    tx.recentBlockhash = blockhash;
    tx.feePayer = creatorPublicKey;

    const message = tx.compileMessage();
    const baseFee = await connection.getFeeForMessage(message, 'finalized');

    let priorityFee = 0;
    try {
        const fees = await connection.getRecentPrioritizationFees();
        if (fees.length > 0) {
            const sorted = fees.map(f => f.prioritizationFee).sort((a, b) => a - b);
            priorityFee = Math.min(sorted[Math.floor(sorted.length / 2)], 50000);
        }
    } catch {
        // Ignore priority fee errors
    }

    const totalFee = (baseFee.value || 5000) + priorityFee;
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

/**
 * Check if a wallet has an Associated Token Account for the given mint.
 * Returns true if ATA exists, false otherwise.
 */
export async function checkAtaExists(
    connection: Connection,
    owner: PublicKey,
    mint: PublicKey,
): Promise<boolean> {
    try {
        const ata = await deriveATA(owner, mint);
        await getAccount(connection, ata);
        return true;
    } catch (e) {
        if (e instanceof TokenAccountNotFoundError) return false;
        throw e;
    }
}
