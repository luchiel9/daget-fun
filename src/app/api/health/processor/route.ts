import { NextResponse } from 'next/server';
import { Errors } from '@/lib/errors';

// Processor state (in-memory, same process)
let loopRunning = false;
let lastTickAt: Date | null = null;
let lastClaimProcessedAt: Date | null = null;
let pendingClaimsCount = 0;

// These are updated by the worker process
export function updateProcessorState(state: {
    loopRunning?: boolean;
    lastTickAt?: Date;
    lastClaimProcessedAt?: Date;
    pendingClaimsCount?: number;
}) {
    if (state.loopRunning !== undefined) loopRunning = state.loopRunning;
    if (state.lastTickAt) lastTickAt = state.lastTickAt;
    if (state.lastClaimProcessedAt) lastClaimProcessedAt = state.lastClaimProcessedAt;
    if (state.pendingClaimsCount !== undefined) pendingClaimsCount = state.pendingClaimsCount;
}

export async function GET(request: Request) {
    // Validate internal auth token
    const token = request.headers.get('X-Internal-Token');
    const expectedToken = process.env.PROCESSOR_HEALTH_TOKEN;

    if (!expectedToken || token !== expectedToken) {
        return Errors.unauthorized();
    }

    return NextResponse.json({
        loop_running: loopRunning,
        last_tick_at: lastTickAt?.toISOString() || null,
        last_claim_processed_at: lastClaimProcessedAt?.toISOString() || null,
        pending_claims_count: pendingClaimsCount,
    });
}
