import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Stable error codes from blueprint §4.7.
 */
export const ErrorCodes = {
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    FORBIDDEN: 'FORBIDDEN',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    DAGET_ACTIVE_EXISTS: 'DAGET_ACTIVE_EXISTS',
    DAGET_NOT_ACTIVE: 'DAGET_NOT_ACTIVE',
    CLAIM_NOT_RETRYABLE: 'CLAIM_NOT_RETRYABLE',
    RETRY_COOLDOWN: 'RETRY_COOLDOWN',
    IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
    RATE_LIMITED: 'RATE_LIMITED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    WALLET_ACTIVE_EXISTS: 'WALLET_ACTIVE_EXISTS',
    WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
    ACTIVE_DAGET_BLOCKS_ROTATION: 'ACTIVE_DAGET_BLOCKS_ROTATION',
    EXPORT_TOKEN_INVALID: 'EXPORT_TOKEN_INVALID',
    EXPORT_TOKEN_EXPIRED: 'EXPORT_TOKEN_EXPIRED',
    EXPORT_TOKEN_USED: 'EXPORT_TOKEN_USED',
    DAGET_FULLY_CLAIMED: 'DAGET_FULLY_CLAIMED',
    ALREADY_CLAIMED: 'ALREADY_CLAIMED',
    INELIGIBLE: 'INELIGIBLE',
    CANNOT_EDIT_REWARD_POOL: 'CANNOT_EDIT_REWARD_POOL',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Standard error response shape from blueprint §4.7.
 */
export function errorResponse(
    code: ErrorCode,
    message: string,
    status: number,
    details?: Record<string, unknown>,
) {
    const requestId = crypto.randomUUID();

    return NextResponse.json(
        {
            request_id: requestId,
            error: {
                code,
                message,
                ...(details ? { details } : {}),
            },
        },
        { status },
    );
}

/**
 * Quick error helpers for common cases.
 */
export const Errors = {
    unauthorized: (message = 'Authentication required') =>
        errorResponse(ErrorCodes.AUTH_REQUIRED, message, 401),

    forbidden: (message = 'Forbidden') =>
        errorResponse(ErrorCodes.FORBIDDEN, message, 403),

    notFound: (resource = 'Resource') =>
        errorResponse(ErrorCodes.NOT_FOUND, `${resource} not found`, 404),

    validation: (message: string, details?: Record<string, unknown>) =>
        errorResponse(ErrorCodes.VALIDATION_ERROR, message, 400, details),

    rateLimited: () =>
        errorResponse(ErrorCodes.RATE_LIMITED, 'Too many requests. Please try again later.', 429),

    conflict: (code: ErrorCode, message: string) =>
        errorResponse(code, message, 409),

    internal: (message = 'Internal server error') =>
        errorResponse(ErrorCodes.INTERNAL_ERROR, message, 500),
};
