import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRaffleStatusPolling } from '../useRaffleStatusPolling';

describe('useRaffleStatusPolling', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not poll when daget is not a raffle', () => {
        const onStatusChange = vi.fn();
        renderHook(() =>
            useRaffleStatusPolling({
                dagetType: 'fixed',
                status: 'active',
                raffleEndsAt: null,
                fetchDaget: onStatusChange,
            })
        );

        act(() => { vi.advanceTimersByTime(10000); });
        expect(onStatusChange).not.toHaveBeenCalled();
    });

    it('does not poll when raffle is still counting down (not expired)', () => {
        const onStatusChange = vi.fn();
        const futureDate = new Date(Date.now() + 60000).toISOString(); // 1 min from now

        renderHook(() =>
            useRaffleStatusPolling({
                dagetType: 'raffle',
                status: 'active',
                raffleEndsAt: futureDate,
                fetchDaget: onStatusChange,
            })
        );

        act(() => { vi.advanceTimersByTime(10000); });
        expect(onStatusChange).not.toHaveBeenCalled();
    });

    it('polls when raffle countdown has expired and status is still active', () => {
        const fetchDaget = vi.fn();
        const pastDate = new Date(Date.now() - 5000).toISOString(); // 5 sec ago

        renderHook(() =>
            useRaffleStatusPolling({
                dagetType: 'raffle',
                status: 'active',
                raffleEndsAt: pastDate,
                fetchDaget,
            })
        );

        // Should poll every 5 seconds
        act(() => { vi.advanceTimersByTime(5000); });
        expect(fetchDaget).toHaveBeenCalledTimes(1);

        act(() => { vi.advanceTimersByTime(5000); });
        expect(fetchDaget).toHaveBeenCalledTimes(2);
    });

    it('polls when status is drawing', () => {
        const fetchDaget = vi.fn();
        const pastDate = new Date(Date.now() - 60000).toISOString();

        renderHook(() =>
            useRaffleStatusPolling({
                dagetType: 'raffle',
                status: 'drawing',
                raffleEndsAt: pastDate,
                fetchDaget,
            })
        );

        act(() => { vi.advanceTimersByTime(5000); });
        expect(fetchDaget).toHaveBeenCalledTimes(1);
    });

    it('stops polling when status becomes closed', () => {
        const fetchDaget = vi.fn();
        const pastDate = new Date(Date.now() - 60000).toISOString();

        renderHook(() =>
            useRaffleStatusPolling({
                dagetType: 'raffle',
                status: 'closed',
                raffleEndsAt: pastDate,
                fetchDaget,
            })
        );

        act(() => { vi.advanceTimersByTime(10000); });
        expect(fetchDaget).not.toHaveBeenCalled();
    });

    it('stops polling when status becomes stopped', () => {
        const fetchDaget = vi.fn();
        const pastDate = new Date(Date.now() - 60000).toISOString();

        renderHook(() =>
            useRaffleStatusPolling({
                dagetType: 'raffle',
                status: 'stopped',
                raffleEndsAt: pastDate,
                fetchDaget,
            })
        );

        act(() => { vi.advanceTimersByTime(10000); });
        expect(fetchDaget).not.toHaveBeenCalled();
    });

    it('cleans up interval on unmount', () => {
        const fetchDaget = vi.fn();
        const pastDate = new Date(Date.now() - 5000).toISOString();

        const { unmount } = renderHook(() =>
            useRaffleStatusPolling({
                dagetType: 'raffle',
                status: 'active',
                raffleEndsAt: pastDate,
                fetchDaget,
            })
        );

        unmount();
        act(() => { vi.advanceTimersByTime(15000); });
        expect(fetchDaget).not.toHaveBeenCalled();
    });
});
