import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ── Hoisted mock fns (available inside vi.mock factories) ── */

const {
    mockExecute,
    mockClaimsFindFirst,
    mockDagetsFindFirst,
    mockInsertValues,
    mockInsert,
    mockGetSignatureStatus,
    mockIncr,
    mockExpire,
    mockDel,
    mockConfirmClaim,
    mockLogInfo,
    mockLogWarn,
    mockLogError,
} = vi.hoisted(() => {
    const mockInsertValues = vi.fn();
    return {
        mockExecute: vi.fn(),
        mockClaimsFindFirst: vi.fn(),
        mockDagetsFindFirst: vi.fn(),
        mockInsertValues,
        mockInsert: vi.fn(() => ({ values: mockInsertValues })),
        mockGetSignatureStatus: vi.fn(),
        mockIncr: vi.fn(),
        mockExpire: vi.fn(),
        mockDel: vi.fn(),
        mockConfirmClaim: vi.fn(),
        mockLogInfo: vi.fn(),
        mockLogWarn: vi.fn(),
        mockLogError: vi.fn(),
    };
});

/* ── Module mocks ── */

vi.mock('@/db', () => ({
    db: {
        execute: (...args: unknown[]) => mockExecute(...args),
        query: {
            claims: { findFirst: (...args: unknown[]) => mockClaimsFindFirst(...args) },
            dagets: { findFirst: (...args: unknown[]) => mockDagetsFindFirst(...args) },
        },
        insert: (...args: unknown[]) => mockInsert(...args),
    },
}));

vi.mock('@/lib/solana', () => ({
    getSolanaConnection: vi.fn(() => ({
        getSignatureStatus: mockGetSignatureStatus,
    })),
}));

vi.mock('@/lib/redis', () => ({
    getRedis: vi.fn(() => ({
        incr: mockIncr,
        expire: mockExpire,
        del: mockDel,
    })),
    isRedisReady: vi.fn(() => true),
}));

vi.mock('../processor', () => ({
    confirmClaim: mockConfirmClaim,
}));

vi.mock('@/lib/logger', () => ({
    logger: {
        child: () => ({
            info: mockLogInfo,
            warn: mockLogWarn,
            error: mockLogError,
        }),
    },
}));

import { runReconciliation } from '../reconciliation';
import { isRedisReady } from '@/lib/redis';

/* ── Helpers ── */

function staleRow(overrides: Partial<{
    id: string;
    tx_signature: string | null;
    submitted_at: string;
    attempt_count: number;
}> = {}) {
    return {
        id: 'claim-1',
        tx_signature: 'sig-abc',
        submitted_at: new Date(Date.now() - 120_000).toISOString(),
        attempt_count: 0,
        ...overrides,
    };
}

function confirmedRow(overrides: Partial<{
    id: string;
    tx_signature: string;
}> = {}) {
    return {
        id: 'claim-c1',
        tx_signature: 'sig-confirmed',
        ...overrides,
    };
}

