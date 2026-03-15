import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ClaimRow } from '../types';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockExecute = vi.fn();
const mockDagetsFindFirst = vi.fn();
const mockWalletsFindFirst = vi.fn();
const mockUsersFindFirst = vi.fn();
const mockClaimsFindFirst = vi.fn();
const mockInsertValues = vi.fn();
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

vi.mock('@/db', () => ({
    db: {
        execute: (...args: unknown[]) => mockExecute(...args),
        query: {
            dagets: { findFirst: (...args: unknown[]) => mockDagetsFindFirst(...args) },
            wallets: { findFirst: (...args: unknown[]) => mockWalletsFindFirst(...args) },
            users: { findFirst: (...args: unknown[]) => mockUsersFindFirst(...args) },
            claims: { findFirst: (...args: unknown[]) => mockClaimsFindFirst(...args) },
        },
        insert: (...args: unknown[]) => mockInsert(...args),
    },
}));

vi.mock('@/db/schema', () => ({
    claims: { id: 'id' },
    dagets: { id: 'id' },
    wallets: { id: 'id' },
    users: { id: 'id' },
    notifications: {},
}));

vi.mock('drizzle-orm', () => ({
    eq: vi.fn(),
    and: vi.fn(),
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
    lte: vi.fn(),
    or: vi.fn(),
    isNull: vi.fn(),
}));

const mockGetSignatureStatus = vi.fn();
const mockSendRawTransaction = vi.fn();
const mockConfirmTransaction = vi.fn();
const mockConnection = {
    getSignatureStatus: mockGetSignatureStatus,
    sendRawTransaction: mockSendRawTransaction,
    confirmTransaction: mockConfirmTransaction,
};

const mockBuildClaimTransaction = vi.fn();

vi.mock('@/lib/solana', () => ({
    getSolanaConnection: vi.fn(() => mockConnection),
    buildClaimTransaction: (...args: unknown[]) => mockBuildClaimTransaction(...args),
}));

// Mock @solana/web3.js to avoid real crypto operations in buildAndSendClaim
const mockKeypairFromSecretKey = vi.fn();
vi.mock('@solana/web3.js', () => {
    class MockPublicKey {
        constructor(public _key: string) {}
        toString() { return this._key; }
    }
    class MockKeypair {
        publicKey = new MockPublicKey('creator-pubkey');
        secretKey = new Uint8Array(64);
        static fromSecretKey = (...args: unknown[]) => mockKeypairFromSecretKey(...args);
    }
    return {
        Keypair: MockKeypair,
        PublicKey: MockPublicKey,
        Connection: vi.fn(),
    };
});

vi.mock('bs58', () => ({
    default: { encode: vi.fn(() => 'mock-tx-signature') },
}));

const mockDecryptPrivateKey = vi.fn();
const mockZeroize = vi.fn();

vi.mock('@/lib/crypto', () => ({
    decryptPrivateKey: (...args: unknown[]) => mockDecryptPrivateKey(...args),
    zeroize: (...args: unknown[]) => mockZeroize(...args),
}));

const mockPublishClaimStatus = vi.fn();

vi.mock('@/lib/claim-events', () => ({
    publishClaimStatus: (...args: unknown[]) => mockPublishClaimStatus(...args),
}));

vi.mock('@/lib/logger', () => ({
    logger: {
        child: () => ({
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        }),
    },
}));

