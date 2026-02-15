import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for Random Mode Claim logic
 *
 * Tests the random mode claim amount calculation algorithm from
 * src/app/api/claims/route.ts (lines 122-153)
 *
 * The random mode distributes tokens randomly within a configured range
 * while ensuring:
 * 1. Each claim gets at least 1 base unit
 * 2. Amounts stay within min/max BPS bounds
 * 3. Enough tokens remain for subsequent claimers
 * 4. The last claimer gets all remaining tokens
 */

// Mock random number generator for deterministic tests
const mockRandom = (value: number) => {
  vi.spyOn(Math, 'random').mockReturnValue(value);
};

const resetRandom = () => {
  vi.restoreAllMocks();
};

interface RandomClaimParams {
  totalAmount: number;
  totalWinners: number;
  claimedCount: number;
  usedAmount: number;
  randomMinBps: number;
  randomMaxBps: number;
}

/**
 * Calculate random claim amount using the algorithm from route.ts
 * This is extracted for unit testing purposes
 */
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

  // Last claimer gets everything remaining
  if (claimedCount === totalWinners - 1) {
    return remainingPool;
  }

  const minBps = randomMinBps || 100;
  const maxBps = randomMaxBps || 5000;

  // Calculate min/max amounts based on BPS
  const minAmount = Math.max(1, Math.floor(remainingPool * minBps / 10000));
  const maxAmount = Math.floor(remainingPool * maxBps / 10000);

  // Ensure enough remains for subsequent claimers (each needs >= 1)
  const remainingClaimers = totalWinners - claimedCount - 1;
  const maxSafe = remainingPool - remainingClaimers;
  const effectiveMax = Math.min(maxAmount, maxSafe);
  const effectiveMin = Math.min(minAmount, effectiveMax);

  // Random between effectiveMin and effectiveMax
  const range = effectiveMax - effectiveMin;
  const amountBaseUnits = effectiveMin + Math.floor(Math.random() * (range + 1));

  return Math.max(1, amountBaseUnits);
}

