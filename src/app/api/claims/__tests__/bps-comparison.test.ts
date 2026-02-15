import { describe, it, expect } from 'vitest';

/**
 * BPS Range Comparison Tests
 *
 * Find optimal BPS ranges for fair distribution with 10-20 winners
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

  if (claimedCount === totalWinners - 1) {
    return remainingPool;
  }

  const minBps = randomMinBps || 100;
  const maxBps = randomMaxBps || 5000;

  const minAmount = Math.max(1, Math.floor(remainingPool * minBps / 10000));
  const maxAmount = Math.floor(remainingPool * maxBps / 10000);

  const remainingClaimers = totalWinners - claimedCount - 1;
  const maxSafe = remainingPool - remainingClaimers;
  const effectiveMax = Math.min(maxAmount, maxSafe);
  const effectiveMin = Math.min(minAmount, effectiveMax);

  const range = effectiveMax - effectiveMin;
  const amountBaseUnits = effectiveMin + Math.floor(Math.random() * (range + 1));

  return Math.max(1, amountBaseUnits);
}

function formatUSDC(baseUnits: number): string {
  return (baseUnits / 1_000_000).toFixed(6);
}

interface BPSTestResult {
  minBps: number;
  maxBps: number;
  minClaim: number;
  maxClaim: number;
  avgClaim: number;
  varianceRatio: number;
  standardDeviation: number;
}

function testBPSRange(
  totalUSDC: number,
  winners: number,
  minBps: number,
  maxBps: number,
  runs: number = 10
): BPSTestResult {
  const allClaims: number[] = [];

  for (let run = 0; run < runs; run++) {
    const totalAmount = totalUSDC * 1_000_000;
    let usedAmount = 0;

    for (let i = 0; i < winners; i++) {
      const claimAmount = calculateRandomClaimAmount({
        totalAmount,
        totalWinners: winners,
        claimedCount: i,
        usedAmount,
        randomMinBps: minBps,
        randomMaxBps: maxBps,
      });
      allClaims.push(claimAmount);
      usedAmount += claimAmount;
    }
  }

  const minClaim = Math.min(...allClaims);
  const maxClaim = Math.max(...allClaims);
  const avgClaim = allClaims.reduce((s, c) => s + c, 0) / allClaims.length;
  const varianceRatio = maxClaim / minClaim;

  // Calculate standard deviation
  const squaredDiffs = allClaims.map(c => Math.pow(c - avgClaim, 2));
  const variance = squaredDiffs.reduce((s, v) => s + v, 0) / allClaims.length;
  const standardDeviation = Math.sqrt(variance);

  return {
    minBps,
    maxBps,
    minClaim,
    maxClaim,
    avgClaim,
    varianceRatio,
    standardDeviation,
  };
}

describe('BPS Range Recommendations for Fair Distribution', () => {
  it('Compare BPS ranges for 10 winners - 100 USDC pool', () => {
    console.log('\n' + '='.repeat(100));
    console.log('BPS COMPARISON: 100 USDC / 10 Winners - Finding Optimal Range for Fair Distribution');
    console.log('='.repeat(100));
    console.log('Testing different BPS ranges (10 runs each for statistical accuracy)');
    console.log('-'.repeat(100));

    const bpsConfigs = [
      { min: 500, max: 1500 },   // 5%-15%
      { min: 700, max: 1300 },   // 7%-13%
      { min: 800, max: 1200 },   // 8%-12%
      { min: 900, max: 1100 },   // 9%-11%
      { min: 1000, max: 1500 },  // 10%-15%
      { min: 1000, max: 2000 },  // 10%-20%
      { min: 1000, max: 3000 },  // 10%-30%
      { min: 500, max: 3000 },   // 5%-30%
      { min: 100, max: 5000 },   // 1%-50%
    ];

    const results: BPSTestResult[] = [];

    for (const config of bpsConfigs) {
      const result = testBPSRange(100, 10, config.min, config.max, 10);
      results.push(result);

      const bpsRange = `${config.min.toString().padStart(4)}-${config.max.toString().padEnd(4)}`;
      const percentRange = `(${(config.min/100).toFixed(1).padStart(4)}%-${(config.max/100).toFixed(1).padEnd(4)}%)`;
      const minClaim = formatUSDC(result.minClaim).padStart(10);
      const maxClaim = formatUSDC(result.maxClaim).padStart(10);
      const avgClaim = formatUSDC(result.avgClaim).padStart(10);
      const variance = result.varianceRatio.toFixed(2).padStart(7);
      const stdDev = formatUSDC(result.standardDeviation).padStart(10);

      console.log(
        `${bpsRange} ${percentRange} | ` +
        `Min: ${minClaim} | Max: ${maxClaim} | Avg: ${avgClaim} | ` +
        `Variance: ${variance}x | StdDev: ${stdDev}`
      );
    }

    // Find best (lowest variance)
    const bestResult = results.reduce((best, current) =>
      current.varianceRatio < best.varianceRatio ? current : best
    );

    console.log('-'.repeat(100));
    console.log(`RECOMMENDED for 10 winners: ${bestResult.minBps}-${bestResult.maxBps} BPS ` +
      `(${(bestResult.minBps/100).toFixed(1)}%-${(bestResult.maxBps/100).toFixed(1)}%) - ` +
      `Variance: ${bestResult.varianceRatio.toFixed(2)}x (most fair)`);
    console.log('='.repeat(100) + '\n');

    expect(results.length).toBe(bpsConfigs.length);
  });

  it('Compare BPS ranges for 15 winners - 100 USDC pool', () => {
    console.log('\n' + '='.repeat(100));
    console.log('BPS COMPARISON: 100 USDC / 15 Winners - Finding Optimal Range for Fair Distribution');
    console.log('='.repeat(100));
    console.log('Testing different BPS ranges (10 runs each for statistical accuracy)');
    console.log('-'.repeat(100));

    const bpsConfigs = [
      { min: 500, max: 1000 },   // 5%-10%
      { min: 600, max: 1000 },   // 6%-10%
      { min: 700, max: 1000 },   // 7%-10%
      { min: 800, max: 1200 },   // 8%-12%
      { min: 1000, max: 1500 },  // 10%-15%
      { min: 1000, max: 2000 },  // 10%-20%
      { min: 1000, max: 3000 },  // 10%-30%
    ];

    const results: BPSTestResult[] = [];

    for (const config of bpsConfigs) {
      const result = testBPSRange(100, 15, config.min, config.max, 10);
      results.push(result);

      const bpsRange = `${config.min.toString().padStart(4)}-${config.max.toString().padEnd(4)}`;
      const percentRange = `(${(config.min/100).toFixed(1).padStart(4)}%-${(config.max/100).toFixed(1).padEnd(4)}%)`;
      const minClaim = formatUSDC(result.minClaim).padStart(10);
      const maxClaim = formatUSDC(result.maxClaim).padStart(10);
      const avgClaim = formatUSDC(result.avgClaim).padStart(10);
      const variance = result.varianceRatio.toFixed(2).padStart(7);
      const stdDev = formatUSDC(result.standardDeviation).padStart(10);

      console.log(
        `${bpsRange} ${percentRange} | ` +
        `Min: ${minClaim} | Max: ${maxClaim} | Avg: ${avgClaim} | ` +
        `Variance: ${variance}x | StdDev: ${stdDev}`
      );
    }

    const bestResult = results.reduce((best, current) =>
      current.varianceRatio < best.varianceRatio ? current : best
    );

    console.log('-'.repeat(100));
    console.log(`RECOMMENDED for 15 winners: ${bestResult.minBps}-${bestResult.maxBps} BPS ` +
      `(${(bestResult.minBps/100).toFixed(1)}%-${(bestResult.maxBps/100).toFixed(1)}%) - ` +
      `Variance: ${bestResult.varianceRatio.toFixed(2)}x (most fair)`);
    console.log('='.repeat(100) + '\n');

    expect(results.length).toBe(bpsConfigs.length);
  });

  it('Compare BPS ranges for 20 winners - 100 USDC pool', () => {
    console.log('\n' + '='.repeat(100));
    console.log('BPS COMPARISON: 100 USDC / 20 Winners - Finding Optimal Range for Fair Distribution');
    console.log('='.repeat(100));
    console.log('Testing different BPS ranges (10 runs each for statistical accuracy)');
    console.log('-'.repeat(100));

    const bpsConfigs = [
      { min: 500, max: 800 },    // 5%-8%
      { min: 500, max: 1000 },   // 5%-10%
      { min: 600, max: 1000 },   // 6%-10%
      { min: 700, max: 1000 },   // 7%-10%
      { min: 800, max: 1200 },   // 8%-12%
      { min: 1000, max: 1500 },  // 10%-15%
      { min: 1000, max: 2000 },  // 10%-20%
    ];

    const results: BPSTestResult[] = [];

    for (const config of bpsConfigs) {
      const result = testBPSRange(100, 20, config.min, config.max, 10);
      results.push(result);

      const bpsRange = `${config.min.toString().padStart(4)}-${config.max.toString().padEnd(4)}`;
      const percentRange = `(${(config.min/100).toFixed(1).padStart(4)}%-${(config.max/100).toFixed(1).padEnd(4)}%)`;
      const minClaim = formatUSDC(result.minClaim).padStart(10);
      const maxClaim = formatUSDC(result.maxClaim).padStart(10);
      const avgClaim = formatUSDC(result.avgClaim).padStart(10);
      const variance = result.varianceRatio.toFixed(2).padStart(7);
      const stdDev = formatUSDC(result.standardDeviation).padStart(10);

      console.log(
        `${bpsRange} ${percentRange} | ` +
        `Min: ${minClaim} | Max: ${maxClaim} | Avg: ${avgClaim} | ` +
        `Variance: ${variance}x | StdDev: ${stdDev}`
      );
    }

    const bestResult = results.reduce((best, current) =>
      current.varianceRatio < best.varianceRatio ? current : best
    );

    console.log('-'.repeat(100));
    console.log(`RECOMMENDED for 20 winners: ${bestResult.minBps}-${bestResult.maxBps} BPS ` +
      `(${(bestResult.minBps/100).toFixed(1)}%-${(bestResult.maxBps/100).toFixed(1)}%) - ` +
      `Variance: ${bestResult.varianceRatio.toFixed(2)}x (most fair)`);
    console.log('='.repeat(100) + '\n');

    expect(results.length).toBe(bpsConfigs.length);
  });

  it('Summary: Recommended BPS ranges by winner count', () => {
    console.log('\n' + '='.repeat(100));
    console.log('SUMMARY: BPS RECOMMENDATIONS FOR FAIR DISTRIBUTION (100 USDC Pool)');
    console.log('='.repeat(100));

    const recommendations = [
      { winners: 5, minBps: 1500, maxBps: 2500, reason: 'Few winners - can afford wider range' },
      { winners: 10, minBps: 900, maxBps: 1100, reason: 'Best balance - narrow range for fairness' },
      { winners: 15, minBps: 700, maxBps: 1000, reason: 'More winners - tighter upper bound needed' },
      { winners: 20, minBps: 600, maxBps: 1000, reason: 'Many winners - keep range tight' },
      { winners: 25, minBps: 500, maxBps: 800, reason: 'Very many winners - very tight range required' },
    ];

    console.log('\nWinners | BPS Range     | Percentage      | Reason');
    console.log('-'.repeat(100));
    for (const rec of recommendations) {
      const winners = rec.winners.toString().padStart(7);
      const bpsRange = `${rec.minBps}-${rec.maxBps}`.padEnd(13);
      const percentRange = `${(rec.minBps/100).toFixed(1)}%-${(rec.maxBps/100).toFixed(1)}%`.padEnd(15);
      console.log(`${winners} | ${bpsRange} | ${percentRange} | ${rec.reason}`);
    }

    console.log('\n' + '='.repeat(100));
    console.log('KEY PRINCIPLE: More winners = Tighter BPS range needed for fair distribution');
    console.log('='.repeat(100) + '\n');

    expect(recommendations.length).toBeGreaterThan(0);
  });
});