vi.mock('@/lib/tokens', () => ({
    NATIVE_SOL_MINT: 'So11111111111111111111111111111111111111112',
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeClaim(overrides: Partial<ClaimRow> = {}): ClaimRow {
    return {
        id: 'claim-1',
        daget_id: 'daget-1',
        claimant_user_id: 'user-1',
        idempotency_key: 'idem-1',
        receiving_address: 'ReceiverPubkey111111111111111111111111111111',
        amount_base_units: 1_000_000,
        status: 'created',
        tx_signature: null,
        attempt_count: 0,
        last_error: null,
        next_retry_at: null,
        locked_until: null,
        created_at: new Date().toISOString(),
        submitted_at: null,
        confirmed_at: null,
        failed_at: null,
        released_at: null,
        ...overrides,
    };
}

/**
 * Set up mocks so that buildAndSendClaim proceeds past wallet/daget lookup
 * and Keypair construction, but throws at buildClaimTransaction.
 * This lets us test the catch block of processClaim.
 */
function setupBuildAndSendMocks() {
    mockDagetsFindFirst.mockResolvedValue({
        id: 'daget-1',
        creatorWalletId: 'wallet-1',
        tokenMint: 'So11111111111111111111111111111111111111112',
        tokenDecimals: 9,
        creatorUserId: 'creator-1',
        name: 'Test Daget',
        tokenSymbol: 'SOL',
    });
    mockWalletsFindFirst.mockResolvedValue({
        id: 'wallet-1',
        encryptedPrivateKey: 'encrypted-key',
        encryptionVersion: 1,
    });
    mockDecryptPrivateKey.mockResolvedValue(new Uint8Array(64));
    // Return a mock keypair from fromSecretKey
    mockKeypairFromSecretKey.mockReturnValue({
        publicKey: { toString: () => 'creator-pubkey' },
        secretKey: new Uint8Array(64),
    });
}

// ── Import SUT after mocks ───────────────────────────────────────────────────

import { processClaim, RpcError } from '../processor';

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    vi.clearAllMocks();
    // Default: re-read attempt_count returns 0
    mockExecute.mockResolvedValue([{ attempt_count: 0 }]);
});

// ─────────────────────────────────────────────────────────────────────────────
// RpcError
// ─────────────────────────────────────────────────────────────────────────────

describe('RpcError', () => {
    it('is an instance of Error', () => {
        const err = new RpcError('fetch failed');
        expect(err).toBeInstanceOf(Error);
    });

    it('has name "RpcError"', () => {
        const err = new RpcError('ECONNREFUSED');
        expect(err.name).toBe('RpcError');
    });

    it('carries the original message', () => {
        const err = new RpcError('socket hang up');
        expect(err.message).toBe('socket hang up');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// processClaim — routing by status
// ─────────────────────────────────────────────────────────────────────────────

describe('processClaim routing', () => {
    it('routes "submitted" claims to polling (getSignatureStatus), not re-send', async () => {
        const claim = makeClaim({
            status: 'submitted',
            tx_signature: 'txSig123',
            submitted_at: new Date().toISOString(),
        });

        // Poll returns pending (no finalized status) — claim stays as-is
        mockGetSignatureStatus.mockResolvedValue({ value: null });

        await processClaim(claim);

        // Should have called getSignatureStatus for polling
        expect(mockGetSignatureStatus).toHaveBeenCalledWith('txSig123');
        // Should NOT have called buildClaimTransaction
        expect(mockBuildClaimTransaction).not.toHaveBeenCalled();
        // Should NOT have called decryptPrivateKey (no build flow)
        expect(mockDecryptPrivateKey).not.toHaveBeenCalled();
    });

    it('routes "created" claims to buildAndSendClaim', async () => {
        const claim = makeClaim({ status: 'created' });
        setupBuildAndSendMocks();

        // Make buildClaimTransaction throw so we can detect it was called
        mockBuildClaimTransaction.mockRejectedValue(new Error('test_build_error'));

        await processClaim(claim);

        // Should have attempted to build (looked up daget, wallet, decrypted key)
        expect(mockDagetsFindFirst).toHaveBeenCalled();
        expect(mockWalletsFindFirst).toHaveBeenCalled();
        expect(mockDecryptPrivateKey).toHaveBeenCalled();
    });

    it('routes "failed_retryable" claims to buildAndSendClaim', async () => {
        const claim = makeClaim({ status: 'failed_retryable', attempt_count: 1 });
        setupBuildAndSendMocks();

        mockBuildClaimTransaction.mockRejectedValue(new Error('test_build_error'));

        await processClaim(claim);

        // Should attempt to build
        expect(mockDagetsFindFirst).toHaveBeenCalled();
        expect(mockDecryptPrivateKey).toHaveBeenCalled();
    });

    it('always clears lock in finally block even when processing succeeds', async () => {
        const claim = makeClaim({
            status: 'submitted',
            tx_signature: 'txSig123',
            submitted_at: new Date().toISOString(),
        });
        mockGetSignatureStatus.mockResolvedValue({ value: null });

        await processClaim(claim);

        // The last execute call should be the lock-clearing UPDATE
        const lastCall = mockExecute.mock.calls[mockExecute.mock.calls.length - 1];
        const sqlObj = lastCall[0];
        // Verify it references locked_until = NULL and the claim id
        expect(sqlObj.strings.join('')).toContain('locked_until');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// processClaim — lock clearing in finally block
// ─────────────────────────────────────────────────────────────────────────────

describe('processClaim lock clearing', () => {
    it('clears lock even after an error', async () => {
        const claim = makeClaim({ status: 'created' });
        setupBuildAndSendMocks();
        mockBuildClaimTransaction.mockRejectedValue(new Error('some retryable error'));

        await processClaim(claim);

        // Should have at least 3 execute calls:
        // 1. re-read attempt_count
        // 2. setFailedRetryable (update status)
        // 3. clear lock (finally)
        const lastCall = mockExecute.mock.calls[mockExecute.mock.calls.length - 1];
        const sqlObj = lastCall[0];
        expect(sqlObj.strings.join('')).toContain('locked_until');
    });

    it('clears lock even when the error causes RpcError re-throw', async () => {
        const claim = makeClaim({ status: 'created' });
        setupBuildAndSendMocks();
        mockBuildClaimTransaction.mockRejectedValue(new Error('fetch failed'));

        await expect(processClaim(claim)).rejects.toThrow(RpcError);

        // Lock should still be cleared
        const lastCall = mockExecute.mock.calls[mockExecute.mock.calls.length - 1];
        const sqlObj = lastCall[0];
        expect(sqlObj.strings.join('')).toContain('locked_until');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// processClaim — isUnrecoverableError (tested indirectly)
// ─────────────────────────────────────────────────────────────────────────────

describe('processClaim — unrecoverable error detection', () => {
    // For each test: buildAndSendClaim throws with a specific message,
    // and we verify the claim is set to failed_permanent.

    const unrecoverablePatterns = [
        'invalid account data found',
        'Transaction simulation: program error',
        'InvalidAccountData in instruction 2',
        'AccountNotFound: the requested account does not exist',
        'custom program error: 0x1',
        'insufficient funds for rent exemption',
    ];

    for (const pattern of unrecoverablePatterns) {
        it(`marks "${pattern}" as failed_permanent`, async () => {
            const claim = makeClaim({ status: 'created', attempt_count: 0 });
            setupBuildAndSendMocks();
            mockBuildClaimTransaction.mockRejectedValue(new Error(pattern));

            await processClaim(claim);

            // Verify that publishClaimStatus was called with failed_permanent
            expect(mockPublishClaimStatus).toHaveBeenCalledWith(
                expect.objectContaining({
                    claimId: 'claim-1',
                    status: 'failed_permanent',
                }),
            );
        });
    }

    const retryablePatterns = [
        'Transaction simulation failed',
        'Network request failed',
        'Blockhash not found',
        'InsufficientFunds',
    ];

    for (const pattern of retryablePatterns) {
        it(`marks "${pattern}" as failed_retryable (not permanent)`, async () => {
            const claim = makeClaim({ status: 'created', attempt_count: 0 });
            setupBuildAndSendMocks();
            mockBuildClaimTransaction.mockRejectedValue(new Error(pattern));

            await processClaim(claim);

            // Verify publishClaimStatus was called with failed_retryable
            expect(mockPublishClaimStatus).toHaveBeenCalledWith(
                expect.objectContaining({
                    claimId: 'claim-1',
                    status: 'failed_retryable',
                }),
            );
        });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// processClaim — MAX_ATTEMPTS handling
// ─────────────────────────────────────────────────────────────────────────────

describe('processClaim — MAX_ATTEMPTS', () => {
    it('marks as failed_permanent when attempt_count >= MAX_ATTEMPTS (5), even for retryable errors', async () => {
        const claim = makeClaim({ status: 'failed_retryable', attempt_count: 5 });
        setupBuildAndSendMocks();
        mockBuildClaimTransaction.mockRejectedValue(new Error('Blockhash not found'));

        // Re-read attempt_count returns 5
        mockExecute.mockResolvedValue([{ attempt_count: 5 }]);

        await processClaim(claim);

        expect(mockPublishClaimStatus).toHaveBeenCalledWith(
            expect.objectContaining({
                claimId: 'claim-1',
                status: 'failed_permanent',
            }),
        );
    });

    it('marks as failed_permanent when re-read attempt_count >= MAX_ATTEMPTS even if claim object is stale', async () => {
        // Claim object says attempt_count 3, but DB says 5
        const claim = makeClaim({ status: 'failed_retryable', attempt_count: 3 });
        setupBuildAndSendMocks();
        mockBuildClaimTransaction.mockRejectedValue(new Error('Blockhash not found'));

        // Re-read returns the fresh (higher) value
        mockExecute.mockResolvedValue([{ attempt_count: 5 }]);

        await processClaim(claim);

        expect(mockPublishClaimStatus).toHaveBeenCalledWith(
            expect.objectContaining({
                claimId: 'claim-1',
                status: 'failed_permanent',
            }),
        );
    });

    it('retries normally when attempt_count < MAX_ATTEMPTS for retryable errors', async () => {
        const claim = makeClaim({ status: 'created', attempt_count: 2 });
        setupBuildAndSendMocks();
        mockBuildClaimTransaction.mockRejectedValue(new Error('Blockhash not found'));

        mockExecute.mockResolvedValue([{ attempt_count: 2 }]);

        await processClaim(claim);

        expect(mockPublishClaimStatus).toHaveBeenCalledWith(
            expect.objectContaining({
                claimId: 'claim-1',
                status: 'failed_retryable',
            }),
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// processClaim — RPC error re-throw
// ─────────────────────────────────────────────────────────────────────────────

describe('processClaim — RPC error re-throw', () => {
    const rpcPatterns = [
        'fetch failed',
        'ECONNREFUSED',
        'ENOTFOUND',
        'ETIMEDOUT',
        '429 Too Many Requests',
        'Too Many Requests',
        'Internal Server Error',
        'getaddrinfo ENOTFOUND api.mainnet-beta.solana.com',
        'socket hang up',
    ];

    for (const pattern of rpcPatterns) {
        it(`re-throws RpcError for "${pattern}"`, async () => {
            const claim = makeClaim({ status: 'created', attempt_count: 0 });
            setupBuildAndSendMocks();
            mockBuildClaimTransaction.mockRejectedValue(new Error(pattern));

            const error = await processClaim(claim).catch((e: unknown) => e);

            expect(error).toBeInstanceOf(RpcError);
            expect((error as RpcError).message).toBe(pattern);
        });
    }

    it('does NOT re-throw for non-RPC errors', async () => {
        const claim = makeClaim({ status: 'created', attempt_count: 0 });
        setupBuildAndSendMocks();
        mockBuildClaimTransaction.mockRejectedValue(new Error('Blockhash not found'));

        // Should not throw
        await expect(processClaim(claim)).resolves.toBeUndefined();
    });

    it('sets failed_retryable BEFORE re-throwing RpcError', async () => {
        const claim = makeClaim({ status: 'created', attempt_count: 0 });
        setupBuildAndSendMocks();
        mockBuildClaimTransaction.mockRejectedValue(new Error('fetch failed'));

        await processClaim(claim).catch(() => {});

        // Verify failed_retryable was published (status was set)
        expect(mockPublishClaimStatus).toHaveBeenCalledWith(
            expect.objectContaining({
                claimId: 'claim-1',
                status: 'failed_retryable',
            }),
        );
    });

    it('sets failed_permanent for RPC error when attempt_count >= MAX_ATTEMPTS, then re-throws', async () => {
        const claim = makeClaim({ status: 'failed_retryable', attempt_count: 5 });
        setupBuildAndSendMocks();
        mockBuildClaimTransaction.mockRejectedValue(new Error('fetch failed'));

        mockExecute.mockResolvedValue([{ attempt_count: 5 }]);

        const error = await processClaim(claim).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(RpcError);
        expect(mockPublishClaimStatus).toHaveBeenCalledWith(
            expect.objectContaining({
                claimId: 'claim-1',
                status: 'failed_permanent',
            }),
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// processClaim — submitted claim polling edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('processClaim — submitted claim polling', () => {
    it('sets failed_retryable when submitted claim has no tx_signature', async () => {
        const claim = makeClaim({
            status: 'submitted',
            tx_signature: null,
            submitted_at: new Date().toISOString(),
        });

        await processClaim(claim);

        expect(mockPublishClaimStatus).toHaveBeenCalledWith(
            expect.objectContaining({
                claimId: 'claim-1',
                status: 'failed_retryable',
                lastError: 'submitted_without_signature',
            }),
        );
        // Should not poll
        expect(mockGetSignatureStatus).not.toHaveBeenCalled();
    });

    it('confirms claim when getSignatureStatus returns finalized without error', async () => {
        const claim = makeClaim({
            status: 'submitted',
            tx_signature: 'txSig456',
            submitted_at: new Date().toISOString(),
        });

        mockGetSignatureStatus.mockResolvedValue({
            value: { confirmationStatus: 'finalized', err: null },
        });

        // Stubs for confirmClaim
        mockClaimsFindFirst.mockResolvedValue({
            id: 'claim-1',
            dagetId: 'daget-1',
            claimantUserId: 'user-1',
            txSignature: 'txSig456',
            amountBaseUnits: '1000000',
        });
        mockDagetsFindFirst.mockResolvedValue({
            id: 'daget-1',
            creatorUserId: 'creator-1',
            tokenDecimals: 9,
            tokenSymbol: 'SOL',
            name: 'Test Daget',
        });
        mockUsersFindFirst.mockResolvedValue({
            id: 'user-1',
            discordUsername: 'testuser',
        });

        await processClaim(claim);

        expect(mockPublishClaimStatus).toHaveBeenCalledWith(
            expect.objectContaining({
                claimId: 'claim-1',
                status: 'confirmed',
            }),
        );
    });

    it('sets failed_retryable when finalized status has an error', async () => {
        const claim = makeClaim({
            status: 'submitted',
            tx_signature: 'txSig789',
            submitted_at: new Date().toISOString(),
        });

        mockGetSignatureStatus.mockResolvedValue({
            value: {
                confirmationStatus: 'finalized',
                err: { InstructionError: [0, { Custom: 1 }] },
            },
        });

        await processClaim(claim);

        expect(mockPublishClaimStatus).toHaveBeenCalledWith(
            expect.objectContaining({
                claimId: 'claim-1',
                status: 'failed_retryable',
            }),
        );
    });

    it('does nothing when poll returns non-finalized status (pending)', async () => {
        const claim = makeClaim({
            status: 'submitted',
            tx_signature: 'txSig999',
            submitted_at: new Date().toISOString(),
        });

        mockGetSignatureStatus.mockResolvedValue({
            value: { confirmationStatus: 'confirmed', err: null },
        });

        await processClaim(claim);

        // Should not publish any status update — claim remains submitted
        expect(mockPublishClaimStatus).not.toHaveBeenCalled();
    });

    it('handles transient poll errors gracefully (no re-throw, will retry next tick)', async () => {
        const claim = makeClaim({
            status: 'submitted',
            tx_signature: 'txSig111',
            submitted_at: new Date().toISOString(),
        });

        mockGetSignatureStatus.mockRejectedValue(new Error('Network error'));

        // Should not throw
        await expect(processClaim(claim)).resolves.toBeUndefined();
        // No status update published
        expect(mockPublishClaimStatus).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// processClaim — submitted timeout
// ─────────────────────────────────────────────────────────────────────────────

describe('processClaim — submitted timeout', () => {
    it('sets failed_retryable on timeout when attempt_count < MAX_ATTEMPTS and on-chain not finalized', async () => {
        const submittedAt = new Date(Date.now() - 100_000).toISOString(); // 100s ago (> 90s timeout)
        const claim = makeClaim({
            status: 'submitted',
            tx_signature: 'txSigTimeout',
            submitted_at: submittedAt,
            attempt_count: 2,
        });

        // On-chain check returns null (not confirmed)
        mockGetSignatureStatus.mockResolvedValue({ value: null });

        await processClaim(claim);

        expect(mockPublishClaimStatus).toHaveBeenCalledWith(
            expect.objectContaining({
                claimId: 'claim-1',
                status: 'failed_retryable',
                lastError: 'submitted_timeout',
            }),
        );
    });

    it('sets failed_permanent on timeout when attempt_count >= MAX_ATTEMPTS', async () => {
        const submittedAt = new Date(Date.now() - 100_000).toISOString();
        const claim = makeClaim({
            status: 'submitted',
            tx_signature: 'txSigTimeout',
            submitted_at: submittedAt,
            attempt_count: 5,
        });

        mockGetSignatureStatus.mockResolvedValue({ value: null });

        await processClaim(claim);

        expect(mockPublishClaimStatus).toHaveBeenCalledWith(
            expect.objectContaining({
                claimId: 'claim-1',
                status: 'failed_permanent',
                lastError: 'submitted_timeout',
            }),
        );
    });

    it('confirms claim on timeout if last-chance on-chain check shows finalized success', async () => {
        const submittedAt = new Date(Date.now() - 100_000).toISOString();
        const claim = makeClaim({
            status: 'submitted',
            tx_signature: 'txSigTimeoutOk',
            submitted_at: submittedAt,
            attempt_count: 2,
        });

        mockGetSignatureStatus.mockResolvedValue({
            value: { confirmationStatus: 'finalized', err: null },
        });

        // Stubs for confirmClaim
        mockClaimsFindFirst.mockResolvedValue({
            id: 'claim-1',
            dagetId: 'daget-1',
            claimantUserId: 'user-1',
            txSignature: 'txSigTimeoutOk',
            amountBaseUnits: '1000000',
        });
        mockDagetsFindFirst.mockResolvedValue({
            id: 'daget-1',
            creatorUserId: 'creator-1',
            tokenDecimals: 9,
            tokenSymbol: 'SOL',
            name: 'Test Daget',
        });
        mockUsersFindFirst.mockResolvedValue({
            id: 'user-1',
            discordUsername: 'testuser',
        });

        await processClaim(claim);

        expect(mockPublishClaimStatus).toHaveBeenCalledWith(
            expect.objectContaining({
                claimId: 'claim-1',
                status: 'confirmed',
            }),
        );
    });

    it('sets failed_retryable on timeout if last-chance check shows finalized with error', async () => {
        const submittedAt = new Date(Date.now() - 100_000).toISOString();
        const claim = makeClaim({
            status: 'submitted',
            tx_signature: 'txSigTimeoutErr',
            submitted_at: submittedAt,
            attempt_count: 1,
        });

        mockGetSignatureStatus.mockResolvedValue({
            value: {
                confirmationStatus: 'finalized',
                err: { InstructionError: [0, 'InvalidAccountData'] },
            },
        });

        await processClaim(claim);

        expect(mockPublishClaimStatus).toHaveBeenCalledWith(
            expect.objectContaining({
                claimId: 'claim-1',
                status: 'failed_retryable',
            }),
        );
    });

    it('falls through to timeout handling when last-chance on-chain check throws', async () => {
        const submittedAt = new Date(Date.now() - 100_000).toISOString();
        const claim = makeClaim({
            status: 'submitted',
            tx_signature: 'txSigTimeoutNetErr',
            submitted_at: submittedAt,
            attempt_count: 1,
        });

        mockGetSignatureStatus.mockRejectedValue(new Error('RPC down'));

        await processClaim(claim);

        // Should fall through to submitted_timeout handling
        expect(mockPublishClaimStatus).toHaveBeenCalledWith(
            expect.objectContaining({
                claimId: 'claim-1',
                status: 'failed_retryable',
                lastError: 'submitted_timeout',
            }),
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// setFailedRetryable — backoff schedule
// ─────────────────────────────────────────────────────────────────────────────

describe('processClaim — backoff schedule', () => {
    // BACKOFF_SCHEDULE: [10, 30, 60, 120, 300]
    // Jitter = cryptoJitter(Math.floor(backoffSeconds * 0.2))
    // The next_retry_at is set to Date.now() + (backoffSeconds + jitter) * 1000

    it('uses first backoff (10s) on attempt_count 0', async () => {
        const claim = makeClaim({ status: 'created', attempt_count: 0 });
        setupBuildAndSendMocks();
        mockBuildClaimTransaction.mockRejectedValue(new Error('Blockhash not found'));

        const before = Date.now();
        await processClaim(claim);

        // Find the setFailedRetryable execute call — it sets next_retry_at
        const retryCall = mockExecute.mock.calls.find(
            (args: unknown[]) => {
                const sql = args[0] as { strings: TemplateStringsArray; values: unknown[] };
                return sql.strings?.join('').includes('failed_retryable');
            },
        );
        expect(retryCall).toBeDefined();

        // Extract the next_retry_at value from the SQL template
        const sqlObj = retryCall![0] as { values: unknown[] };
        const nextRetryAtStr = sqlObj.values.find(
            (v: unknown) => typeof v === 'string' && v.includes('T'),
        ) as string;
        expect(nextRetryAtStr).toBeDefined();

        const nextRetryAt = new Date(nextRetryAtStr).getTime();
        const after = Date.now();

        // Backoff is 10s with up to 2s jitter (Math.floor(10 * 0.2) = 2)
        // So next_retry_at should be between now+10s and now+12s
        expect(nextRetryAt).toBeGreaterThanOrEqual(before + 10_000);
        expect(nextRetryAt).toBeLessThanOrEqual(after + 12_000 + 100); // small tolerance
    });

    it('uses second backoff (30s) on attempt_count 1', async () => {
        const claim = makeClaim({ status: 'failed_retryable', attempt_count: 1 });
        setupBuildAndSendMocks();
        mockBuildClaimTransaction.mockRejectedValue(new Error('Blockhash not found'));

        const before = Date.now();
        await processClaim(claim);

        const retryCall = mockExecute.mock.calls.find(
            (args: unknown[]) => {
                const sql = args[0] as { strings: TemplateStringsArray; values: unknown[] };
                return sql.strings?.join('').includes('failed_retryable');
            },
        );
        expect(retryCall).toBeDefined();

        const sqlObj = retryCall![0] as { values: unknown[] };
        const nextRetryAtStr = sqlObj.values.find(
            (v: unknown) => typeof v === 'string' && v.includes('T'),
        ) as string;
        expect(nextRetryAtStr).toBeDefined();

        const nextRetryAt = new Date(nextRetryAtStr).getTime();
        const after = Date.now();

        // Backoff is 30s with up to 6s jitter (Math.floor(30 * 0.2) = 6)
        expect(nextRetryAt).toBeGreaterThanOrEqual(before + 30_000);
        expect(nextRetryAt).toBeLessThanOrEqual(after + 36_000 + 100);
    });

    it('clamps to last backoff (300s) when attempt_count exceeds schedule length', async () => {
        const claim = makeClaim({ status: 'failed_retryable', attempt_count: 4 });
        setupBuildAndSendMocks();
        mockBuildClaimTransaction.mockRejectedValue(new Error('Blockhash not found'));

        // attempt_count 4 → index min(4, 4) = 4 → 300s
        const before = Date.now();
        await processClaim(claim);

        const retryCall = mockExecute.mock.calls.find(
            (args: unknown[]) => {
                const sql = args[0] as { strings: TemplateStringsArray; values: unknown[] };
                return sql.strings?.join('').includes('failed_retryable');
            },
        );
        expect(retryCall).toBeDefined();

        const sqlObj = retryCall![0] as { values: unknown[] };
        const nextRetryAtStr = sqlObj.values.find(
            (v: unknown) => typeof v === 'string' && v.includes('T'),
        ) as string;
        expect(nextRetryAtStr).toBeDefined();

        const nextRetryAt = new Date(nextRetryAtStr).getTime();
        const after = Date.now();

        // Backoff is 300s with up to 60s jitter (Math.floor(300 * 0.2) = 60)
        expect(nextRetryAt).toBeGreaterThanOrEqual(before + 300_000);
        expect(nextRetryAt).toBeLessThanOrEqual(after + 360_000 + 100);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// processClaim — error handling when claim is missing from DB re-read
// ─────────────────────────────────────────────────────────────────────────────

describe('processClaim — fresh attempt_count fallback', () => {
    it('falls back to claim.attempt_count when DB re-read returns no rows', async () => {
        const claim = makeClaim({ status: 'created', attempt_count: 2 });
        setupBuildAndSendMocks();
        mockBuildClaimTransaction.mockRejectedValue(new Error('Blockhash not found'));

        // Re-read returns empty (undefined)
        mockExecute.mockResolvedValue([undefined]);

        await processClaim(claim);

        // With attempt_count 2, should be retryable (< 5)
        expect(mockPublishClaimStatus).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'failed_retryable',
            }),
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// processClaim — non-Error exceptions
// ─────────────────────────────────────────────────────────────────────────────

describe('processClaim — non-Error exceptions', () => {
    it('handles non-Error thrown values gracefully (uses "Unknown error")', async () => {
        const claim = makeClaim({ status: 'created' });
        setupBuildAndSendMocks();
        // Throw a non-Error string value
        mockBuildClaimTransaction.mockRejectedValue('string error');

        await processClaim(claim);

        // Should set failed_retryable with "Unknown error" message
        expect(mockPublishClaimStatus).toHaveBeenCalledWith(
            expect.objectContaining({
                claimId: 'claim-1',
                status: 'failed_retryable',
                lastError: 'Unknown error',
            }),
        );
    });
});