describe('Random Mode Claim Amount Calculation', () => {
  beforeEach(() => {
    resetRandom();
  });

  describe('Basic random distribution', () => {
    it('should calculate amount within BPS range for first claim', () => {
      // 1000 USDC (6 decimals) = 1,000,000,000 base units
      // 10 winners, min 1% (100 bps), max 50% (5000 bps)
      const params: RandomClaimParams = {
        totalAmount: 1_000_000_000,
        totalWinners: 10,
        claimedCount: 0,
        usedAmount: 0,
        randomMinBps: 100,
        randomMaxBps: 5000,
      };

      // Min: 1% of 1B = 10M
      // Max: 50% of 1B = 500M
      // But maxSafe = 1B - 9 remaining = 999,999,991
      // So effectiveMax = min(500M, 999,999,991) = 500M

      mockRandom(0); // Should give minimum
      const minResult = calculateRandomClaimAmount(params);
      expect(minResult).toBe(10_000_000);

      mockRandom(0.5); // Should give middle
      const midResult = calculateRandomClaimAmount(params);
      expect(midResult).toBeGreaterThanOrEqual(10_000_000);
      expect(midResult).toBeLessThanOrEqual(500_000_000);

      mockRandom(0.999); // Should give near maximum
      const maxResult = calculateRandomClaimAmount(params);
      expect(maxResult).toBeLessThanOrEqual(500_000_000);
      expect(maxResult).toBeGreaterThan(400_000_000);
    });

    it('should respect custom BPS range', () => {
      // Testing with 5%-20% range (500-2000 bps)
      const params: RandomClaimParams = {
        totalAmount: 1_000_000,
        totalWinners: 5,
        claimedCount: 0,
        usedAmount: 0,
        randomMinBps: 500,  // 5%
        randomMaxBps: 2000, // 20%
      };

      mockRandom(0);
      const minResult = calculateRandomClaimAmount(params);
      // Min: 5% of 1M = 50,000
      expect(minResult).toBe(50_000);

      mockRandom(0.999);
      const maxResult = calculateRandomClaimAmount(params);
      // Max: 20% of 1M = 200,000, but maxSafe = 1M - 4 = 999,996
      // effectiveMax = min(200,000, 999,996) = 200,000
      expect(maxResult).toBeLessThanOrEqual(200_000);
    });
  });

  describe('Safety constraints', () => {
    it('should ensure enough tokens remain for future claimers', () => {
      // 100 units, 10 winners, 8th claim
      const params: RandomClaimParams = {
        totalAmount: 100,
        totalWinners: 10,
        claimedCount: 7,
        usedAmount: 90,
        randomMinBps: 100,
        randomMaxBps: 5000,
      };

      // Remaining pool: 10
      // Remaining claimers: 10 - 7 - 1 = 2 (need at least 2 units reserved)
      // maxSafe = 10 - 2 = 8
      // maxAmount = floor(10 * 5000 / 10000) = 5
      // effectiveMax = min(5, 8) = 5
      // minAmount = max(1, floor(10 * 100 / 10000)) = max(1, 0) = 1

      mockRandom(0.999);
      const result = calculateRandomClaimAmount(params);
      expect(result).toBeLessThanOrEqual(8); // Can't exceed maxSafe
      expect(result).toBeGreaterThanOrEqual(1); // At least 1
    });

    it('should guarantee minimum of 1 base unit', () => {
      // Very small remaining pool
      const params: RandomClaimParams = {
        totalAmount: 10,
        totalWinners: 5,
        claimedCount: 0,
        usedAmount: 0,
        randomMinBps: 1, // 0.01%
        randomMaxBps: 10, // 0.1%
      };

      mockRandom(0);
      const result = calculateRandomClaimAmount(params);
      expect(result).toBeGreaterThanOrEqual(1);
    });

    it('should handle case where maxSafe is less than calculated max', () => {
      // Near the end with tight constraints
      const params: RandomClaimParams = {
        totalAmount: 1000,
        totalWinners: 100,
        claimedCount: 95,
        usedAmount: 990,
        randomMinBps: 100,  // 1%
        randomMaxBps: 5000, // 50%
      };

      // Remaining pool: 10
      // Remaining claimers: 4
      // maxSafe = 10 - 4 = 6
      // maxAmount = floor(10 * 5000 / 10000) = 5
      // effectiveMax = min(5, 6) = 5

      mockRandom(0.999);
      const result = calculateRandomClaimAmount(params);
      expect(result).toBeLessThanOrEqual(6); // Respects maxSafe
      expect(result).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Last claimer scenario', () => {
    it('should give all remaining tokens to last claimer', () => {
      const params: RandomClaimParams = {
        totalAmount: 1_000_000,
        totalWinners: 10,
        claimedCount: 9, // Last claimer
        usedAmount: 850_000,
        randomMinBps: 100,
        randomMaxBps: 5000,
      };

      const result = calculateRandomClaimAmount(params);
      // Should get exactly what's left
      expect(result).toBe(150_000);
    });

    it('should handle last claimer with minimal remainder', () => {
      const params: RandomClaimParams = {
        totalAmount: 100,
        totalWinners: 10,
        claimedCount: 9,
        usedAmount: 99,
        randomMinBps: 100,
        randomMaxBps: 5000,
      };

      const result = calculateRandomClaimAmount(params);
      expect(result).toBe(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle very small pools', () => {
      // Total pool is 10 base units for 5 winners
      const params: RandomClaimParams = {
        totalAmount: 10,
        totalWinners: 5,
        claimedCount: 0,
        usedAmount: 0,
        randomMinBps: 100,
        randomMaxBps: 5000,
      };

      mockRandom(0.5);
      const result = calculateRandomClaimAmount(params);
      // Min: max(1, floor(10 * 100 / 10000)) = max(1, 0) = 1
      // Max: floor(10 * 5000 / 10000) = 5
      // maxSafe: 10 - 4 = 6
      // effectiveMax: min(5, 6) = 5
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(5);
    });

    it('should handle large numbers safely', () => {
      // Test with JavaScript MAX_SAFE_INTEGER constraints
      const params: RandomClaimParams = {
        totalAmount: 9_007_199_254_740_991, // MAX_SAFE_INTEGER
        totalWinners: 100,
        claimedCount: 0,
        usedAmount: 0,
        randomMinBps: 10,
        randomMaxBps: 1000,
      };

      mockRandom(0.5);
      const result = calculateRandomClaimAmount(params);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(Number.isSafeInteger(result)).toBe(true);
    });

    it('should handle minimum BPS edge case', () => {
      const params: RandomClaimParams = {
        totalAmount: 1_000_000,
        totalWinners: 10,
        claimedCount: 0,
        usedAmount: 0,
        randomMinBps: 1,    // 0.01%
        randomMaxBps: 10000, // 100%
      };

      mockRandom(0);
      const minResult = calculateRandomClaimAmount(params);
      // Min: max(1, floor(1M * 1 / 10000)) = max(1, 100) = 100
      expect(minResult).toBe(100);
    });

    it('should handle equal min and max BPS', () => {
      const params: RandomClaimParams = {
        totalAmount: 1_000_000,
        totalWinners: 10,
        claimedCount: 0,
        usedAmount: 0,
        randomMinBps: 1000,
        randomMaxBps: 1000, // Same as min
      };

      const result = calculateRandomClaimAmount(params);
      // When min === max, should get exactly that amount
      const expectedAmount = Math.floor(1_000_000 * 1000 / 10000);
      expect(result).toBe(expectedAmount);
    });
  });

  describe('Progressive depletion', () => {
    it('should maintain valid distribution across multiple claims', () => {
      let totalAmount = 1_000_000;
      const totalWinners = 10;
      let usedAmount = 0;
      const claims: number[] = [];

      // Simulate 9 claims (10th will be last)
      for (let i = 0; i < 9; i++) {
        mockRandom(0.5); // Use consistent random for reproducibility

        const claimAmount = calculateRandomClaimAmount({
          totalAmount,
          totalWinners,
          claimedCount: i,
          usedAmount,
          randomMinBps: 100,
          randomMaxBps: 3000,
        });

        claims.push(claimAmount);
        usedAmount += claimAmount;

        // Verify each claim is valid
        expect(claimAmount).toBeGreaterThanOrEqual(1);
        expect(claimAmount).toBeLessThanOrEqual(totalAmount - usedAmount + claimAmount);
      }

      // Last claim gets remainder
      const lastClaim = calculateRandomClaimAmount({
        totalAmount,
        totalWinners,
        claimedCount: 9,
        usedAmount,
        randomMinBps: 100,
        randomMaxBps: 3000,
      });

      claims.push(lastClaim);

      // Verify total distribution
      const totalClaimed = claims.reduce((sum, amt) => sum + amt, 0);
      expect(totalClaimed).toBe(totalAmount);
      expect(claims).toHaveLength(totalWinners);

      // All claims should be positive
      claims.forEach(claim => {
        expect(claim).toBeGreaterThanOrEqual(1);
      });
    });

    it('should display detailed claim logs with percentages - 1000 USDC / 10 winners', () => {
      console.log('\n' + '='.repeat(80));
      console.log('RANDOM CLAIM SIMULATION: 1000 USDC (1,000,000,000 base units) / 10 winners');
      console.log('BPS Range: 100-5000 (1%-50%)');
      console.log('='.repeat(80));

      const totalAmount = 1_000_000_000; // 1000 USDC with 6 decimals
      const totalWinners = 10;
      const randomMinBps = 100;
      const randomMaxBps = 5000;
      let usedAmount = 0;
      const claims: Array<{ user: number; amount: number; percentage: number; poolBefore: number }> = [];

      // Use actual random for realistic distribution
      resetRandom();

      for (let i = 0; i < totalWinners; i++) {
        const poolBefore = totalAmount - usedAmount;

        const claimAmount = calculateRandomClaimAmount({
          totalAmount,
          totalWinners,
          claimedCount: i,
          usedAmount,
          randomMinBps,
          randomMaxBps,
        });

        const percentage = (claimAmount / totalAmount) * 100;
        const percentageOfRemaining = (claimAmount / poolBefore) * 100;

        claims.push({
          user: i + 1,
          amount: claimAmount,
          percentage,
          poolBefore,
        });

        // Format numbers with proper decimals (USDC has 6 decimals)
        const amountUSDC = (claimAmount / 1_000_000).toFixed(6);
        const poolBeforeUSDC = (poolBefore / 1_000_000).toFixed(2);
        const poolAfterUSDC = ((poolBefore - claimAmount) / 1_000_000).toFixed(2);

        console.log(
          `User ${i + 1} claimed ${amountUSDC} USDC (${percentage.toFixed(2)}% of total, ` +
          `${percentageOfRemaining.toFixed(2)}% of remaining) | ` +
          `Pool: ${poolBeforeUSDC} → ${poolAfterUSDC} USDC`
        );

        usedAmount += claimAmount;

        // Verify each claim is valid
        expect(claimAmount).toBeGreaterThanOrEqual(1);
      }

      console.log('-'.repeat(80));
      const totalClaimed = claims.reduce((sum, c) => sum + c.amount, 0);
      const totalPercentage = claims.reduce((sum, c) => sum + c.percentage, 0);
      console.log(`Total claimed: ${(totalClaimed / 1_000_000).toFixed(6)} USDC (${totalPercentage.toFixed(2)}%)`);
      console.log(`Total pool: ${(totalAmount / 1_000_000).toFixed(2)} USDC`);
      console.log(`Remaining: ${((totalAmount - totalClaimed) / 1_000_000).toFixed(6)} USDC`);
      console.log('='.repeat(80) + '\n');

      // Verify total distribution
      expect(totalClaimed).toBe(totalAmount);
      expect(claims).toHaveLength(totalWinners);
    });

    it('should display detailed claim logs - 100 USDC / 5 winners', () => {
      console.log('\n' + '='.repeat(80));
      console.log('RANDOM CLAIM SIMULATION: 100 USDC (100,000,000 base units) / 5 winners');
      console.log('BPS Range: 500-2500 (5%-25%)');
      console.log('='.repeat(80));

      const totalAmount = 100_000_000; // 100 USDC with 6 decimals
      const totalWinners = 5;
      const randomMinBps = 500;  // 5%
      const randomMaxBps = 2500; // 25%
      let usedAmount = 0;
      const claims: Array<{ user: number; amount: number; percentage: number; poolBefore: number }> = [];

      resetRandom();

      for (let i = 0; i < totalWinners; i++) {
        const poolBefore = totalAmount - usedAmount;

        const claimAmount = calculateRandomClaimAmount({
          totalAmount,
          totalWinners,
          claimedCount: i,
          usedAmount,
          randomMinBps,
          randomMaxBps,
        });

        const percentage = (claimAmount / totalAmount) * 100;
        const percentageOfRemaining = (claimAmount / poolBefore) * 100;

        claims.push({
          user: i + 1,
          amount: claimAmount,
          percentage,
          poolBefore,
        });

        const amountUSDC = (claimAmount / 1_000_000).toFixed(6);
        const poolBeforeUSDC = (poolBefore / 1_000_000).toFixed(2);
        const poolAfterUSDC = ((poolBefore - claimAmount) / 1_000_000).toFixed(2);

        console.log(
          `User ${i + 1} claimed ${amountUSDC} USDC (${percentage.toFixed(2)}% of total, ` +
          `${percentageOfRemaining.toFixed(2)}% of remaining) | ` +
          `Pool: ${poolBeforeUSDC} → ${poolAfterUSDC} USDC`
        );

        usedAmount += claimAmount;

        expect(claimAmount).toBeGreaterThanOrEqual(1);
      }

      console.log('-'.repeat(80));
      const totalClaimed = claims.reduce((sum, c) => sum + c.amount, 0);
      const totalPercentage = claims.reduce((sum, c) => sum + c.percentage, 0);
      console.log(`Total claimed: ${(totalClaimed / 1_000_000).toFixed(6)} USDC (${totalPercentage.toFixed(2)}%)`);
      console.log(`Total pool: ${(totalAmount / 1_000_000).toFixed(2)} USDC`);
      console.log(`Remaining: ${((totalAmount - totalClaimed) / 1_000_000).toFixed(6)} USDC`);
      console.log('='.repeat(80) + '\n');

      expect(totalClaimed).toBe(totalAmount);
      expect(claims).toHaveLength(totalWinners);
    });

    it('should display detailed claim logs - Small pool: 10 USDC / 20 winners', () => {
      console.log('\n' + '='.repeat(80));
      console.log('RANDOM CLAIM SIMULATION: 10 USDC (10,000,000 base units) / 20 winners');
      console.log('BPS Range: 100-1000 (1%-10%)');
      console.log('='.repeat(80));

      const totalAmount = 10_000_000; // 10 USDC with 6 decimals
      const totalWinners = 20;
      const randomMinBps = 100;  // 1%
      const randomMaxBps = 1000; // 10%
      let usedAmount = 0;
      const claims: Array<{ user: number; amount: number; percentage: number; poolBefore: number }> = [];

      resetRandom();

      for (let i = 0; i < totalWinners; i++) {
        const poolBefore = totalAmount - usedAmount;

        const claimAmount = calculateRandomClaimAmount({
          totalAmount,
          totalWinners,
          claimedCount: i,
          usedAmount,
          randomMinBps,
          randomMaxBps,
        });

        const percentage = (claimAmount / totalAmount) * 100;
        const percentageOfRemaining = (claimAmount / poolBefore) * 100;

        claims.push({
          user: i + 1,
          amount: claimAmount,
          percentage,
          poolBefore,
        });

        const amountUSDC = (claimAmount / 1_000_000).toFixed(6);
        const poolBeforeUSDC = (poolBefore / 1_000_000).toFixed(6);
        const poolAfterUSDC = ((poolBefore - claimAmount) / 1_000_000).toFixed(6);

        console.log(
          `User ${(i + 1).toString().padStart(2)} claimed ${amountUSDC} USDC (${percentage.toFixed(2)}% of total, ` +
          `${percentageOfRemaining.toFixed(2)}% of remaining) | ` +
          `Pool: ${poolBeforeUSDC} → ${poolAfterUSDC} USDC`
        );

        usedAmount += claimAmount;

        expect(claimAmount).toBeGreaterThanOrEqual(1);
      }

      console.log('-'.repeat(80));
      const totalClaimed = claims.reduce((sum, c) => sum + c.amount, 0);
      const totalPercentage = claims.reduce((sum, c) => sum + c.percentage, 0);
      console.log(`Total claimed: ${(totalClaimed / 1_000_000).toFixed(6)} USDC (${totalPercentage.toFixed(2)}%)`);
      console.log(`Total pool: ${(totalAmount / 1_000_000).toFixed(2)} USDC`);
      console.log(`Remaining: ${((totalAmount - totalClaimed) / 1_000_000).toFixed(6)} USDC`);
      console.log('='.repeat(80) + '\n');

      expect(totalClaimed).toBe(totalAmount);
      expect(claims).toHaveLength(totalWinners);
    });
  });

  describe('BPS validation', () => {
    it('should use default BPS when not provided', () => {
      const params: RandomClaimParams = {
        totalAmount: 1_000_000,
        totalWinners: 10,
        claimedCount: 0,
        usedAmount: 0,
        randomMinBps: 0, // Will use default 100
        randomMaxBps: 0, // Will use default 5000
      };

      mockRandom(0);
      const result = calculateRandomClaimAmount(params);
      // Default min: 100 bps (1%)
      const expectedMin = Math.max(1, Math.floor(1_000_000 * 100 / 10000));
      expect(result).toBeGreaterThanOrEqual(expectedMin);
    });

    it('should handle maximum BPS of 10000 (100%)', () => {
      const params: RandomClaimParams = {
        totalAmount: 1_000,
        totalWinners: 2,
        claimedCount: 0,
        usedAmount: 0,
        randomMinBps: 5000,  // 50%
        randomMaxBps: 10000, // 100%
      };

      mockRandom(0.999);
      const result = calculateRandomClaimAmount(params);
      // maxAmount = floor(1000 * 10000 / 10000) = 1000
      // maxSafe = 1000 - 1 = 999
      // effectiveMax = min(1000, 999) = 999
      expect(result).toBeLessThanOrEqual(999);
    });
  });

  describe('Statistical distribution properties', () => {
    it('should produce different values with different random seeds', () => {
      const params: RandomClaimParams = {
        totalAmount: 1_000_000,
        totalWinners: 10,
        claimedCount: 0,
        usedAmount: 0,
        randomMinBps: 100,
        randomMaxBps: 5000,
      };

      mockRandom(0.1);
      const result1 = calculateRandomClaimAmount(params);

      mockRandom(0.9);
      const result2 = calculateRandomClaimAmount(params);

      expect(result1).not.toBe(result2);
    });

    it('should stay within calculated bounds', () => {
      const params: RandomClaimParams = {
        totalAmount: 10_000_000,
        totalWinners: 20,
        claimedCount: 5,
        usedAmount: 2_000_000,
        randomMinBps: 500,
        randomMaxBps: 2500,
      };

      const remainingPool = params.totalAmount - params.usedAmount;
      const minAmount = Math.max(1, Math.floor(remainingPool * 500 / 10000));
      const maxAmount = Math.floor(remainingPool * 2500 / 10000);
      const remainingClaimers = params.totalWinners - params.claimedCount - 1;
      const maxSafe = remainingPool - remainingClaimers;
      const effectiveMax = Math.min(maxAmount, maxSafe);

      // Test multiple random values
      for (let r = 0; r <= 1; r += 0.1) {
        mockRandom(r);
        const result = calculateRandomClaimAmount(params);
        expect(result).toBeGreaterThanOrEqual(minAmount);
        expect(result).toBeLessThanOrEqual(effectiveMax);
      }
    });
  });
});
