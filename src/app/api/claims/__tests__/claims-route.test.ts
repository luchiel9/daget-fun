import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ── Mocks ──

vi.mock('@/lib/auth', () => ({
    requireAuth: vi.fn(),
    getDiscordAccessToken: vi.fn(),
}));

vi.mock('@/db', () => {
    const mockTx = {
        execute: vi.fn(),
        query: { claims: { findFirst: vi.fn() } },
        insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn() })) })),
    };
    return {
        db: {
            query: {
                dagets: { findFirst: vi.fn() },
                dagetRequirements: { findMany: vi.fn() },
            },
            transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
            insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn() })) })),
        },
    };
});

vi.mock('@/db/schema', () => ({
    dagets: { claimSlug: 'claim_slug' },
    claims: {
        dagetId: 'daget_id',
        claimantUserId: 'claimant_user_id',
        receivingAddress: 'receiving_address',
        createdAt: 'created_at',
    },
    dagetRequirements: { dagetId: 'daget_id' },
}));

vi.mock('drizzle-orm', () => ({
    eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
    and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
    desc: vi.fn(),
    lt: vi.fn(),
    sql: Object.assign(vi.fn((...args: unknown[]) => ({ type: 'sql', args })), {
        join: vi.fn(),
    }),
}));

vi.mock('@/lib/rate-limit', () => ({
    checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 10, reset: 0 }),
    rateLimiters: { claimsPerUser: vi.fn(), claimsPerIp: vi.fn() },
    getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}));

vi.mock('@/lib/idempotency', () => ({
    checkIdempotency: vi.fn().mockResolvedValue(null),
    storeIdempotency: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/discord-verify', () => ({
    verifyDiscordRoles: vi.fn(),
}));

vi.mock('@/lib/cursor', () => ({
    encodeCursor: vi.fn(),
    decodeCursor: vi.fn(),
}));

vi.mock('next/headers', () => ({
    headers: vi.fn().mockResolvedValue({ get: vi.fn() }),
}));

// ── Imports (after mocks) ──

import { POST } from '../route';
import { requireAuth, getDiscordAccessToken } from '@/lib/auth';
import { db } from '@/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { checkIdempotency, storeIdempotency } from '@/lib/idempotency';
import { verifyDiscordRoles } from '@/lib/discord-verify';

// ── Helpers ──

const mockUser = {
    id: 'user-1',
    discordUserId: 'discord-1',
    discordUsername: 'testuser',
    discordAvatarUrl: null,
    receivingAddress: null,
    finishedGuide: true,
    isAdmin: false,
    hasWallet: true,
};

const mockDaget = {
    id: 'daget-1',
    claimSlug: 'test-slug',
    creatorUserId: 'creator-1',
    status: 'active',
    dagetType: 'fixed',
    totalWinners: 10,
    claimedCount: 0,
    totalAmountBaseUnits: 10000000,
    tokenDecimals: 6,
    tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    tokenSymbol: 'USDC',
    raffleEndsAt: null,
};

function createMockRequest(
    body: unknown,
    headers: Record<string, string> = {},
): NextRequest {
    return new NextRequest('http://localhost/api/claims', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': 'test-key-123',
            ...headers,
        },
    });
}

const validBody = {
    claim_slug: 'test-slug',
    receiving_address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
};

/**
 * Configure the transaction mock to simulate the full atomic slot
 * reservation flow: SET LOCAL, lock daget, check existing claim,
 * check wallet reuse, insert claim, increment counter.
 *
 * Accepts overrides for each step.
 */
