import { db } from '@/db';
import { idempotencyKeys } from '@/db/schema';
import { and, eq, gt } from 'drizzle-orm';
import crypto from 'crypto';
import { ErrorCodes, errorResponse } from './errors';
import { NextResponse } from 'next/server';

/**
 * Idempotency key handling per blueprint §4.7.
 *
 * Same key + same user + same endpoint + same body → replay original response.
 * Same key + different body → 409 IDEMPOTENCY_CONFLICT.
 * Records retained for 24 hours.
 */

function hashBody(body: unknown): string {
    const normalized = JSON.stringify(body, Object.keys(body as object).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Check if an idempotency key has been used before.
 * Returns the cached response if replay, or null to proceed.
 * Throws a NextResponse for conflict.
 */
export async function checkIdempotency(
    key: string,
    userId: string,
    endpoint: string,
    body: unknown,
): Promise<NextResponse | null> {
    const bodyHash = hashBody(body);

    const existing = await db.query.idempotencyKeys.findFirst({
        where: and(
            eq(idempotencyKeys.key, key),
            eq(idempotencyKeys.userId, userId),
            eq(idempotencyKeys.endpoint, endpoint),
            gt(idempotencyKeys.expiresAt, new Date()),
        ),
    });

    if (!existing) return null;

    // Same key exists — check if same body
    if (existing.requestBodyHash !== bodyHash) {
        return errorResponse(
            ErrorCodes.IDEMPOTENCY_CONFLICT,
            'Idempotency key already used with a different request body',
            409,
        );
    }

    // Replay the original response
    return NextResponse.json(
        JSON.parse(existing.responseBody),
        { status: existing.responseStatus },
    );
}

/**
 * Store the idempotency key and response for future replay.
 */
export async function storeIdempotency(
    key: string,
    userId: string,
    endpoint: string,
    body: unknown,
    responseStatus: number,
    responseBody: unknown,
): Promise<void> {
    const bodyHash = hashBody(body);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await db.insert(idempotencyKeys).values({
        key,
        userId,
        endpoint,
        requestBodyHash: bodyHash,
        responseStatus,
        responseBody: JSON.stringify(responseBody),
        expiresAt,
    }).onConflictDoNothing();
}
