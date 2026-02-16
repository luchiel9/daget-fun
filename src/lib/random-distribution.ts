
/**
 * Random Claim Simulation Logic
 * Ported from src/app/api/claims/__tests__/random-claim-simulation.test.ts for frontend use.
 */

interface RandomClaimParams {
    totalAmount: number;
    totalWinners: number;
    claimedCount: number;
    usedAmount: number;
    randomMinBps: number;
    randomMaxBps: number;
}

function calculateRandomClaimAmount(params: RandomClaimParams): number {
    const {
        totalAmount,
        totalWinners,
        claimedCount,
        usedAmount,
        randomMinBps,
        randomMaxBps,
    } = params;

    const remainingPool = totalAmount - usedAmount;
    const remainingClaimers = totalWinners - claimedCount;

    if (remainingClaimers === 1) {
        return remainingPool;
    }

    // Fair Share Algorithm
    const fairShare = Math.floor(remainingPool / remainingClaimers);

    const minBps = randomMinBps || 0;
    const maxBps = randomMaxBps || 0;

    const varianceBps = Math.max(0, maxBps - minBps);
    const varianceFactor = varianceBps / 10000;

    const randomScalar = (Math.random() * 2) - 1;
    const fluctuation = Math.floor(fairShare * varianceFactor * randomScalar);

    let amountBaseUnits = fairShare + fluctuation;

    amountBaseUnits = Math.max(1, amountBaseUnits);

    const claimsLeftAfterThis = remainingClaimers - 1;
    const maxSafe = remainingPool - claimsLeftAfterThis;

    amountBaseUnits = Math.min(amountBaseUnits, maxSafe);

    return amountBaseUnits;
}

function formatAmount(baseUnits: number, decimals: number = 6): string {
    return (baseUnits / Math.pow(10, decimals)).toFixed(2);
}

export interface SimulationResult {
    min: string;
    max: string;
    avg: string;
}

export function simulateRandomClaims(
    amount: number,
    winners: number,
    minPercent: number, // 0-100
    maxPercent: number  // 0-100
): SimulationResult {
    if (winners <= 0 || amount <= 0) {
        return { min: '0.00', max: '0.00', avg: '0.00' };
    }

    const minBps = Math.floor(minPercent * 100);
    const maxBps = Math.floor(maxPercent * 100);

    // Convert amount to base units (assuming 6 decimals for USDC/USDT)
    // We use 6 decimals for calculation precision, similar to the backend test
    const decimals = 6;
    const totalAmountBase = Math.floor(amount * Math.pow(10, decimals));

    const iterations = 5; // Run simulation 5 times to get a good range estimate
    let allClaims: number[] = [];

    for (let run = 0; run < iterations; run++) {
        let usedAmount = 0;
        for (let i = 0; i < winners; i++) {
            const claimAmount = calculateRandomClaimAmount({
                totalAmount: totalAmountBase,
                totalWinners: winners,
                claimedCount: i,
                usedAmount: usedAmount,
                randomMinBps: minBps,
                randomMaxBps: maxBps,
            });
            allClaims.push(claimAmount);
            usedAmount += claimAmount;
        }
    }

    if (allClaims.length === 0) {
        return { min: '0.00', max: '0.00', avg: '0.00' };
    }

    const minOutcome = Math.min(...allClaims);
    const maxOutcome = Math.max(...allClaims);
    const avgOutcome = allClaims.reduce((a, b) => a + b, 0) / allClaims.length;

    return {
        min: formatAmount(minOutcome, decimals),
        max: formatAmount(maxOutcome, decimals),
        avg: formatAmount(avgOutcome, decimals),
    };
}
