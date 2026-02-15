import { describe, it, expect } from 'vitest';

/**
 * Random Claim Simulation Tests
 *
 * These tests demonstrate the random mode claim distribution with detailed logging.
 * Run with: npm run test:run -- random-claim-simulation
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

function formatUSDC(baseUnits: number, decimals: number = 6): string {
  return (baseUnits / Math.pow(10, decimals)).toFixed(decimals);
}

function simulateRandomClaims(
  totalUSDC: number,
  winners: number,
  minBps: number,
  maxBps: number,
  title: string
) {
  console.log('\n' + '='.repeat(90));
  console.log(title);
  console.log(`Total Pool: ${totalUSDC} USDC | Winners: ${winners} | BPS Range: ${minBps}-${maxBps} (${(minBps / 100).toFixed(2)}%-${(maxBps / 100).toFixed(2)}%)`);
  console.log('='.repeat(90));

  const totalAmount = totalUSDC * 1_000_000; // Convert to base units
  let usedAmount = 0;
  const claims: number[] = [];

  for (let i = 0; i < winners; i++) {
    const poolBefore = totalAmount - usedAmount;

    const claimAmount = calculateRandomClaimAmount({
      totalAmount,
      totalWinners: winners,
      claimedCount: i,
      usedAmount,
      randomMinBps: minBps,
      randomMaxBps: maxBps,
    });

    claims.push(claimAmount);

    const percentOfTotal = (claimAmount / totalAmount) * 100;
    const percentOfRemaining = (claimAmount / poolBefore) * 100;
    const amountUSDC = formatUSDC(claimAmount);
    const poolBeforeUSDC = formatUSDC(poolBefore, 2);
    const poolAfterUSDC = formatUSDC(poolBefore - claimAmount, 2);

    const userNum = `User ${(i + 1).toString().padStart(2)}`;
    const claimInfo = `claimed ${amountUSDC.padStart(12)} USDC`;
    const percentInfo = `(${percentOfTotal.toFixed(2).padStart(5)}% of total, ${percentOfRemaining.toFixed(2).padStart(6)}% of remaining)`;
    const poolInfo = `Pool: ${poolBeforeUSDC.padStart(12)} → ${poolAfterUSDC.padStart(12)} USDC`;

    console.log(`${userNum} ${claimInfo} ${percentInfo} | ${poolInfo}`);

    usedAmount += claimAmount;
  }

  console.log('-'.repeat(90));
  const totalClaimed = claims.reduce((sum, amt) => sum + amt, 0);
  const avgClaim = totalClaimed / claims.length;
  const minClaim = Math.min(...claims);
  const maxClaim = Math.max(...claims);

  console.log(`Total claimed:   ${formatUSDC(totalClaimed)} USDC (100%)`);
  console.log(`Average claim:   ${formatUSDC(avgClaim)} USDC (${((avgClaim / totalAmount) * 100).toFixed(2)}%)`);
  console.log(`Smallest claim:  ${formatUSDC(minClaim)} USDC (${((minClaim / totalAmount) * 100).toFixed(2)}%)`);
  console.log(`Largest claim:   ${formatUSDC(maxClaim)} USDC (${((maxClaim / totalAmount) * 100).toFixed(2)}%)`);
  console.log(`Variance ratio:  ${(maxClaim / minClaim).toFixed(2)}x`);
  console.log('='.repeat(90) + '\n');

  expect(totalClaimed).toBe(totalAmount);
  return claims;
}

describe('Random Claim Distribution Simulations', () => {
  it('Scenario 1: Typical Daget - 100 USDC / 10 winners (10%-30%)', () => {
    simulateRandomClaims(
      100,   // 100 USDC
      10,    // 10 winners
      1000,  // 10% min
      3000,  // 30% max
      'SCENARIO 1: Typical Daget - Moderate Pool, Few Winners, Medium Range'
    );
  });

  it('Scenario 2: Typical Daget - 100 USDC / 25 winners (10%-15%)', () => {
    simulateRandomClaims(
      100,   // 100 USDC
      10,    // 25 winners
      1000,  // 10% min
      9500,  // 15% max (recommended for fair distribution)
      'SCENARIO 2: Typical Daget - Moderate Pool, Many Winners, Fair Range'
    );
  });

  it('Scenario 3: Conservative Daget - 100 USDC / 5 winners (10%-20%)', () => {
    simulateRandomClaims(
      100,   // 100 USDC
      5,     // 5 winners
      1000,  // 10% min
      2000,  // 20% max
      'SCENARIO 3: Conservative Daget - Small Pool, Few Winners, Tight Range'
    );
  });

  it('Scenario 4: High Variance - 2000 USDC / 15 winners (1%-60%)', () => {
    simulateRandomClaims(
      2000,  // 2000 USDC
      15,    // 15 winners
      100,   // 1% min
      6000,  // 60% max
      'SCENARIO 4: High Variance - Large Pool, Moderate Winners, Extreme Range'
    );
  });

  it('Scenario 5: Micro Pool - 10 USDC / 25 winners (1%-10%)', () => {
    simulateRandomClaims(
      10,    // 10 USDC
      25,    // 25 winners
      100,   // 1% min
      1000,  // 10% max
      'SCENARIO 5: Micro Pool - Tiny Pool, Many Winners, Constrained Range'
    );
  });

  it('Scenario 6: Equal Distribution - 1000 USDC / 10 winners (10%-10%)', () => {
    simulateRandomClaims(
      1000,  // 1000 USDC
      10,    // 10 winners
      1000,  // 10% min
      1000,  // 10% max (same as min = deterministic)
      'SCENARIO 6: Equal Distribution - Fixed 10% per claim (no randomness)'
    );
  });

  it('Scenario 7: Whale vs Minnows - 10000 USDC / 50 winners (0.5%-40%)', () => {
    simulateRandomClaims(
      10000, // 10000 USDC
      50,    // 50 winners
      50,    // 0.5% min
      4000,  // 40% max
      'SCENARIO 7: Whale vs Minnows - Huge Pool, Many Winners, Extreme Variance'
    );
  });

  it('Scenario 8: Tight Budget - 50 USDC / 100 winners (0.5%-2%)', () => {
    simulateRandomClaims(
      50,    // 50 USDC
      100,   // 100 winners
      50,    // 0.5% min
      200,   // 2% max
      'SCENARIO 8: Tight Budget - Small Pool, Very Many Winners, Very Tight Range'
    );
  });
});

describe('Statistical Analysis', () => {
  it('should show distribution statistics across multiple runs', () => {
    console.log('\n' + '='.repeat(90));
    console.log('STATISTICAL ANALYSIS: 5 runs of 100 USDC / 10 winners (10%-30%)');
    console.log('='.repeat(90));

    const runs = 5;
    const allRuns: number[][] = [];

    for (let run = 0; run < runs; run++) {
      const totalAmount = 100 * 1_000_000;
      const totalWinners = 10;
      let usedAmount = 0;
      const claims: number[] = [];

      for (let i = 0; i < totalWinners; i++) {
        const claimAmount = calculateRandomClaimAmount({
          totalAmount,
          totalWinners,
          claimedCount: i,
          usedAmount,
          randomMinBps: 1000,
          randomMaxBps: 3000,
        });
        claims.push(claimAmount);
        usedAmount += claimAmount;
      }

      allRuns.push(claims);

      const min = Math.min(...claims);
      const max = Math.max(...claims);
      const avg = claims.reduce((s, c) => s + c, 0) / claims.length;

      console.log(
        `Run ${run + 1}: ` +
        `Min: ${formatUSDC(min).padStart(12)} | ` +
        `Max: ${formatUSDC(max).padStart(12)} | ` +
        `Avg: ${formatUSDC(avg).padStart(12)} | ` +
        `Range: ${(max / min).toFixed(2)}x`
      );
    }

    console.log('-'.repeat(90));

    // Calculate overall statistics
    const allClaims = allRuns.flat();
    const overallMin = Math.min(...allClaims);
    const overallMax = Math.max(...allClaims);
    const overallAvg = allClaims.reduce((s, c) => s + c, 0) / allClaims.length;

    console.log(`Overall across ${runs} runs (${allClaims.length} total claims):`);
    console.log(`  Smallest claim ever:  ${formatUSDC(overallMin)} USDC`);
    console.log(`  Largest claim ever:   ${formatUSDC(overallMax)} USDC`);
    console.log(`  Average claim:        ${formatUSDC(overallAvg)} USDC`);
    console.log(`  Max variance:         ${(overallMax / overallMin).toFixed(2)}x`);
    console.log('='.repeat(90) + '\n');

    expect(allRuns).toHaveLength(runs);
  });
});
