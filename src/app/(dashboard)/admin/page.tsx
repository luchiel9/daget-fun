'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, Spinner } from '@/components/ui';
import { useUser } from '@/components/sidebar';

/* ── Types ── */

interface Metrics {
    solPrice: number;
    users: {
        total: number;
        withAddress: number;
        withWallet: number;
        new24h: number;
        new7d: number;
        new30d: number;
    };
    dagets: {
        total: number;
        totalWinnerSlots: number;
        byStatus: Record<string, number>;
        byType: Record<string, number>;
        volumeByToken: {
            tokenSymbol: string;
            totalBaseUnits: number;
            tokenDecimals: number;
            dagetCount: number;
            totalUsd: number;
        }[];
        totalFundedUsd: number;
    };
    claims: {
        total: number;
        byStatus: Record<string, number>;
        claimedByToken: {
            tokenSymbol: string;
            totalBaseUnits: number;
            tokenDecimals: number;
            claimCount: number;
            totalUsd: number;
        }[];
        totalClaimedUsd: number;
        successRate: number;
    };
    health: {
        pendingQueue: number;
        stuckClaims: number;
        failedPermanent: number;
    };
    timeSeries: {
        dailyDagets: { date: string; count: number }[];
        dailyClaims: { date: string; count: number }[];
    };
}

interface UserRow {
    id: string;
    discord_user_id: string;
    discord_username: string | null;
    discord_avatar_url: string | null;
    receiving_address: string | null;
    is_admin: boolean;
    created_at: string;
    last_login_at: string | null;
    dagets_created: number;
    funded_usd: number;
    total_claims: number;
    confirmed_claims: number;
    claimed_usd: number;
}

/* ── Helpers ── */

function formatUsd(n: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}

function formatNumber(n: number): string {
    return new Intl.NumberFormat('en-US').format(n);
}

