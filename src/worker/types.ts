/**
 * Raw SQL row types for the worker.
 * These use snake_case because db.execute(sql`...`) returns database column names.
 */

export interface ClaimRow {
    id: string;
    daget_id: string;
    claimant_user_id: string;
    idempotency_key: string;
    receiving_address: string;
    amount_base_units: number | null;
    status: string;
    tx_signature: string | null;
    attempt_count: number;
    last_error: string | null;
    next_retry_at: string | null;
    locked_until: string | null;
    created_at: string;
    submitted_at: string | null;
    confirmed_at: string | null;
    failed_at: string | null;
    released_at: string | null;
}

export interface StaleSubmittedRow {
    id: string;
    tx_signature: string | null;
    submitted_at: string;
    attempt_count: number;
}

export interface ConfirmedClaimRow {
    id: string;
    tx_signature: string;
}

export interface LockedDagetRow {
    claimed_count: number;
    total_winners: number;
    total_amount_base_units: number;
    daget_type: string;
    random_min_bps: number | null;
    random_max_bps: number | null;
    token_decimals: number;
}

export interface ClaimedSumRow {
    total: number;
}

export interface LockedClaimRow {
    status: string;
    amount_base_units: number | null;
}