function setupTransaction(opts: {
    lockedDaget?: Record<string, unknown> | null;
    existingClaim?: Record<string, unknown> | null;
    walletReuse?: Record<string, unknown> | null;
    newClaim?: Record<string, unknown>;
    claimedSoFar?: number;
} = {}) {
    const lockedDaget = opts.lockedDaget === undefined
        ? {
            claimed_count: 0,
            total_winners: 10,
            total_amount_base_units: 10000000,
            daget_type: 'fixed',
            random_min_bps: null,
            random_max_bps: null,
            token_decimals: 6,
        }
        : opts.lockedDaget;

    const newClaim = opts.newClaim ?? {
        id: 'claim-1',
        dagetId: 'daget-1',
        claimantUserId: 'user-1',
        status: 'created',
        amountBaseUnits: 1000000,
    };

    const txExecute = vi.fn();
    const txClaimsFindFirst = vi.fn();
    const txInsertReturning = vi.fn().mockResolvedValue([newClaim]);
    const txInsertValues = vi.fn(() => ({ returning: txInsertReturning }));
    const txInsert = vi.fn(() => ({ values: txInsertValues }));

    // tx.execute is called multiple times:
    //   1. SET LOCAL statement_timeout
    //   2. SELECT FOR UPDATE (lock daget)
    //   3. (released path) UPDATE claims SET ... RETURNING * OR
    //      (random mode) SELECT SUM(amount_base_units)
    //   N. UPDATE dagets SET claimed_count (increment)
    //   N+1. (optionally) UPDATE dagets SET status = 'closed'
    const isReleasedReclaim = opts.existingClaim && (opts.existingClaim as Record<string, unknown>).status === 'released';
    let executeCallCount = 0;
    txExecute.mockImplementation(() => {
        executeCallCount++;
        if (executeCallCount === 1) {
            // SET LOCAL
            return Promise.resolve([]);
        }
        if (executeCallCount === 2) {
            // SELECT FOR UPDATE → locked daget row
            return Promise.resolve(lockedDaget ? [lockedDaget] : []);
        }
        if (isReleasedReclaim && executeCallCount === 3) {
            // UPDATE claims SET ... RETURNING * (re-claim a released row)
            return Promise.resolve([newClaim]);
        }
        // Remaining calls: claimed sum query for random mode, or UPDATE statements
        if (opts.claimedSoFar !== undefined) {
            // For random mode: 3rd call is the SUM query
            if (executeCallCount === 3) {
                return Promise.resolve([{ total: opts.claimedSoFar }]);
            }
        }
        // UPDATE dagets SET claimed_count, or UPDATE status
        return Promise.resolve([]);
    });

    // Check existing claim: null by default (no prior claim)
    txClaimsFindFirst
        .mockResolvedValueOnce(opts.existingClaim ?? null) // existing claim check
        .mockResolvedValueOnce(opts.walletReuse ?? null);   // wallet reuse check

    const mockTx = {
        execute: txExecute,
        query: { claims: { findFirst: txClaimsFindFirst } },
        insert: txInsert,
    };

    vi.mocked(db.transaction).mockImplementation(
        (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx) as Promise<unknown>,
    );

    return { txExecute, txClaimsFindFirst, txInsert, txInsertReturning };
}

/**
 * Set up the default "happy path" mocks. Most tests override individual
 * pieces on top of this baseline.
 */
function setupDefaults() {
    vi.mocked(requireAuth).mockResolvedValue(mockUser);
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true, remaining: 10, reset: 0 });
    vi.mocked(checkIdempotency).mockResolvedValue(null);
    vi.mocked(db.query.dagets.findFirst).mockResolvedValue(mockDaget as never);
    vi.mocked(db.query.dagetRequirements.findMany).mockResolvedValue([] as never);
    setupTransaction();
}

// ── Tests ──

