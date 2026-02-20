/**
 * Token configuration per Solana cluster.
 * Server-set: never accept arbitrary mint/decimals from user input.
 */

type TokenInfo = {
    mint: string;
    decimals: number;
};

/** Sentinel mint for native SOL (no SPL token). */
export const NATIVE_SOL_MINT = 'native';

type ClusterTokens = {
    USDC: TokenInfo;
    USDT: TokenInfo;
    SOL: TokenInfo;
};

export const TOKEN_CONFIG: Record<string, ClusterTokens> = {
    'mainnet-beta': {
        USDC: {
            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            decimals: 6,
        },
        USDT: {
            mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
            decimals: 6,
        },
        SOL: {
            mint: NATIVE_SOL_MINT,
            decimals: 9,
        },
    },
};

export function getTokenConfig(symbol: 'USDC' | 'USDT' | 'SOL'): TokenInfo {
    let cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || process.env.SOLANA_CLUSTER || 'mainnet-beta';

    // Normalize cluster string
    const normalized = cluster.toLowerCase();
    if (normalized === 'mainnet' || normalized === 'mainnet-beta') {
        cluster = 'mainnet-beta';
    }

    const clusterTokens = TOKEN_CONFIG[cluster];
    if (!clusterTokens) {
        throw new Error(`Unknown SOLANA_CLUSTER: ${cluster}`);
    }
    return clusterTokens[symbol];
}

/**
 * Convert display dollar amount to base units.
 * E.g., "$10.50" with 6 decimals → 10500000
 */
export function displayToBaseUnits(displayAmount: string, decimals: number): number {
    const parsed = parseFloat(displayAmount);
    if (isNaN(parsed) || parsed <= 0) {
        throw new Error('Invalid display amount');
    }
    const baseUnits = Math.round(parsed * Math.pow(10, decimals));
    if (baseUnits > Number.MAX_SAFE_INTEGER) {
        throw new Error('Amount exceeds safe integer range');
    }
    return baseUnits;
}

/**
 * Convert base units to display dollar amount.
 * E.g., 10500000 with 6 decimals → "10.50"
 */
export function baseUnitsToDisplay(baseUnits: number, decimals: number): string {
    return (baseUnits / Math.pow(10, decimals)).toFixed(decimals > 2 ? 2 : decimals);
}
