# Random Claim Tests - Quick Reference

## 🚀 Quick Commands

```bash
# See detailed claim logs for all scenarios
npm run test:run -- random-claim-simulation

# Run all tests
npm run test:run

# Watch mode (auto-rerun on changes)
npm test

# Specific scenario only
npm run test:run -- -t "Scenario 1"

# With UI (interactive)
npm run test:ui
```

## 📊 What You'll See

### Claim Format
```
User X claimed AMOUNT USDC (X% of total, Y% of remaining) | Pool: BEFORE → AFTER USDC
```

- **X% of total** = Amount / Original Pool
- **Y% of remaining** = Amount / Pool When They Claimed

### Summary Stats
```
Total claimed:   [Should equal pool]
Average claim:   [Total / Winners]
Smallest claim:  [Minimum received]
Largest claim:   [Maximum received]
Variance ratio:  [Largest / Smallest]
```

## 🎯 Scenarios at a Glance

| Scenario | Pool | Winners | BPS Range | Variance |
|----------|------|---------|-----------|----------|
| 1. Typical | 1000 | 10 | 1%-50% | High |
| 2. Generous | 5000 | 20 | 5%-30% | Medium |
| 3. Conservative | 100 | 5 | 10%-20% | Low |
| 4. High Variance | 2000 | 15 | 1%-60% | Very High |
| 5. Micro Pool | 10 | 25 | 1%-10% | Constrained |
| 6. Equal | 1000 | 10 | 10%-10% | None |
| 7. Whale | 10000 | 50 | 0.5%-40% | Extreme |
| 8. Tight | 50 | 100 | 0.5%-2% | Very Low |

## 💡 BPS Cheat Sheet

| BPS | % | Example on 1000 USDC |
|-----|---|---------------------|
| 50 | 0.5% | 5 USDC |
| 100 | 1% | 10 USDC |
| 500 | 5% | 50 USDC |
| 1000 | 10% | 100 USDC |
| 2000 | 20% | 200 USDC |
| 3000 | 30% | 300 USDC |
| 5000 | 50% | 500 USDC |
| 10000 | 100% | 1000 USDC |

## ✅ What Tests Verify

- [x] Each claim ≥ 1 base unit
- [x] Amounts within BPS bounds
- [x] Enough left for future claimers
- [x] Last claimer gets all remainder
- [x] Sum equals original pool
- [x] No math overflow

## 🔍 Reading the Logs

### Good Distribution (Scenario 3)
```
User 1: 12.41% of total
User 2:  8.84% of total
User 3: 11.97% of total
User 4:  9.95% of total
User 5: 56.83% of total ← Last claimer gets remainder
Variance ratio: 6.43x ← Low variance = Fair
```

### High Variance (Scenario 4)
```
User 1: 41.66% of total ← Lucky!
User 2: 13.70% of total
...
User 15: 0.30% of total ← Small claim
Variance ratio: 557.92x ← High variance = Exciting
```

## 🎲 Randomness Notes

- Each run produces different results
- Core tests use mocked random (deterministic)
- Simulation tests use real random (varies)
- Algorithm ensures fairness within constraints
- Last claimer always gets remainder (100% of what's left)

## 📈 Interpreting Variance Ratio

- **< 10x**: Very fair distribution
- **10-50x**: Moderate variance
- **50-100x**: High variance (exciting)
- **> 100x**: Extreme variance (whales possible)

## 🛠️ Customizing Tests

Add your own scenario:

```typescript
simulateRandomClaims(
  500,   // Total USDC
  8,     // Winners
  200,   // Min BPS (2%)
  3500,  // Max BPS (35%)
  'My Custom Scenario'
);
```

## 📚 More Info

- [TESTING.md](../../../../TESTING.md) - Full guide
- [TEST_SUMMARY.md](../../../../TEST_SUMMARY.md) - Complete overview
- [README.md](./README.md) - Technical details

## 🎯 Pro Tips

1. **Lower BPS range** = More equal distribution
2. **Higher BPS max** = More variance (exciting)
3. **More winners** = More constrained by safety reserves
4. **Smaller pool** = Less flexibility in amounts
5. **Last claimer** often gets lucky (gets remainder)

## 🔗 Quick Links

- Source code: [route.ts:122-153](../../route.ts#L122-L153)
- Unit tests: [random-mode-claim.test.ts](./random-mode-claim.test.ts)
- Simulations: [random-claim-simulation.test.ts](./random-claim-simulation.test.ts)
