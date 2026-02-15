# Random Mode Claim Tests

This directory contains unit tests for the random mode claim amount calculation logic.

## Test Coverage

The test suite covers the random mode claim algorithm from [src/app/api/claims/route.ts:122-153](../route.ts#L122-L153).

### Test Categories

1. **Basic Random Distribution**
   - Verifies amounts stay within BPS (basis points) range
   - Tests custom BPS configurations
   - Validates the random distribution mechanism

2. **Safety Constraints**
   - Ensures sufficient tokens remain for future claimers
   - Guarantees minimum of 1 base unit per claim
   - Validates maxSafe calculation when pool is depleting

3. **Last Claimer Scenario**
   - Confirms last claimer receives all remaining tokens
   - Handles edge cases with minimal remainder

4. **Edge Cases**
   - Very small token pools
   - Large numbers (JavaScript MAX_SAFE_INTEGER)
   - Minimum BPS configurations
   - Equal min/max BPS (deterministic mode)

5. **Progressive Depletion**
   - Simulates complete distribution across all claimers
   - Validates total equals initial pool amount
   - Ensures all intermediate claims are valid

6. **BPS Validation**
   - Default BPS fallback behavior
   - Maximum BPS (10000 = 100%)
   - Range validation

7. **Statistical Properties**
   - Different random seeds produce different values
   - Results stay within calculated bounds
   - Distribution properties

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Algorithm Overview

The random mode distribution algorithm:

1. **Calculate remaining pool**: `remainingPool = totalAmount - usedAmount`

2. **For last claimer**: Return entire remaining pool

3. **For other claimers**:
   - Calculate min/max amounts based on BPS:
     - `minAmount = max(1, floor(remainingPool * minBps / 10000))`
     - `maxAmount = floor(remainingPool * maxBps / 10000)`
   - Calculate safety constraint:
     - `maxSafe = remainingPool - remainingClaimers`
   - Apply constraints:
     - `effectiveMax = min(maxAmount, maxSafe)`
     - `effectiveMin = min(minAmount, effectiveMax)`
   - Generate random amount within bounds:
     - `amount = effectiveMin + floor(random() * (range + 1))`
   - Return `max(1, amount)`

## Key Invariants

The algorithm maintains these critical invariants:

1. ✓ Every claim receives at least 1 base unit
2. ✓ Claims respect configured min/max BPS bounds
3. ✓ Enough tokens remain for all subsequent claimers
4. ✓ Last claimer gets exactly the remaining balance
5. ✓ Total distributed equals initial pool amount
6. ✓ All calculations use safe integers (no overflow)

## Test Data Examples

### BPS (Basis Points)
- 1 BPS = 0.01%
- 100 BPS = 1%
- 1000 BPS = 10%
- 5000 BPS = 50%
- 10000 BPS = 100%

### Typical Configuration
- Min: 100 BPS (1%)
- Max: 5000 BPS (50%)

### Example Scenario
```
Total: 1,000,000,000 base units (1000 USDC)
Winners: 10
Min BPS: 100 (1%)
Max BPS: 5000 (50%)

First claim possible range:
- Min: 10,000,000 (10 USDC = 1%)
- Max: 500,000,000 (500 USDC = 50%)
- Actual max: min(500M, 1B - 9) = 500M
```

## Mocking Strategy

Tests use deterministic mocking of `Math.random()` to ensure reproducible results:

```typescript
mockRandom(0);     // Minimum value
mockRandom(0.5);   // Middle value
mockRandom(0.999); // Near maximum value
```

This allows precise validation of boundary conditions and edge cases.

## Adding New Tests

When adding new test cases:

1. Use descriptive test names
2. Mock `Math.random()` for deterministic behavior
3. Verify both minimum and maximum bounds
4. Check invariants (especially >= 1 base unit)
5. Add comments explaining expected calculations
6. Reset mocks in `beforeEach` hook

## Related Files

- [vitest.config.ts](../../../../vitest.config.ts) - Vitest configuration
- [vitest.setup.ts](../../../../vitest.setup.ts) - Test setup
- [route.ts](../route.ts) - Implementation being tested
