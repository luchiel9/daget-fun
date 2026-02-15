'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { GlassCard, EmptyState } from '@/components/ui';

type ClaimItem = {
    claim_id: string;
    daget_id: string;
    daget_name: string;
    token_symbol: string;
    token_decimals: number;
    status: string;
    amount_base_units: number | null;
    tx_signature: string | null;
    created_at: string;
};

type FilterKey = 'all' | 'confirmed' | 'pending' | 'failed';

const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'pending', label: 'Pending' },
    { key: 'failed', label: 'Failed' },
];

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatAmount(baseUnits: number, decimals: number): string {
    return (baseUnits / Math.pow(10, decimals)).toFixed(2);
}

function statusBucket(status: string): FilterKey {
    if (status === 'confirmed' || status === 'released') return 'confirmed';
    if (status === 'failed_permanent' || status === 'failed_retryable') return 'failed';
    return 'pending'; // created, submitted
}

function statusBadge(status: string) {
    const map: Record<string, { className: string; label: string }> = {
        confirmed: {
            className: 'bg-green-500/10 text-green-400 border border-green-500/20',
            label: 'Confirmed',
        },
        submitted: {
            className: 'bg-blue-400/10 text-blue-400 border border-blue-400/20',
            label: 'Submitted',
        },
        created: {
            className: 'bg-blue-400/10 text-blue-400 border border-blue-400/20',
            label: 'Processing',
        },
        failed_permanent: {
            className: 'bg-red-500/10 text-red-400 border border-red-500/20',
            label: 'Failed',
        },
        failed_retryable: {
            className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
            label: 'Retrying',
        },
        released: {
            className: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
            label: 'Released',
        },
    };
    return map[status] || { className: 'bg-primary/10 text-primary border border-primary/20', label: status };
}

function tokenColor(symbol: string): string {
    if (symbol === 'USDC') return 'text-blue-400';
    if (symbol === 'USDT') return 'text-emerald-400';
    if (symbol === 'SOL') return 'text-purple-400';
    return 'text-primary';
}

function getTokenIcon(symbol: string): string | null {
    if (symbol === 'USDC') return 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png';
    if (symbol === 'USDT') return 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png';
    if (symbol === 'SOL') return 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png';
    return null;
}

export default function ClaimsHistoryPage() {
    const [claims, setClaims] = useState<ClaimItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterKey>('all');

    useEffect(() => {
        fetch('/api/claims')
            .then((r) => r.json())
            .then((data) => setClaims(data.items || []))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        if (filter === 'all') return claims;
        return claims.filter((c) => statusBucket(c.status) === filter);
    }, [claims, filter]);

    const totals = useMemo(() => {
        const acc: Record<string, number> = {};
        claims.forEach(c => {
            if ((c.status === 'confirmed' || c.status === 'released') && c.amount_base_units != null) {
                const amount = c.amount_base_units / Math.pow(10, c.token_decimals);
                acc[c.token_symbol] = (acc[c.token_symbol] || 0) + amount;
            }
        });
        return acc;
    }, [claims]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Lifetime Earnings */}
                    {Object.keys(totals).length > 0 && (
                        <div className="mb-8">
                            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Lifetime Earnings</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.entries(totals).map(([symbol, amount]) => (
                                    <GlassCard key={symbol} className="p-4 flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-primary/10`}>
                                            {getTokenIcon(symbol) ? (
                                                <img src={getTokenIcon(symbol)!} alt={symbol} className="w-6 h-6 object-contain" />
                                            ) : (
                                                <span className={`material-icons text-xl ${tokenColor(symbol)}`}>savings</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs text-text-muted font-semibold uppercase">{symbol}</p>
                                            <p className="text-lg font-bold text-text-primary font-mono">{amount.toFixed(2)}</p>
                                        </div>
                                    </GlassCard>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Filter Pills */}
                    <div className="flex items-center gap-2">
                        {FILTERS.map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 active:scale-[0.95] ${filter === f.key
                                    ? 'bg-primary/10 text-primary border border-primary/20'
                                    : 'text-text-secondary hover:text-primary hover:bg-primary/5 border border-transparent'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Claims List */}
                    {filtered.length === 0 ? (
                        <GlassCard className="p-6">
                            <EmptyState
                                icon="history"
                                title={filter === 'all' ? 'No claims yet' : `No ${filter} claims`}
                                description={
                                    filter === 'all'
                                        ? 'Claims you make will appear here.'
                                        : 'Try changing the filter to see other claims.'
                                }
                            />
                        </GlassCard>
                    ) : (
                        <div className="space-y-3">
                            {filtered.map((c) => {
                                const badge = statusBadge(c.status);
                                return (
                                    <GlassCard
                                        key={c.claim_id}
                                        className={`rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4 group ${c.status === 'failed_permanent' ? 'border-red-500/10' : ''
                                            }`}
                                        hover
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1.5">
                                                <Link
                                                    href={`/dagets/${c.daget_id}`}
                                                    className="font-semibold text-text-primary hover:text-primary transition-colors hover:underline decoration-primary/50 underline-offset-4"
                                                >
                                                    {c.daget_name}
                                                </Link>
                                            </div>
                                            <p className="text-xs text-text-muted">Claimed {new Date(c.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                        <div className="flex items-center gap-4 flex-shrink-0">
                                            <span
                                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badge.className}`}
                                            >
                                                {badge.label}
                                            </span>
                                            {c.amount_base_units != null && (
                                                <div className="flex items-center gap-2 bg-background-dark/30 px-3 py-1.5 rounded-lg border border-border-dark/30">
                                                    <span className="text-md font-bold font-mono text-text-primary">
                                                        {c.status === 'confirmed' ? '' : ''}
                                                        {formatAmount(c.amount_base_units, c.token_decimals)}
                                                    </span>
                                                    <span className={`text-xs font-semibold ${tokenColor(c.token_symbol)}`}>
                                                        {c.token_symbol}
                                                    </span>
                                                </div>
                                            )}
                                            {c.tx_signature && (
                                                <a
                                                    href={`https://solscan.io/tx/${c.tx_signature}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-mono text-primary hover:underline bg-primary/5 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors hover:bg-primary/10"
                                                    title="View on Solscan"
                                                >
                                                    {c.tx_signature.slice(0, 4)}...{c.tx_signature.slice(-4)}{' '}
                                                    <span className="material-icons text-[14px]">open_in_new</span>
                                                </a>
                                            )}
                                        </div>
                                    </GlassCard>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>

    );
}