function formatTokenAmount(baseUnits: number, decimals: number, symbol: string): string {
    const display = baseUnits / 10 ** decimals;
    const dp = symbol === 'SOL' ? 4 : 2;
    return display.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function truncateAddress(addr: string): string {
    if (!addr || addr.length <= 11) return addr || '';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

const TOKEN_COLORS: Record<string, string> = {
    SOL: 'text-violet-400',
    USDC: 'text-blue-400',
    USDT: 'text-emerald-400',
};

/* ── Main Page ── */

export default function AdminPage() {
    const { user } = useUser();
    const router = useRouter();
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [usersLoading, setUsersLoading] = useState(true);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [searchDebounce, setSearchDebounce] = useState('');

    // Redirect non-admins
    useEffect(() => {
        if (user && !user.isAdmin) router.replace('/dashboard');
    }, [user, router]);

    const fetchMetrics = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/metrics');
            if (res.status === 403) { router.replace('/dashboard'); return; }
            if (res.ok) setMetrics(await res.json());
        } catch { /* ignore */ }
    }, [router]);

    const fetchUsers = useCallback(async (cursor?: string) => {
        try {
            setUsersLoading(true);
            const params = new URLSearchParams();
            if (cursor) params.append('cursor', cursor);
            if (searchDebounce) params.append('search', searchDebounce);
            const res = await fetch(`/api/admin/users?${params}`);
            if (res.ok) {
                const data = await res.json();
                if (cursor) {
                    setUsers(prev => [...prev, ...data.users]);
                } else {
                    setUsers(data.users);
                }
                setNextCursor(data.next_cursor);
            }
        } catch { /* ignore */ } finally { setUsersLoading(false); }
    }, [searchDebounce]);

    useEffect(() => {
        fetchMetrics();
        // Refresh metrics every 60s
        const interval = setInterval(fetchMetrics, 60000);
        return () => clearInterval(interval);
    }, [fetchMetrics]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setSearchDebounce(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => { setLoading(!metrics); }, [metrics]);

    if (!user?.isAdmin) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    const m = metrics!;

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="material-icons text-primary text-[22px]">admin_panel_settings</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-text-primary">Admin Dashboard</h1>
                        <p className="text-xs text-text-muted">Platform overview and metrics</p>
                    </div>
                    <div className="ml-auto text-xs text-text-muted">
                        SOL/USD: <span className="font-mono text-text-secondary">${m.solPrice.toFixed(2)}</span>
                    </div>
                </div>

                {/* ─── Top-Level KPIs ─── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard
                        icon="group"
                        label="Total Users"
                        value={formatNumber(m.users.total)}
                        sub={`+${m.users.new24h} today`}
                    />
                    <KpiCard
                        icon="redeem"
                        label="Dagets Created"
                        value={formatNumber(m.dagets.total)}
                        sub={`${formatNumber(m.dagets.totalWinnerSlots)} winner slots`}
                    />
                    <KpiCard
                        icon="payments"
                        label="Total Funded"
                        value={formatUsd(m.dagets.totalFundedUsd)}
                        sub={`across ${m.dagets.total} dagets`}
                    />
                    <KpiCard
                        icon="check_circle"
                        label="Total Claimed"
                        value={formatUsd(m.claims.totalClaimedUsd)}
                        sub={`${m.claims.successRate}% success rate`}
                    />
                </div>

                {/* ─── Platform Health ─── */}
                <div>
                    <SectionLabel icon="monitor_heart" label="Platform Health" />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
                        <HealthCard
                            label="Queue Depth"
                            value={m.health.pendingQueue}
                            status={m.health.pendingQueue > 50 ? 'warning' : 'ok'}
                        />
                        <HealthCard
                            label="Stuck Claims"
                            value={m.health.stuckClaims}
                            status={m.health.stuckClaims > 0 ? 'danger' : 'ok'}
                        />
                        <HealthCard
                            label="Failed Permanent"
                            value={m.health.failedPermanent}
                            status={m.health.failedPermanent > 10 ? 'danger' : m.health.failedPermanent > 0 ? 'warning' : 'ok'}
                        />
                        <HealthCard
                            label="Success Rate"
                            value={`${m.claims.successRate}%`}
                            status={m.claims.successRate < 95 ? 'warning' : 'ok'}
                        />
                    </div>
                </div>

                {/* ─── Volume Breakdown ─── */}
                <div>
                    <SectionLabel icon="bar_chart" label="Volume by Token" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                        {['SOL', 'USDC', 'USDT'].map(symbol => {
                            const funded = m.dagets.volumeByToken.find(v => v.tokenSymbol === symbol);
                            const claimed = m.claims.claimedByToken.find(v => v.tokenSymbol === symbol);
                            return (
                                <TokenVolumeCard
                                    key={symbol}
                                    symbol={symbol}
                                    fundedBaseUnits={funded?.totalBaseUnits || 0}
                                    fundedUsd={funded?.totalUsd || 0}
                                    fundedCount={funded?.dagetCount || 0}
                                    claimedBaseUnits={claimed?.totalBaseUnits || 0}
                                    claimedUsd={claimed?.totalUsd || 0}
                                    claimedCount={claimed?.claimCount || 0}
                                    decimals={funded?.tokenDecimals || claimed?.tokenDecimals || (symbol === 'SOL' ? 9 : 6)}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* ─── User & Daget Stats Row ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* User Growth */}
                    <GlassCard className="p-5">
                        <SectionLabel icon="trending_up" label="User Growth" />
                        <div className="grid grid-cols-3 gap-4 mt-4">
                            <MiniStat label="Last 24h" value={`+${m.users.new24h}`} />
                            <MiniStat label="Last 7d" value={`+${m.users.new7d}`} />
                            <MiniStat label="Last 30d" value={`+${m.users.new30d}`} />
                        </div>
                        <div className="border-t border-border-dark/40 mt-4 pt-4 grid grid-cols-2 gap-4">
                            <MiniStat label="With Wallet" value={formatNumber(m.users.withWallet)} />
                            <MiniStat label="With Recv Address" value={formatNumber(m.users.withAddress)} />
                        </div>
                    </GlassCard>

                    {/* Daget Breakdown */}
                    <GlassCard className="p-5">
                        <SectionLabel icon="donut_small" label="Daget Breakdown" />
                        <div className="grid grid-cols-3 gap-4 mt-4">
                            <MiniStat label="Active" value={formatNumber(m.dagets.byStatus['active'] || 0)} color="text-green-400" />
                            <MiniStat label="Stopped" value={formatNumber(m.dagets.byStatus['stopped'] || 0)} color="text-yellow-400" />
                            <MiniStat label="Closed" value={formatNumber(m.dagets.byStatus['closed'] || 0)} color="text-slate-400" />
                        </div>
                        <div className="border-t border-border-dark/40 mt-4 pt-4 grid grid-cols-2 gap-4">
                            <MiniStat label="Fixed Type" value={formatNumber(m.dagets.byType['fixed'] || 0)} />
                            <MiniStat label="Random Type" value={formatNumber(m.dagets.byType['random'] || 0)} />
                        </div>
                    </GlassCard>
                </div>

                {/* ─── Claims Breakdown ─── */}
                <div>
                    <SectionLabel icon="receipt_long" label="Claims Breakdown" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
                        <ClaimStatusCard label="Queued" value={m.claims.byStatus['created'] || 0} color="text-blue-400 bg-blue-500/10 border-blue-500/20" />
                        <ClaimStatusCard label="Processing" value={m.claims.byStatus['submitted'] || 0} color="text-indigo-400 bg-indigo-500/10 border-indigo-500/20" />
                        <ClaimStatusCard label="Confirmed" value={m.claims.byStatus['confirmed'] || 0} color="text-green-400 bg-green-500/10 border-green-500/20" />
                        <ClaimStatusCard label="Retrying" value={m.claims.byStatus['failed_retryable'] || 0} color="text-orange-400 bg-orange-500/10 border-orange-500/20" />
                        <ClaimStatusCard label="Failed" value={m.claims.byStatus['failed_permanent'] || 0} color="text-red-400 bg-red-500/10 border-red-500/20" />
                        <ClaimStatusCard label="Released" value={m.claims.byStatus['released'] || 0} color="text-slate-400 bg-slate-500/10 border-slate-500/20" />
                    </div>
                </div>

                {/* ─── Activity Charts ─── */}
                {(m.timeSeries.dailyDagets.length > 0 || m.timeSeries.dailyClaims.length > 0) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <MiniBarChart
                            title="Dagets Created"
                            subtitle="Last 30 days"
                            data={m.timeSeries.dailyDagets}
                            color="bg-primary"
                        />
                        <MiniBarChart
                            title="Claims"
                            subtitle="Last 30 days"
                            data={m.timeSeries.dailyClaims}
                            color="bg-blue-400"
                        />
                    </div>
                )}

                {/* ─── Users Table ─── */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <SectionLabel icon="people" label="All Users" />
                        <div className="relative">
                            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px]">search</span>
                            <input
                                type="text"
                                placeholder="Search by username..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 rounded-lg bg-background-dark/50 border border-border-dark/60 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 w-64"
                            />
                        </div>
                    </div>
                    <GlassCard className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border-dark/40">
                                        <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">User</th>
                                        <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted hidden md:table-cell">Recv Address</th>
                                        <th className="text-center px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Dagets</th>
                                        <th className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted hidden sm:table-cell">Funded</th>
                                        <th className="text-center px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Claims</th>
                                        <th className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted hidden sm:table-cell">Claimed</th>
                                        <th className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted hidden sm:table-cell">Joined</th>
                                        <th className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted hidden lg:table-cell">Last Login</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id} className="border-b border-border-dark/20 hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    {u.discord_avatar_url ? (
                                                        <img src={u.discord_avatar_url} alt="" className="w-7 h-7 rounded-full" />
                                                    ) : (
                                                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                                            {(u.discord_username || '?')[0].toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="text-text-primary font-medium truncate max-w-[150px]">
                                                            {u.discord_username || 'Unknown'}
                                                            {u.is_admin && (
                                                                <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">Admin</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                {u.receiving_address ? (
                                                    <span className="font-mono text-xs text-text-secondary">{truncateAddress(u.receiving_address)}</span>
                                                ) : (
                                                    <span className="text-text-muted text-xs">Not set</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="font-mono text-text-primary">{u.dagets_created}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right hidden sm:table-cell">
                                                <span className="font-mono text-xs text-text-primary">{u.funded_usd > 0 ? formatUsd(u.funded_usd) : '—'}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="font-mono text-text-primary">{u.confirmed_claims}</span>
                                                <span className="text-text-muted">/{u.total_claims}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right hidden sm:table-cell">
                                                <span className="font-mono text-xs text-text-primary">{u.claimed_usd > 0 ? formatUsd(u.claimed_usd) : '—'}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs text-text-secondary hidden sm:table-cell">
                                                {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs text-text-muted hidden lg:table-cell">
                                                {u.last_login_at ? timeAgo(u.last_login_at) : 'Never'}
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && !usersLoading && (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-12 text-center text-text-muted">
                                                {searchDebounce ? 'No users match your search' : 'No users found'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {usersLoading && (
                            <div className="flex justify-center py-6">
                                <Spinner size="md" />
                            </div>
                        )}
                        {nextCursor && !usersLoading && (
                            <div className="flex justify-center py-4 border-t border-border-dark/20">
                                <button
                                    onClick={() => fetchUsers(nextCursor)}
                                    className="px-5 py-2 rounded-lg text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
                                >
                                    Load more
                                </button>
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}

/* ── Sub-components ── */

function SectionLabel({ icon, label }: { icon: string; label: string }) {
    return (
        <div className="flex items-center gap-2">
            <span className="material-icons text-text-muted text-[18px]">{icon}</span>
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">{label}</h2>
        </div>
    );
}

function KpiCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
    return (
        <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="material-icons text-primary text-[18px]">{icon}</span>
                </div>
                <span className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-2xl font-bold text-text-primary font-mono">{value}</div>
            <div className="text-xs text-text-muted mt-1">{sub}</div>
        </GlassCard>
    );
}

function HealthCard({ label, value, status }: { label: string; value: number | string; status: 'ok' | 'warning' | 'danger' }) {
    const colors = {
        ok: 'text-green-400 bg-green-500/10 border-green-500/20',
        warning: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
        danger: 'text-red-400 bg-red-500/10 border-red-500/20',
    };
    const dotColors = {
        ok: 'bg-green-400',
        warning: 'bg-yellow-400',
        danger: 'bg-red-400',
    };
    return (
        <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-muted">{label}</span>
                <span className={`w-2 h-2 rounded-full ${dotColors[status]}`} />
            </div>
            <div className={`text-xl font-bold font-mono ${status === 'ok' ? 'text-text-primary' : colors[status].split(' ')[0]}`}>
                {value}
            </div>
        </GlassCard>
    );
}

function TokenVolumeCard({
    symbol, fundedBaseUnits, fundedUsd, fundedCount,
    claimedBaseUnits, claimedUsd, claimedCount, decimals,
}: {
    symbol: string; fundedBaseUnits: number; fundedUsd: number; fundedCount: number;
    claimedBaseUnits: number; claimedUsd: number; claimedCount: number; decimals: number;
}) {
    const tokenIconUrl: Record<string, string> = {
        SOL: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png',
        USDC: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png',
        USDT: 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png',
    };

    return (
        <GlassCard className="p-5">
            <div className="flex items-center gap-3 mb-4">
                <img src={tokenIconUrl[symbol]} alt={symbol} className="w-8 h-8 rounded-full" />
                <span className={`text-lg font-bold ${TOKEN_COLORS[symbol] || 'text-text-primary'}`}>{symbol}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1">Funded</div>
                    <div className="text-lg font-bold font-mono text-text-primary">
                        {formatTokenAmount(fundedBaseUnits, decimals, symbol)}
                    </div>
                    <div className="text-xs text-text-muted">
                        {formatUsd(fundedUsd)} &middot; {fundedCount} daget{fundedCount !== 1 ? 's' : ''}
                    </div>
                </div>
                <div>
                    <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1">Claimed</div>
                    <div className="text-lg font-bold font-mono text-text-primary">
                        {formatTokenAmount(claimedBaseUnits, decimals, symbol)}
                    </div>
                    <div className="text-xs text-text-muted">
                        {formatUsd(claimedUsd)} &middot; {claimedCount} claim{claimedCount !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>
        </GlassCard>
    );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div>
            <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1">{label}</div>
            <div className={`text-lg font-bold font-mono ${color || 'text-text-primary'}`}>{value}</div>
        </div>
    );
}

function ClaimStatusCard({ label, value, color }: { label: string; value: number; color: string }) {
    const [bgColor, borderColor] = color.split(' ').slice(1);
    return (
        <GlassCard className={`p-3 border ${borderColor} ${bgColor}`}>
            <div className="text-[11px] font-medium uppercase tracking-wider text-text-muted mb-1">{label}</div>
            <div className={`text-xl font-bold font-mono ${color.split(' ')[0]}`}>{formatNumber(value)}</div>
        </GlassCard>
    );
}

function MiniBarChart({
    title, subtitle, data, color,
}: {
    title: string; subtitle: string; data: { date: string; count: number }[]; color: string;
}) {
    const maxCount = Math.max(...data.map(d => d.count), 1);

    return (
        <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <div className="text-sm font-semibold text-text-primary">{title}</div>
                    <div className="text-xs text-text-muted">{subtitle}</div>
                </div>
                <div className="text-right">
                    <div className="text-lg font-bold font-mono text-text-primary">
                        {formatNumber(data.reduce((sum, d) => sum + d.count, 0))}
                    </div>
                    <div className="text-[11px] text-text-muted">total</div>
                </div>
            </div>
            <div className="flex items-end gap-[2px] h-16">
                {data.map((d, i) => (
                    <div
                        key={d.date}
                        className="flex-1 group relative"
                        style={{ height: '100%' }}
                    >
                        <div
                            className={`${color} rounded-sm opacity-70 group-hover:opacity-100 transition-opacity absolute bottom-0 left-0 right-0`}
                            style={{ height: `${Math.max((d.count / maxCount) * 100, 2)}%` }}
                        />
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-card-dark border border-border-dark/60 rounded px-2 py-1 text-[10px] font-mono text-text-primary whitespace-nowrap z-10">
                            {d.count} &middot; {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                    </div>
                ))}
            </div>
        </GlassCard>
    );
}