describe('reconciliation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(isRedisReady).mockReturnValue(true);
        mockIncr.mockResolvedValue(1);
        mockExpire.mockResolvedValue(1);
        mockDel.mockResolvedValue(1);
        mockConfirmClaim.mockResolvedValue(undefined);
        mockInsertValues.mockResolvedValue(undefined);
    });

    /* ──────────────────────────────────────────────────────────────
     * 1. Stale submitted claims — no tx_signature
     * ────────────────────────────────────────────────────────────── */
    describe('stale submitted claims — no tx_signature', () => {
        it('resets to failed_retryable with reconciliation: submitted_without_signature', async () => {
            const row = staleRow({ tx_signature: null });

            // stale query
            mockExecute.mockResolvedValueOnce([row]);
            // UPDATE for the claim
            mockExecute.mockResolvedValueOnce({ rowCount: 1 });
            // confirmed query
            mockExecute.mockResolvedValueOnce([]);
            // purge idempotency keys
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            await runReconciliation();

            // Should NOT check on-chain status
            expect(mockGetSignatureStatus).not.toHaveBeenCalled();
            // Should NOT call confirmClaim
            expect(mockConfirmClaim).not.toHaveBeenCalled();
            // 5 execute calls: stale query, UPDATE, confirmed query, 2x purge
            expect(mockExecute).toHaveBeenCalledTimes(5);
        });
    });

    /* ──────────────────────────────────────────────────────────────
     * 2. Stale submitted — finalized, no error → confirmClaim
     * ────────────────────────────────────────────────────────────── */
    describe('stale submitted claims — finalized, no error', () => {
        it('calls confirmClaim when tx is finalized without error', async () => {
            const row = staleRow({ tx_signature: 'sig-ok' });

            // stale query
            mockExecute.mockResolvedValueOnce([row]);
            // confirmed query
            mockExecute.mockResolvedValueOnce([]);
            // purge idempotency keys
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            mockGetSignatureStatus.mockResolvedValueOnce({
                value: { confirmationStatus: 'finalized', err: null },
            });

            await runReconciliation();

            expect(mockGetSignatureStatus).toHaveBeenCalledWith('sig-ok');
            expect(mockConfirmClaim).toHaveBeenCalledWith({ id: 'claim-1' });
        });
    });

    /* ──────────────────────────────────────────────────────────────
     * 3. Stale submitted — finalized with error → failed_retryable
     * ────────────────────────────────────────────────────────────── */
    describe('stale submitted claims — finalized with error', () => {
        it('sets failed_retryable with reconciliation: tx_error', async () => {
            const row = staleRow({ tx_signature: 'sig-err' });

            // stale query
            mockExecute.mockResolvedValueOnce([row]);
            // UPDATE for the claim
            mockExecute.mockResolvedValueOnce({ rowCount: 1 });
            // confirmed query
            mockExecute.mockResolvedValueOnce([]);
            // purge idempotency keys
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            mockGetSignatureStatus.mockResolvedValueOnce({
                value: { confirmationStatus: 'finalized', err: { InstructionError: [0, 'Custom'] } },
            });

            await runReconciliation();

            expect(mockGetSignatureStatus).toHaveBeenCalledWith('sig-err');
            expect(mockConfirmClaim).not.toHaveBeenCalled();
            // 5 execute calls: stale query, UPDATE (failed_retryable), confirmed query, 2x purge
            expect(mockExecute).toHaveBeenCalledTimes(5);
        });
    });

    /* ──────────────────────────────────────────────────────────────
     * 4. Not finalized, max attempts reached → failed_permanent
     * ────────────────────────────────────────────────────────────── */
    describe('stale submitted claims — not finalized, max attempts', () => {
        it('sets failed_permanent when attempt_count >= MAX_ATTEMPTS', async () => {
            const row = staleRow({ tx_signature: 'sig-stuck', attempt_count: 5 });

            // stale query
            mockExecute.mockResolvedValueOnce([row]);
            // UPDATE for the claim (failed_permanent)
            mockExecute.mockResolvedValueOnce({ rowCount: 1 });
            // confirmed query
            mockExecute.mockResolvedValueOnce([]);
            // purge idempotency keys
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            mockGetSignatureStatus.mockResolvedValueOnce({
                value: { confirmationStatus: 'processed' },
            });

            await runReconciliation();

            expect(mockGetSignatureStatus).toHaveBeenCalledWith('sig-stuck');
            expect(mockConfirmClaim).not.toHaveBeenCalled();
            expect(mockExecute).toHaveBeenCalledTimes(5);
        });

        it('treats attempt_count above MAX_ATTEMPTS as permanent failure', async () => {
            const row = staleRow({ tx_signature: 'sig-over', attempt_count: 10 });

            mockExecute.mockResolvedValueOnce([row]);
            mockExecute.mockResolvedValueOnce({ rowCount: 1 });
            mockExecute.mockResolvedValueOnce([]);
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            mockGetSignatureStatus.mockResolvedValueOnce({
                value: { confirmationStatus: 'confirmed' },
            });

            await runReconciliation();

            expect(mockConfirmClaim).not.toHaveBeenCalled();
        });
    });

    /* ──────────────────────────────────────────────────────────────
     * 5. Not finalized, attempts remaining → failed_retryable, increment
     * ────────────────────────────────────────────────────────────── */
    describe('stale submitted claims — not finalized, attempts remaining', () => {
        it('sets failed_retryable and increments attempt_count', async () => {
            const row = staleRow({ tx_signature: 'sig-retry', attempt_count: 2 });

            // stale query
            mockExecute.mockResolvedValueOnce([row]);
            // UPDATE for the claim (failed_retryable with attempt_count + 1)
            mockExecute.mockResolvedValueOnce({ rowCount: 1 });
            // confirmed query
            mockExecute.mockResolvedValueOnce([]);
            // purge idempotency keys
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            mockGetSignatureStatus.mockResolvedValueOnce({
                value: { confirmationStatus: 'processed' },
            });

            await runReconciliation();

            expect(mockGetSignatureStatus).toHaveBeenCalledWith('sig-retry');
            expect(mockConfirmClaim).not.toHaveBeenCalled();
            expect(mockExecute).toHaveBeenCalledTimes(5);
        });

        it('handles claim at exactly MAX_ATTEMPTS boundary', async () => {
            // attempt_count === 5 (== MAX_ATTEMPTS) → failed_permanent
            const rowAtMax = staleRow({ id: 'at-max', tx_signature: 'sig-max', attempt_count: 5 });
            // attempt_count === 4 (< MAX_ATTEMPTS) → failed_retryable
            const rowBelow = staleRow({ id: 'below-max', tx_signature: 'sig-below', attempt_count: 4 });

            // stale query returns both
            mockExecute.mockResolvedValueOnce([rowAtMax, rowBelow]);
            // UPDATE for rowAtMax (failed_permanent)
            mockExecute.mockResolvedValueOnce({ rowCount: 1 });
            // UPDATE for rowBelow (failed_retryable)
            mockExecute.mockResolvedValueOnce({ rowCount: 1 });
            // confirmed query
            mockExecute.mockResolvedValueOnce([]);
            // purge idempotency keys
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            mockGetSignatureStatus
                .mockResolvedValueOnce({ value: { confirmationStatus: 'processed' } })
                .mockResolvedValueOnce({ value: { confirmationStatus: 'processed' } });

            await runReconciliation();

            expect(mockGetSignatureStatus).toHaveBeenCalledTimes(2);
            expect(mockExecute).toHaveBeenCalledTimes(6);
        });
    });

    /* ──────────────────────────────────────────────────────────────
     * 6. RPC error during stale claim check → logs error, continues
     * ────────────────────────────────────────────────────────────── */
    describe('stale submitted claims — RPC error during check', () => {
        it('logs error and continues to next claim', async () => {
            const row1 = staleRow({ id: 'claim-rpc-fail', tx_signature: 'sig-fail' });
            const row2 = staleRow({ id: 'claim-ok', tx_signature: 'sig-ok2' });

            // stale query
            mockExecute.mockResolvedValueOnce([row1, row2]);
            // No UPDATE for row1 (errors during getSignatureStatus, caught)
            // confirmClaim for row2 (no direct execute for UPDATE in this path)
            // confirmed query
            mockExecute.mockResolvedValueOnce([]);
            // purge idempotency keys
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            mockGetSignatureStatus
                .mockRejectedValueOnce(new Error('RPC node unavailable'))
                .mockResolvedValueOnce({
                    value: { confirmationStatus: 'finalized', err: null },
                });

            await runReconciliation();

            // First claim: error logged
            expect(mockLogError).toHaveBeenCalledWith(
                expect.objectContaining({ claimId: 'claim-rpc-fail' }),
                'Error checking stale claim',
            );
            // Second claim: should still be processed
            expect(mockConfirmClaim).toHaveBeenCalledWith({ id: 'claim-ok' });
        });

        it('does not throw, allowing reconciliation to complete', async () => {
            const row = staleRow({ tx_signature: 'sig-rpc-err' });

            // stale query
            mockExecute.mockResolvedValueOnce([row]);
            // confirmed query
            mockExecute.mockResolvedValueOnce([]);
            // purge idempotency keys
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            mockGetSignatureStatus.mockRejectedValueOnce(new Error('timeout'));

            // Should not throw
            await expect(runReconciliation()).resolves.toBeUndefined();

            // Completion log should still fire
            expect(mockLogInfo).toHaveBeenCalledWith(
                expect.objectContaining({ staleCount: 1, confirmedCount: 0 }),
                'Reconciliation complete',
            );
        });
    });

    /* ──────────────────────────────────────────────────────────────
     * 7. Confirmed claims verification — on-chain OK → reset failure
     * ────────────────────────────────────────────────────────────── */
    describe('confirmed claims verification — on-chain OK', () => {
        it('resets failure counter via Redis del', async () => {
            const confirmed = confirmedRow({ id: 'claim-c1', tx_signature: 'sig-c1' });

            // stale query: none
            mockExecute.mockResolvedValueOnce([]);
            // confirmed query
            mockExecute.mockResolvedValueOnce([confirmed]);
            // purge idempotency keys
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            mockGetSignatureStatus.mockResolvedValueOnce({
                value: { confirmationStatus: 'finalized', err: null },
            });

            await runReconciliation();

            expect(mockGetSignatureStatus).toHaveBeenCalledWith('sig-c1');
            expect(mockDel).toHaveBeenCalledWith('reconciliation:fail:claim-c1');
            expect(mockIncr).not.toHaveBeenCalled();
        });
    });

    /* ──────────────────────────────────────────────────────────────
     * 8. Confirmed claims verification — on-chain issues → track failure
     * ────────────────────────────────────────────────────────────── */
    describe('confirmed claims verification — on-chain issues', () => {
        it('tracks failure via Redis incr when status.value is null', async () => {
            const confirmed = confirmedRow({ id: 'claim-issue' });

            // stale query: none
            mockExecute.mockResolvedValueOnce([]);
            // confirmed query
            mockExecute.mockResolvedValueOnce([confirmed]);
            // purge idempotency keys
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            mockGetSignatureStatus.mockResolvedValueOnce({ value: null });

            await runReconciliation();

            expect(mockLogWarn).toHaveBeenCalledWith(
                expect.objectContaining({ claimId: 'claim-issue' }),
                'Confirmed claim may have issues on-chain',
            );
            expect(mockIncr).toHaveBeenCalledWith('reconciliation:fail:claim-issue');
            expect(mockExpire).toHaveBeenCalledWith('reconciliation:fail:claim-issue', 86400);
        });

        it('tracks failure when status.value.err is truthy', async () => {
            const confirmed = confirmedRow({ id: 'claim-err' });

            // stale query: none
            mockExecute.mockResolvedValueOnce([]);
            // confirmed query
            mockExecute.mockResolvedValueOnce([confirmed]);
            // purge idempotency keys
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            mockGetSignatureStatus.mockResolvedValueOnce({
                value: { confirmationStatus: 'finalized', err: { InstructionError: [0] } },
            });

            await runReconciliation();

            expect(mockIncr).toHaveBeenCalledWith('reconciliation:fail:claim-err');
            expect(mockExpire).toHaveBeenCalledWith('reconciliation:fail:claim-err', 86400);
        });

        it('does not track failure on RPC network error (catch block)', async () => {
            const confirmed = confirmedRow({ id: 'claim-net-err' });

            // stale query: none
            mockExecute.mockResolvedValueOnce([]);
            // confirmed query
            mockExecute.mockResolvedValueOnce([confirmed]);
            // purge idempotency keys
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            mockGetSignatureStatus.mockRejectedValueOnce(new Error('network error'));

            await runReconciliation();

            // Network errors are caught silently — no Redis tracking
            expect(mockIncr).not.toHaveBeenCalled();
            expect(mockLogWarn).not.toHaveBeenCalled();
        });

        it('skips Redis tracking when Redis is not ready', async () => {
            vi.mocked(isRedisReady).mockReturnValue(false);
            const confirmed = confirmedRow({ id: 'claim-no-redis' });

            // stale query: none
            mockExecute.mockResolvedValueOnce([]);
            // confirmed query
            mockExecute.mockResolvedValueOnce([confirmed]);
            // purge idempotency keys
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            mockGetSignatureStatus.mockResolvedValueOnce({ value: null });

            await runReconciliation();

            // trackReconciliationFailure returns early when Redis not ready
            expect(mockIncr).not.toHaveBeenCalled();
        });
    });

    /* ──────────────────────────────────────────────────────────────
     * 9. Reconciliation alert — triggers at threshold with spam guard
     * ────────────────────────────────────────────────────────────── */
    describe('reconciliation alert', () => {
        it('creates notification when failure count reaches threshold (3)', async () => {
            const confirmed = confirmedRow({ id: 'claim-alert' });

            // stale query: none
            mockExecute.mockResolvedValueOnce([]);
            // confirmed query
            mockExecute.mockResolvedValueOnce([confirmed]);

            mockGetSignatureStatus.mockResolvedValueOnce({ value: null });

            // Redis incr returns exactly the threshold
            mockIncr.mockResolvedValueOnce(3);

            // createReconciliationAlert lookups:
            mockClaimsFindFirst.mockResolvedValueOnce({
                id: 'claim-alert',
                dagetId: 'daget-1',
            });
            mockDagetsFindFirst.mockResolvedValueOnce({
                id: 'daget-1',
                creatorUserId: 'user-1',
                name: 'Test Giveaway',
            });
            // Spam guard: no existing alert
            mockExecute.mockResolvedValueOnce([]);
            // Insert notification — already set up in beforeEach

            // purge idempotency keys
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            await runReconciliation();

            expect(mockInsert).toHaveBeenCalled();
            expect(mockInsertValues).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user-1',
                    type: 'claim_failed',
                    title: 'Reconciliation Alert',
                    relatedDagetId: 'daget-1',
                    relatedClaimId: 'claim-alert',
                }),
            );
        });

        it('does not create alert when count is below threshold', async () => {
            const confirmed = confirmedRow({ id: 'claim-below' });

            // stale query: none
            mockExecute.mockResolvedValueOnce([]);
            // confirmed query
            mockExecute.mockResolvedValueOnce([confirmed]);
            // purge idempotency keys
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            mockGetSignatureStatus.mockResolvedValueOnce({ value: null });
            mockIncr.mockResolvedValueOnce(2); // below threshold of 3

            await runReconciliation();

            // Should not look up claim/daget for alert
            expect(mockClaimsFindFirst).not.toHaveBeenCalled();
            expect(mockInsert).not.toHaveBeenCalled();
        });

        it('does not create alert when count exceeds threshold (already alerted)', async () => {
            const confirmed = confirmedRow({ id: 'claim-above' });

            // stale query: none
            mockExecute.mockResolvedValueOnce([]);
            // confirmed query
            mockExecute.mockResolvedValueOnce([confirmed]);
            // purge idempotency keys
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            mockGetSignatureStatus.mockResolvedValueOnce({ value: null });
            mockIncr.mockResolvedValueOnce(4); // above threshold

            await runReconciliation();

            // Alert only fires at exactly 3 (===), not above
            expect(mockClaimsFindFirst).not.toHaveBeenCalled();
            expect(mockInsert).not.toHaveBeenCalled();
        });

        it('respects spam guard — skips insert if alert already exists', async () => {
            const confirmed = confirmedRow({ id: 'claim-spam' });

            // stale query: none
            mockExecute.mockResolvedValueOnce([]);
            // confirmed query
            mockExecute.mockResolvedValueOnce([confirmed]);

            mockGetSignatureStatus.mockResolvedValueOnce({ value: null });
            mockIncr.mockResolvedValueOnce(3);

            mockClaimsFindFirst.mockResolvedValueOnce({
                id: 'claim-spam',
                dagetId: 'daget-2',
            });
            mockDagetsFindFirst.mockResolvedValueOnce({
                id: 'daget-2',
                creatorUserId: 'user-2',
                name: 'Another Giveaway',
            });
            // Spam guard: existing alert found
            mockExecute.mockResolvedValueOnce([{ 1: 1 }]);

            // purge idempotency keys
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            await runReconciliation();

            // insert should NOT be called because spam guard returned a row
            expect(mockInsert).not.toHaveBeenCalled();
        });

        it('does not create alert when claim lookup returns null', async () => {
            const confirmed = confirmedRow({ id: 'claim-missing' });

            // stale query: none
            mockExecute.mockResolvedValueOnce([]);
            // confirmed query
            mockExecute.mockResolvedValueOnce([confirmed]);

            mockGetSignatureStatus.mockResolvedValueOnce({ value: null });
            mockIncr.mockResolvedValueOnce(3);

            // claim not found
            mockClaimsFindFirst.mockResolvedValueOnce(null);

            // purge idempotency keys
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            await runReconciliation();

            expect(mockInsert).not.toHaveBeenCalled();
        });

        it('does not create alert when daget lookup returns null', async () => {
            const confirmed = confirmedRow({ id: 'claim-no-daget' });

            // stale query: none
            mockExecute.mockResolvedValueOnce([]);
            // confirmed query
            mockExecute.mockResolvedValueOnce([confirmed]);

            mockGetSignatureStatus.mockResolvedValueOnce({ value: null });
            mockIncr.mockResolvedValueOnce(3);

            mockClaimsFindFirst.mockResolvedValueOnce({
                id: 'claim-no-daget',
                dagetId: 'daget-gone',
            });
            // daget not found
            mockDagetsFindFirst.mockResolvedValueOnce(null);

            // purge idempotency keys
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            await runReconciliation();

            expect(mockInsert).not.toHaveBeenCalled();
        });
    });

    /* ──────────────────────────────────────────────────────────────
     * 10. purgeExpiredRecords — deletes expired idempotency keys + export tokens
     * ────────────────────────────────────────────────────────────── */
    describe('purgeExpiredRecords', () => {
        it('deletes expired idempotency keys and export tokens', async () => {
            // stale query: none
            mockExecute.mockResolvedValueOnce([]);
            // confirmed query: none
            mockExecute.mockResolvedValueOnce([]);
            // purge idempotency keys — deleted 42
            mockExecute.mockResolvedValueOnce({ rowCount: 42 });
            // purge export tokens — deleted 7
            mockExecute.mockResolvedValueOnce({ rowCount: 7 });

            await runReconciliation();

            // 4 execute calls: stale, confirmed, idemp purge, export purge
            expect(mockExecute).toHaveBeenCalledTimes(4);
            expect(mockLogInfo).toHaveBeenCalledWith(
                expect.objectContaining({ idempDeleted: 42, exportDeleted: 7 }),
                'Purged expired records',
            );
        });

        it('does not log when no records were purged', async () => {
            // stale query: none
            mockExecute.mockResolvedValueOnce([]);
            // confirmed query: none
            mockExecute.mockResolvedValueOnce([]);
            // purge idempotency keys — 0 deleted
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens — 0 deleted
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            await runReconciliation();

            // Should NOT have the 'Purged expired records' log
            const purgeLogCalls = mockLogInfo.mock.calls.filter(
                (call) => call[1] === 'Purged expired records',
            );
            expect(purgeLogCalls).toHaveLength(0);
        });

        it('handles purge errors gracefully without crashing reconciliation', async () => {
            // stale query: none
            mockExecute.mockResolvedValueOnce([]);
            // confirmed query: none
            mockExecute.mockResolvedValueOnce([]);
            // purge idempotency keys — throws
            mockExecute.mockRejectedValueOnce(new Error('DB connection lost'));

            // reconciliation should not throw
            await expect(runReconciliation()).resolves.toBeUndefined();

            expect(mockLogError).toHaveBeenCalledWith(
                expect.objectContaining({ err: expect.any(Error) }),
                'Failed to purge expired records',
            );

            // Completion log should still fire
            expect(mockLogInfo).toHaveBeenCalledWith(
                expect.objectContaining({ staleCount: 0, confirmedCount: 0 }),
                'Reconciliation complete',
            );
        });

        it('handles missing rowCount gracefully (defaults to 0)', async () => {
            // stale query: none
            mockExecute.mockResolvedValueOnce([]);
            // confirmed query: none
            mockExecute.mockResolvedValueOnce([]);
            // purge idempotency keys — no rowCount property
            mockExecute.mockResolvedValueOnce({});
            // purge export tokens — no rowCount property
            mockExecute.mockResolvedValueOnce({});

            await runReconciliation();

            // Should not log purge (both default to 0)
            const purgeLogCalls = mockLogInfo.mock.calls.filter(
                (call) => call[1] === 'Purged expired records',
            );
            expect(purgeLogCalls).toHaveLength(0);
        });
    });

    /* ──────────────────────────────────────────────────────────────
     * 11. runReconciliation — orchestrates all steps, logs summary
     * ────────────────────────────────────────────────────────────── */
    describe('runReconciliation — orchestration', () => {
        it('logs starting message and completion summary', async () => {
            // stale query: none
            mockExecute.mockResolvedValueOnce([]);
            // confirmed query: none
            mockExecute.mockResolvedValueOnce([]);
            // purge idempotency keys
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            await runReconciliation();

            expect(mockLogInfo).toHaveBeenCalledWith('Starting reconciliation run...');
            expect(mockLogInfo).toHaveBeenCalledWith(
                expect.objectContaining({ staleCount: 0, confirmedCount: 0 }),
                'Reconciliation complete',
            );
        });

        it('reports correct counts in summary', async () => {
            const stale1 = staleRow({ id: 's1', tx_signature: null });
            const stale2 = staleRow({ id: 's2', tx_signature: null });
            const conf1 = confirmedRow({ id: 'c1', tx_signature: 'sig-c1' });

            // stale query
            mockExecute.mockResolvedValueOnce([stale1, stale2]);
            // UPDATE for s1 (no sig)
            mockExecute.mockResolvedValueOnce({ rowCount: 1 });
            // UPDATE for s2 (no sig)
            mockExecute.mockResolvedValueOnce({ rowCount: 1 });
            // confirmed query
            mockExecute.mockResolvedValueOnce([conf1]);
            // purge idempotency keys
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            mockGetSignatureStatus.mockResolvedValueOnce({
                value: { confirmationStatus: 'finalized', err: null },
            });

            await runReconciliation();

            expect(mockLogInfo).toHaveBeenCalledWith(
                expect.objectContaining({ staleCount: 2, confirmedCount: 1 }),
                'Reconciliation complete',
            );
        });

        it('processes multiple stale and confirmed claims in one run', async () => {
            const staleNoSig = staleRow({ id: 'no-sig', tx_signature: null });
            const staleFinalized = staleRow({ id: 'finalized', tx_signature: 'sig-fin' });
            const staleTimeout = staleRow({ id: 'timeout', tx_signature: 'sig-to', attempt_count: 6 });

            const conf = confirmedRow({ id: 'conf-ok', tx_signature: 'sig-conf-ok' });

            // stale query
            mockExecute.mockResolvedValueOnce([staleNoSig, staleFinalized, staleTimeout]);
            // UPDATE for staleNoSig (no sig → failed_retryable)
            mockExecute.mockResolvedValueOnce({ rowCount: 1 });
            // staleFinalized → confirmClaim (no UPDATE execute call)
            // UPDATE for staleTimeout (failed_permanent)
            mockExecute.mockResolvedValueOnce({ rowCount: 1 });
            // confirmed query
            mockExecute.mockResolvedValueOnce([conf]);
            // purge idempotency keys
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            mockGetSignatureStatus
                // staleFinalized: finalized, no error
                .mockResolvedValueOnce({ value: { confirmationStatus: 'finalized', err: null } })
                // staleTimeout: not finalized
                .mockResolvedValueOnce({ value: { confirmationStatus: 'processed' } })
                // conf: on-chain OK
                .mockResolvedValueOnce({ value: { confirmationStatus: 'finalized', err: null } });

            await runReconciliation();

            expect(mockConfirmClaim).toHaveBeenCalledWith({ id: 'finalized' });
            expect(mockDel).toHaveBeenCalledWith('reconciliation:fail:conf-ok');
            expect(mockLogInfo).toHaveBeenCalledWith(
                expect.objectContaining({ staleCount: 3, confirmedCount: 1 }),
                'Reconciliation complete',
            );
        });

        it('handles empty results gracefully (nothing to reconcile)', async () => {
            // stale query: none
            mockExecute.mockResolvedValueOnce([]);
            // confirmed query: none
            mockExecute.mockResolvedValueOnce([]);
            // purge idempotency keys
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });
            // purge export tokens
            mockExecute.mockResolvedValueOnce({ rowCount: 0 });

            await runReconciliation();

            expect(mockGetSignatureStatus).not.toHaveBeenCalled();
            expect(mockConfirmClaim).not.toHaveBeenCalled();
            expect(mockIncr).not.toHaveBeenCalled();
            expect(mockDel).not.toHaveBeenCalled();
        });
    });
});