describe('POST /api/claims', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setupDefaults();
    });

    // ── 1. Auth required ──
    describe('authentication', () => {
        it('returns 401 when not authenticated', async () => {
            vi.mocked(requireAuth).mockRejectedValue(new Error('AUTH_REQUIRED'));

            const req = createMockRequest(validBody);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(401);
            expect(json.error.code).toBe('AUTH_REQUIRED');
        });
    });

    // ── 2. Rate limiting ──
    describe('rate limiting', () => {
        it('returns 429 when per-user rate limit exceeded', async () => {
            vi.mocked(checkRateLimit)
                .mockResolvedValueOnce({ success: false, remaining: 0, reset: Date.now() + 60000 }) // user limit
                .mockResolvedValueOnce({ success: true, remaining: 10, reset: 0 }); // ip limit

            const req = createMockRequest(validBody);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(429);
            expect(json.error.code).toBe('RATE_LIMITED');
        });

        it('returns 429 when per-IP rate limit exceeded', async () => {
            vi.mocked(checkRateLimit)
                .mockResolvedValueOnce({ success: true, remaining: 10, reset: 0 }) // user limit
                .mockResolvedValueOnce({ success: false, remaining: 0, reset: Date.now() + 60000 }); // ip limit

            const req = createMockRequest(validBody);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(429);
            expect(json.error.code).toBe('RATE_LIMITED');
        });
    });

    // ── 3. Idempotency-Key required ──
    describe('idempotency key validation', () => {
        it('returns 400 when Idempotency-Key header is missing', async () => {
            const req = new NextRequest('http://localhost/api/claims', {
                method: 'POST',
                body: JSON.stringify(validBody),
                headers: {
                    'Content-Type': 'application/json',
                    // no Idempotency-Key
                },
            });

            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(400);
            expect(json.error.code).toBe('VALIDATION_ERROR');
            expect(json.error.message).toContain('Idempotency-Key');
        });

        it('returns 400 when Idempotency-Key exceeds 128 characters', async () => {
            const longKey = 'k'.repeat(129);
            const req = createMockRequest(validBody, { 'Idempotency-Key': longKey });

            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(400);
            expect(json.error.code).toBe('VALIDATION_ERROR');
            expect(json.error.message).toContain('Idempotency-Key');
        });
    });

    // ── 4. Idempotency replay ──
    describe('idempotency replay', () => {
        it('returns cached response for a replayed key', async () => {
            const cachedResponse = NextResponse.json(
                { claim_id: 'claim-cached', status: 'created', message: 'Claim queued' },
                { status: 202 },
            );
            vi.mocked(checkIdempotency).mockResolvedValue(cachedResponse);

            const req = createMockRequest(validBody);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(202);
            expect(json.claim_id).toBe('claim-cached');
        });
    });

    // ── 5. Invalid body ──
    describe('body validation', () => {
        it('returns 400 for missing claim_slug', async () => {
            const req = createMockRequest({ receiving_address: validBody.receiving_address });
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(400);
            expect(json.error.code).toBe('VALIDATION_ERROR');
        });

        it('returns 400 for missing receiving_address', async () => {
            const req = createMockRequest({ claim_slug: 'test-slug' });
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(400);
            expect(json.error.code).toBe('VALIDATION_ERROR');
        });

        it('returns 400 for claim_slug shorter than 8 characters', async () => {
            const req = createMockRequest({ claim_slug: 'short', receiving_address: validBody.receiving_address });
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(400);
            expect(json.error.code).toBe('VALIDATION_ERROR');
        });

        it('returns 400 for claim_slug with invalid characters', async () => {
            const req = createMockRequest({ claim_slug: 'has spaces!', receiving_address: validBody.receiving_address });
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(400);
            expect(json.error.code).toBe('VALIDATION_ERROR');
        });

        it('returns 400 for invalid Solana address', async () => {
            const req = createMockRequest({ claim_slug: 'test-slug', receiving_address: 'not-a-valid-address' });
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(400);
            expect(json.error.code).toBe('VALIDATION_ERROR');
        });

        it('returns 400 for invalid JSON body', async () => {
            const req = new NextRequest('http://localhost/api/claims', {
                method: 'POST',
                body: 'not json',
                headers: {
                    'Content-Type': 'application/json',
                    'Idempotency-Key': 'test-key-123',
                },
            });

            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(400);
            expect(json.error.code).toBe('VALIDATION_ERROR');
            expect(json.error.message).toContain('Invalid JSON');
        });
    });

    // ── 6. Daget not found ──
    describe('daget lookup', () => {
        it('returns 404 for unknown claim_slug', async () => {
            vi.mocked(db.query.dagets.findFirst).mockResolvedValue(undefined as never);

            const req = createMockRequest(validBody);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(404);
            expect(json.error.code).toBe('NOT_FOUND');
        });
    });

    // ── 7. Daget not active ──
    describe('daget status checks', () => {
        it('returns 409 for stopped daget', async () => {
            vi.mocked(db.query.dagets.findFirst).mockResolvedValue(
                { ...mockDaget, status: 'stopped' } as never,
            );

            const req = createMockRequest(validBody);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(409);
            expect(json.error.code).toBe('DAGET_NOT_ACTIVE');
            expect(json.error.message).toContain('stopped');
        });

        it('returns 409 for closed daget', async () => {
            vi.mocked(db.query.dagets.findFirst).mockResolvedValue(
                { ...mockDaget, status: 'closed' } as never,
            );

            const req = createMockRequest(validBody);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(409);
            expect(json.error.code).toBe('DAGET_NOT_ACTIVE');
            expect(json.error.message).toContain('fully claimed');
        });

        it('returns 409 for drawing daget', async () => {
            vi.mocked(db.query.dagets.findFirst).mockResolvedValue(
                { ...mockDaget, status: 'drawing' } as never,
            );

            const req = createMockRequest(validBody);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(409);
            expect(json.error.code).toBe('DAGET_NOT_ACTIVE');
            expect(json.error.message).toContain('draw');
        });
    });

    // ── 8. Raffle ended ──
    describe('raffle end date', () => {
        it('returns 409 when raffle is past end date', async () => {
            const pastDate = new Date(Date.now() - 60_000); // 1 minute ago
            vi.mocked(db.query.dagets.findFirst).mockResolvedValue(
                { ...mockDaget, dagetType: 'raffle', raffleEndsAt: pastDate } as never,
            );

            const req = createMockRequest(validBody);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(409);
            expect(json.error.code).toBe('DAGET_NOT_ACTIVE');
            expect(json.error.message).toContain('raffle has ended');
        });

        it('allows claim when raffle end date is in the future', async () => {
            const futureDate = new Date(Date.now() + 3600_000); // 1 hour from now
            vi.mocked(db.query.dagets.findFirst).mockResolvedValue(
                { ...mockDaget, dagetType: 'raffle', raffleEndsAt: futureDate } as never,
            );

            setupTransaction({
                lockedDaget: {
                    claimed_count: 0,
                    total_winners: 10,
                    total_amount_base_units: 10000000,
                    daget_type: 'raffle',
                    random_min_bps: null,
                    random_max_bps: null,
                    token_decimals: 6,
                },
                newClaim: {
                    id: 'claim-raffle',
                    dagetId: 'daget-1',
                    claimantUserId: 'user-1',
                    status: 'created',
                    amountBaseUnits: null,
                },
            });

            const req = createMockRequest(validBody);
            const res = await POST(req);

            expect(res.status).toBe(202);
        });
    });

    // ── 9. Creator self-claim ──
    describe('creator self-claim', () => {
        it('returns 403 when creator tries to claim own daget', async () => {
            vi.mocked(requireAuth).mockResolvedValue({ ...mockUser, id: 'creator-1' });

            const req = createMockRequest(validBody);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(403);
            expect(json.error.code).toBe('FORBIDDEN');
            expect(json.error.message).toContain('cannot claim');
        });
    });

    // ── 10. Discord role verification ──
    describe('Discord role verification', () => {
        it('returns 403 when user lacks required roles', async () => {
            vi.mocked(db.query.dagetRequirements.findMany).mockResolvedValue([
                { dagetId: 'daget-1', discordGuildId: 'guild-1', discordRoleId: 'role-1' },
            ] as never);
            vi.mocked(getDiscordAccessToken).mockResolvedValue('mock-token');
            vi.mocked(verifyDiscordRoles).mockResolvedValue({
                eligible: false,
                inGuild: true,
                userRoles: [],
                error: 'You do not have the required role.',
            });

            const req = createMockRequest(validBody);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(403);
            expect(json.error.code).toBe('FORBIDDEN');
        });

        it('returns 401 when Discord session is expired', async () => {
            vi.mocked(db.query.dagetRequirements.findMany).mockResolvedValue([
                { dagetId: 'daget-1', discordGuildId: 'guild-1', discordRoleId: 'role-1' },
            ] as never);
            vi.mocked(getDiscordAccessToken).mockResolvedValue(null);

            const req = createMockRequest(validBody);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(401);
            expect(json.error.code).toBe('AUTH_REQUIRED');
            expect(json.error.message).toContain('Discord session expired');
        });

        it('proceeds when user has required roles', async () => {
            vi.mocked(db.query.dagetRequirements.findMany).mockResolvedValue([
                { dagetId: 'daget-1', discordGuildId: 'guild-1', discordRoleId: 'role-1' },
            ] as never);
            vi.mocked(getDiscordAccessToken).mockResolvedValue('mock-token');
            vi.mocked(verifyDiscordRoles).mockResolvedValue({
                eligible: true,
                inGuild: true,
                userRoles: ['role-1'],
            });

            setupTransaction();

            const req = createMockRequest(validBody);
            const res = await POST(req);

            expect(res.status).toBe(202);
        });

        it('skips verification when daget has no role requirements', async () => {
            vi.mocked(db.query.dagetRequirements.findMany).mockResolvedValue([] as never);

            setupTransaction();

            const req = createMockRequest(validBody);
            const res = await POST(req);

            expect(res.status).toBe(202);
            expect(verifyDiscordRoles).not.toHaveBeenCalled();
        });
    });

    // ── 11. Already claimed ──
    describe('duplicate claim', () => {
        it('returns 409 when user already claimed this daget', async () => {
            setupTransaction({
                existingClaim: {
                    id: 'claim-existing',
                    dagetId: 'daget-1',
                    claimantUserId: 'user-1',
                    status: 'created',
                },
            });

            const req = createMockRequest(validBody);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(409);
            expect(json.error.code).toBe('ALREADY_CLAIMED');
        });

        it('returns 409 for confirmed prior claim', async () => {
            setupTransaction({
                existingClaim: {
                    id: 'claim-existing',
                    dagetId: 'daget-1',
                    claimantUserId: 'user-1',
                    status: 'confirmed',
                },
            });

            const req = createMockRequest(validBody);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(409);
            expect(json.error.code).toBe('ALREADY_CLAIMED');
        });
    });

    // ── 12. Wallet reuse (sybil) ──
    describe('sybil protection — wallet reuse', () => {
        it('returns 409 when wallet already used for this daget', async () => {
            setupTransaction({
                existingClaim: null, // no prior claim by this user
                walletReuse: {
                    id: 'claim-other-user',
                    dagetId: 'daget-1',
                    claimantUserId: 'other-user',
                    receivingAddress: validBody.receiving_address,
                    status: 'created',
                },
            });

            const req = createMockRequest(validBody);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(409);
            expect(json.error.code).toBe('WALLET_ALREADY_USED');
        });

        it('allows wallet reuse when previous claim was released', async () => {
            setupTransaction({
                existingClaim: null,
                walletReuse: {
                    id: 'claim-released',
                    dagetId: 'daget-1',
                    claimantUserId: 'other-user',
                    receivingAddress: validBody.receiving_address,
                    status: 'released',
                },
            });

            const req = createMockRequest(validBody);
            const res = await POST(req);

            expect(res.status).toBe(202);
        });
    });

    // ── 13. Fully claimed ──
    describe('fully claimed', () => {
        it('returns 409 when all slots are taken', async () => {
            setupTransaction({
                lockedDaget: {
                    claimed_count: 10,
                    total_winners: 10,
                    total_amount_base_units: 10000000,
                    daget_type: 'fixed',
                    random_min_bps: null,
                    random_max_bps: null,
                    token_decimals: 6,
                },
            });

            const req = createMockRequest(validBody);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(409);
            expect(json.error.code).toBe('DAGET_FULLY_CLAIMED');
        });

        it('returns 409 when daget becomes inactive during transaction lock', async () => {
            setupTransaction({ lockedDaget: null });

            const req = createMockRequest(validBody);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(409);
            expect(json.error.code).toBe('DAGET_NOT_ACTIVE');
        });
    });

    // ── 14. Fixed mode amount calculation ──
    describe('fixed mode amount calculation', () => {
        it('calculates correct per-claim amount via floor division', async () => {
            // 10,000,000 / 10 = 1,000,000 per claim (exactly)
            const txMocks = setupTransaction({
                lockedDaget: {
                    claimed_count: 0,
                    total_winners: 10,
                    total_amount_base_units: 10000000,
                    daget_type: 'fixed',
                    random_min_bps: null,
                    random_max_bps: null,
                    token_decimals: 6,
                },
                newClaim: {
                    id: 'claim-fixed',
                    dagetId: 'daget-1',
                    claimantUserId: 'user-1',
                    status: 'created',
                    amountBaseUnits: 1000000,
                },
            });

            const req = createMockRequest(validBody);
            const res = await POST(req);

            expect(res.status).toBe(202);
            // Verify the insert was called with the correct amount
            const insertValues = txMocks.txInsert.mock.results[0]?.value;
            if (insertValues) {
                const valuesCall = insertValues.values.mock.calls[0][0];
                expect(valuesCall.amountBaseUnits).toBe(1000000);
            }
        });

        it('gives remainder to last claimer when amount does not divide evenly', async () => {
            // 10,000,003 / 10 = floor(1,000,000.3) = 1,000,000 per claim
            // Last claimer: 10,000,003 - (1,000,000 * 9) = 1,000,003
            const txMocks = setupTransaction({
                lockedDaget: {
                    claimed_count: 9, // last claimer
                    total_winners: 10,
                    total_amount_base_units: 10000003,
                    daget_type: 'fixed',
                    random_min_bps: null,
                    random_max_bps: null,
                    token_decimals: 6,
                },
                newClaim: {
                    id: 'claim-last',
                    dagetId: 'daget-1',
                    claimantUserId: 'user-1',
                    status: 'created',
                    amountBaseUnits: 1000003,
                },
            });

            const req = createMockRequest(validBody);
            const res = await POST(req);

            expect(res.status).toBe(202);
            const insertValues = txMocks.txInsert.mock.results[0]?.value;
            if (insertValues) {
                const valuesCall = insertValues.values.mock.calls[0][0];
                expect(valuesCall.amountBaseUnits).toBe(1000003);
            }
        });

        it('gives normal amount to non-last claimer', async () => {
            // 10,000,003 / 10 = floor(1,000,000.3) = 1,000,000 per claim
            const txMocks = setupTransaction({
                lockedDaget: {
                    claimed_count: 4, // middle claimer
                    total_winners: 10,
                    total_amount_base_units: 10000003,
                    daget_type: 'fixed',
                    random_min_bps: null,
                    random_max_bps: null,
                    token_decimals: 6,
                },
                newClaim: {
                    id: 'claim-mid',
                    dagetId: 'daget-1',
                    claimantUserId: 'user-1',
                    status: 'created',
                    amountBaseUnits: 1000000,
                },
            });

            const req = createMockRequest(validBody);
            const res = await POST(req);

            expect(res.status).toBe(202);
            const insertValues = txMocks.txInsert.mock.results[0]?.value;
            if (insertValues) {
                const valuesCall = insertValues.values.mock.calls[0][0];
                expect(valuesCall.amountBaseUnits).toBe(1000000);
            }
        });
    });

    // ── 15. Happy path ──
    describe('happy path', () => {
        it('returns 202 with claim_id for fixed mode', async () => {
            setupTransaction({
                newClaim: {
                    id: 'claim-happy',
                    dagetId: 'daget-1',
                    claimantUserId: 'user-1',
                    status: 'created',
                    amountBaseUnits: 1000000,
                },
            });

            const req = createMockRequest(validBody);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(202);
            expect(json.claim_id).toBe('claim-happy');
            expect(json.status).toBe('created');
            expect(json.message).toBe('Claim queued');
        });

        it('stores idempotency key after successful claim', async () => {
            setupTransaction({
                newClaim: {
                    id: 'claim-idem',
                    dagetId: 'daget-1',
                    claimantUserId: 'user-1',
                    status: 'created',
                    amountBaseUnits: 1000000,
                },
            });

            const req = createMockRequest(validBody);
            await POST(req);

            expect(storeIdempotency).toHaveBeenCalledWith(
                'test-key-123',
                'user-1',
                'POST /api/claims',
                validBody,
                202,
                expect.objectContaining({
                    claim_id: 'claim-idem',
                    status: 'created',
                }),
            );
        });

        it('calls rate limiter for both user and IP', async () => {
            setupTransaction();

            const req = createMockRequest(validBody);
            await POST(req);

            expect(checkRateLimit).toHaveBeenCalledTimes(2);
        });
    });

    // ── 16. Raffle mode ──
    describe('raffle mode', () => {
        it('returns 202 with "entered" status and null amount', async () => {
            const futureDate = new Date(Date.now() + 3600_000);
            vi.mocked(db.query.dagets.findFirst).mockResolvedValue(
                { ...mockDaget, dagetType: 'raffle', raffleEndsAt: futureDate } as never,
            );

            setupTransaction({
                lockedDaget: {
                    claimed_count: 0,
                    total_winners: 10,
                    total_amount_base_units: 10000000,
                    daget_type: 'raffle',
                    random_min_bps: null,
                    random_max_bps: null,
                    token_decimals: 6,
                },
                newClaim: {
                    id: 'claim-raffle',
                    dagetId: 'daget-1',
                    claimantUserId: 'user-1',
                    status: 'created',
                    amountBaseUnits: null,
                },
            });

            const req = createMockRequest(validBody);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(202);
            expect(json.status).toBe('entered');
            expect(json.message).toContain('Raffle entry registered');
            expect(json.message).toContain('Draw on');
        });

        it('amount_base_units is null for raffle claims', async () => {
            const futureDate = new Date(Date.now() + 3600_000);
            vi.mocked(db.query.dagets.findFirst).mockResolvedValue(
                { ...mockDaget, dagetType: 'raffle', raffleEndsAt: futureDate } as never,
            );

            const txMocks = setupTransaction({
                lockedDaget: {
                    claimed_count: 0,
                    total_winners: 10,
                    total_amount_base_units: 10000000,
                    daget_type: 'raffle',
                    random_min_bps: null,
                    random_max_bps: null,
                    token_decimals: 6,
                },
                newClaim: {
                    id: 'claim-raffle-null',
                    dagetId: 'daget-1',
                    claimantUserId: 'user-1',
                    status: 'created',
                    amountBaseUnits: null,
                },
            });

            const req = createMockRequest(validBody);
            await POST(req);

            const insertValues = txMocks.txInsert.mock.results[0]?.value;
            if (insertValues) {
                const valuesCall = insertValues.values.mock.calls[0][0];
                expect(valuesCall.amountBaseUnits).toBeNull();
            }
        });

        it('raffle mode does not check claimed_count against total_winners', async () => {
            // Raffle allows unlimited entries, so claimed_count >= total_winners should NOT reject
            const futureDate = new Date(Date.now() + 3600_000);
            vi.mocked(db.query.dagets.findFirst).mockResolvedValue(
                { ...mockDaget, dagetType: 'raffle', raffleEndsAt: futureDate } as never,
            );

            setupTransaction({
                lockedDaget: {
                    claimed_count: 100, // way more than total_winners
                    total_winners: 10,
                    total_amount_base_units: 10000000,
                    daget_type: 'raffle',
                    random_min_bps: null,
                    random_max_bps: null,
                    token_decimals: 6,
                },
                newClaim: {
                    id: 'claim-raffle-unlimited',
                    dagetId: 'daget-1',
                    claimantUserId: 'user-1',
                    status: 'created',
                    amountBaseUnits: null,
                },
            });

            const req = createMockRequest(validBody);
            const res = await POST(req);

            expect(res.status).toBe(202);
        });

        it('shows TBD when raffle has no end date', async () => {
            vi.mocked(db.query.dagets.findFirst).mockResolvedValue(
                { ...mockDaget, dagetType: 'raffle', raffleEndsAt: null } as never,
            );

            setupTransaction({
                lockedDaget: {
                    claimed_count: 0,
                    total_winners: 10,
                    total_amount_base_units: 10000000,
                    daget_type: 'raffle',
                    random_min_bps: null,
                    random_max_bps: null,
                    token_decimals: 6,
                },
                newClaim: {
                    id: 'claim-raffle-tbd',
                    dagetId: 'daget-1',
                    claimantUserId: 'user-1',
                    status: 'created',
                    amountBaseUnits: null,
                },
            });

            const req = createMockRequest(validBody);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(202);
            expect(json.message).toContain('TBD');
        });
    });

    // ── Edge cases ──
    describe('edge cases', () => {
        it('returns 500 for unexpected errors', async () => {
            vi.mocked(requireAuth).mockRejectedValue(new Error('UNEXPECTED'));

            const req = createMockRequest(validBody);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(500);
            expect(json.error.code).toBe('INTERNAL_ERROR');
        });

        it('allows re-claim after a released claim', async () => {
            setupTransaction({
                existingClaim: {
                    id: 'claim-released',
                    dagetId: 'daget-1',
                    claimantUserId: 'user-1',
                    status: 'released',
                },
                walletReuse: null,
                newClaim: {
                    id: 'claim-reclaimed',
                    dagetId: 'daget-1',
                    claimantUserId: 'user-1',
                    status: 'created',
                    amountBaseUnits: 1000000,
                },
            });

            const req = createMockRequest(validBody);
            const res = await POST(req);
            const json = await res.json();

            expect(res.status).toBe(202);
            expect(json.claim_id).toBe('claim-reclaimed');
            expect(json.status).toBe('created');
        });
    });
});
