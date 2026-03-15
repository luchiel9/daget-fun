'use client';

import { useEffect, useRef } from 'react';

const POLL_INTERVAL_MS = 5000;

interface UseRaffleStatusPollingOptions {
    dagetType: string | null;
    status: string | null;
    raffleEndsAt: string | null;
    fetchDaget: () => void;
}

/**
 * Polls for daget status updates when a raffle countdown has expired
 * but the backend hasn't transitioned to 'drawing' or 'closed' yet.
 */
export function useRaffleStatusPolling({
    dagetType,
    status,
    raffleEndsAt,
    fetchDaget,
}: UseRaffleStatusPollingOptions) {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        // Only poll for raffles in transitional states
        const shouldPoll =
            dagetType === 'raffle' &&
            (status === 'active' || status === 'drawing') &&
            raffleEndsAt !== null &&
            new Date(raffleEndsAt).getTime() <= Date.now();

        if (!shouldPoll) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        intervalRef.current = setInterval(() => {
            fetchDaget();
        }, POLL_INTERVAL_MS);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [dagetType, status, raffleEndsAt, fetchDaget]);
}
