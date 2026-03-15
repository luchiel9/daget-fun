'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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
    const [activeTab, setActiveTab] = useState<'metrics' | 'users'>('metrics');
    const [sortKey, setSortKey] = useState<keyof UserRow>('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const toggleSort = useCallback((key: keyof UserRow) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    }, [sortKey]);

    const sortedUsers = useMemo(() => {
        return [...users].sort((a, b) => {
            const av = a[sortKey];
            const bv = b[sortKey];
            if (av == null && bv == null) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            let cmp: number;
            if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
            else if (typeof av === 'boolean' && typeof bv === 'boolean') cmp = (av ? 1 : 0) - (bv ? 1 : 0);
            else cmp = String(av).localeCompare(String(bv));
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [users, sortKey, sortDir]);

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
        const interval = setInterval(fetchMetrics, 60000);
        return () => clearInterval(interval);
    }, [fetchMetrics]);

    useEffect(() => {
        if (activeTab === 'users') fetchUsers();
    }, [fetchUsers, activeTab]);

    useEffect(() => {
        const t = setTimeout(() => setSearchDebounce(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => { setLoading(!metrics); }, [metrics]);

    if (!user?.isAdmin) {
        return <div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>;
    }

    if (loading) {
        return <div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>;
    }

    const m = metrics!;

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* ── Header ── */}
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <span className="material-icons text-primary text-[22px]">admin_panel_settings</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-text-primary">Admin Dashboard</h1>
                            <p className="text-xs text-text-muted">Platform overview</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <HealthIndicator health={m.health} successRate={m.claims.successRate} />
                        <span className="h-5 w-px bg-border-dark/40" />
                        <span className="text-xs text-text-muted">
                            SOL <span className="font-mono text-text-secondary font-medium">${m.solPrice.toFixed(2)}</span>
                        </span>
                    </div>
                </header>

                {/* ── Tabs ── */}
                <div className="flex gap-1 border-b border-border-dark/40">
                    {(['metrics', 'users'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2.5 text-sm font-medium transition-colors relative capitalize ${
                                activeTab === tab
                                    ? 'text-primary'
                                    : 'text-text-muted hover:text-text-secondary'
                            }`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Metrics Tab ── */}
                {activeTab === 'metrics' && <>

                {/* ── KPI Row ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard accent="border-l-violet-400" label="Total Users" value={formatNumber(m.users.total)} sub={`+${m.users.new24h} today`} />
                    <KpiCard accent="border-l-blue-400" label="Dagets Created" value={formatNumber(m.dagets.total)} sub={`${formatNumber(m.dagets.totalWinnerSlots)} winner slots`} />
                    <KpiCard accent="border-l-emerald-400" label="Total Funded" value={formatUsd(m.dagets.totalFundedUsd)} sub={`across ${m.dagets.total} dagets`} />
                    <KpiCard accent="border-l-amber-400" label="Total Claimed" value={formatUsd(m.claims.totalClaimedUsd)} sub={`${m.claims.successRate}% success`} />
                </div>

                {/* ── Token Volume ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                {/* ── Charts + Breakdown ── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-3 space-y-4">
                        <ActivityChart
                            title="Dagets Created"
                            data={m.timeSeries.dailyDagets}
                            color="bg-primary"
                        />
                        <ActivityChart
                            title="Claims"
                            data={m.timeSeries.dailyClaims}
                            color="bg-blue-400"
                        />
                    </div>

                    <GlassCard className="lg:col-span-2 p-5 flex flex-col gap-5">
                        {/* User Growth */}
                        <div>
                            <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">User Growth</h3>
                            <div className="grid grid-cols-3 gap-2">
                                <StatCell label="24h" value={`+${m.users.new24h}`} />
                                <StatCell label="7d" value={`+${m.users.new7d}`} />
                                <StatCell label="30d" value={`+${m.users.new30d}`} />
                            </div>
                            <div className="flex gap-4 mt-3">
                                <span className="text-xs text-text-muted">Wallet <span className="font-mono text-text-secondary font-medium">{formatNumber(m.users.withWallet)}</span></span>
                                <span className="text-xs text-text-muted">Address <span className="font-mono text-text-secondary font-medium">{formatNumber(m.users.withAddress)}</span></span>
                            </div>
                        </div>

                        <hr className="border-border-dark/30" />

                        {/* Daget Breakdown */}
                        <div>
                            <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Dagets</h3>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(m.dagets.byStatus).map(([status, count]) => (
                                    <DagetStatusPill key={status} status={status} count={count} />
                                ))}
                            </div>
                            <div className="flex gap-4 mt-3">
                                {Object.entries(m.dagets.byType).map(([type, count]) => (
                                    <span key={type} className="text-xs text-text-muted capitalize">
                                        {type} <span className="font-mono text-text-secondary font-medium">{formatNumber(count)}</span>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <hr className="border-border-dark/30" />

                        {/* Claims Pipeline */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Claims Pipeline</h3>
                                <span className="text-xs text-text-muted font-mono">{formatNumber(m.claims.total)} total</span>
                            </div>
                            <ClaimsPipeline byStatus={m.claims.byStatus} />
                        </div>
                    </GlassCard>
                </div>

                </>}

                {/* ── Users Tab ── */}
                {activeTab === 'users' && <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-text-secondary">All Users</h2>
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
                                        <SortTh label="User" field="discord_username" align="left" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                                        <SortTh label="Recv Address" field="receiving_address" align="left" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="hidden md:table-cell" />
                                        <SortTh label="Dagets" field="dagets_created" align="center" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                                        <SortTh label="Funded" field="funded_usd" align="right" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="hidden sm:table-cell" />
                                        <SortTh label="Claims" field="confirmed_claims" align="center" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                                        <SortTh label="Claimed" field="claimed_usd" align="right" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="hidden sm:table-cell" />
                                        <SortTh label="Joined" field="created_at" align="right" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="hidden sm:table-cell" />
                                        <SortTh label="Last Login" field="last_login_at" align="right" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="hidden lg:table-cell" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedUsers.map(u => (
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
                                                <span className="font-mono text-xs text-text-primary">{u.funded_usd > 0 ? formatUsd(u.funded_usd) : '\u2014'}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="font-mono text-text-primary">{u.confirmed_claims}</span>
                                                <span className="text-text-muted">/{u.total_claims}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right hidden sm:table-cell">
                                                <span className="font-mono text-xs text-text-primary">{u.claimed_usd > 0 ? formatUsd(u.claimed_usd) : '\u2014'}</span>
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
                </div>}
            </div>
        </div>
    );
}

/* ── Sub-components ── */

function HealthIndicator({ health, successRate }: { health: Metrics['health']; successRate: number }) {
    const issues: { label: string; severity: 'warning' | 'danger' }[] = [];

    if (health.stuckClaims > 0)
        issues.push({ label: `${health.stuckClaims} stuck`, severity: 'danger' });
    if (health.failedPermanent > 10)
        issues.push({ label: `${health.failedPermanent} failed`, severity: 'danger' });
    else if (health.failedPermanent > 0)
        issues.push({ label: `${health.failedPermanent} failed`, severity: 'warning' });
    if (health.pendingQueue > 50)
        issues.push({ label: `Queue: ${health.pendingQueue}`, severity: 'warning' });
    if (successRate < 95)
        issues.push({ label: `${successRate}% success`, severity: 'warning' });

    if (issues.length === 0) {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Healthy
            </span>
        );
    }

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {issues.map((issue, i) => (
                <span
                    key={i}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        issue.severity === 'danger'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}
                >
                    <span className={`w-1 h-1 rounded-full ${issue.severity === 'danger' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                    {issue.label}
                </span>
            ))}
        </div>
    );
}

function KpiCard({ accent, label, value, sub }: { accent: string; label: string; value: string; sub: string }) {
    return (
        <GlassCard className={`p-5 border-l-2 ${accent}`}>
            <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-2">{label}</div>
            <div className="text-2xl font-bold text-text-primary font-mono">{value}</div>
            <div className="text-xs text-text-muted mt-1">{sub}</div>
        </GlassCard>
    );
}

function StatCell({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-white/[0.03] rounded-lg px-3 py-2">
            <div className="text-[10px] text-text-muted uppercase tracking-wider">{label}</div>
            <div className="text-lg font-bold font-mono text-text-primary">{value}</div>
        </div>
    );
}

const DAGET_STATUS_COLORS: Record<string, string> = {
    active: 'bg-green-500/10 text-green-400',
    stopped: 'bg-yellow-500/10 text-yellow-400',
    closed: 'bg-slate-500/10 text-slate-400',
    draft: 'bg-blue-500/10 text-blue-400',
};

function DagetStatusPill({ status, count }: { status: string; count: number }) {
    const colorClass = DAGET_STATUS_COLORS[status] || 'bg-slate-500/10 text-slate-400';
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${colorClass}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            <span className="font-mono">{formatNumber(count)}</span>
            <span className="capitalize">{status}</span>
        </span>
    );
}

const PIPELINE_ITEMS = [
    { key: 'confirmed', label: 'Confirmed', color: 'bg-green-400' },
    { key: 'created', label: 'Queued', color: 'bg-blue-400' },
    { key: 'submitted', label: 'Processing', color: 'bg-indigo-400' },
    { key: 'failed_retryable', label: 'Retrying', color: 'bg-orange-400' },
    { key: 'failed_permanent', label: 'Failed', color: 'bg-red-400' },
    { key: 'released', label: 'Released', color: 'bg-slate-400' },
];

function ClaimsPipeline({ byStatus }: { byStatus: Record<string, number> }) {
    const maxCount = Math.max(...PIPELINE_ITEMS.map(i => byStatus[i.key] || 0), 1);

    return (
        <div className="space-y-2">
            {PIPELINE_ITEMS.map(item => {
                const count = byStatus[item.key] || 0;
                const pct = (count / maxCount) * 100;
                return (
                    <div key={item.key} className="flex items-center gap-3">
                        <span className="text-[11px] text-text-muted w-[72px] shrink-0 text-right">{item.label}</span>
                        <div className="flex-1 h-5 bg-white/[0.03] rounded overflow-hidden">
                            {count > 0 && (
                                <div
                                    className={`${item.color} h-full rounded opacity-50`}
                                    style={{ width: `${Math.max(pct, 3)}%` }}
                                />
                            )}
                        </div>
                        <span className="text-xs font-mono text-text-secondary w-12 text-right">{formatNumber(count)}</span>
                    </div>
                );
            })}
        </div>
    );
}

function SortTh({ label, field, align, sortKey, sortDir, onSort, className = '' }: {
    label: string; field: keyof UserRow; align: 'left' | 'center' | 'right';
    sortKey: keyof UserRow; sortDir: 'asc' | 'desc';
    onSort: (key: keyof UserRow) => void; className?: string;
}) {
    const active = sortKey === field;
    return (
        <th
            className={`text-${align} px-4 py-3 text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none group ${
                active ? 'text-primary' : 'text-text-muted hover:text-text-secondary'
            } ${className}`}
            onClick={() => onSort(field)}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                <span className={`material-icons text-[14px] transition-transform ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'} ${active && sortDir === 'asc' ? 'rotate-180' : ''}`}>
                    arrow_downward
                </span>
            </span>
        </th>
    );
}

const TOKEN_ICON_URL: Record<string, string> = {
    SOL: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png',
    USDC: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png',
    USDT: 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png',
};

const TOKEN_COLORS: Record<string, string> = {
    SOL: 'text-violet-400',
    USDC: 'text-blue-400',
    USDT: 'text-emerald-400',
};

function TokenVolumeCard({
    symbol, fundedBaseUnits, fundedUsd, fundedCount,
    claimedBaseUnits, claimedUsd, claimedCount, decimals,
}: {
    symbol: string; fundedBaseUnits: number; fundedUsd: number; fundedCount: number;
    claimedBaseUnits: number; claimedUsd: number; claimedCount: number; decimals: number;
}) {
    return (
        <GlassCard className="px-4 py-3">
            <div className="flex items-center gap-2.5 mb-2.5">
                <img src={TOKEN_ICON_URL[symbol]} alt={symbol} className="w-6 h-6 rounded-full" />
                <span className={`text-sm font-bold ${TOKEN_COLORS[symbol] || 'text-text-primary'}`}>{symbol}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <div className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-0.5">Funded</div>
                    <div className="text-base font-bold font-mono text-text-primary leading-tight">
                        {formatTokenAmount(fundedBaseUnits, decimals, symbol)}
                    </div>
                    <div className="text-[11px] text-text-muted">
                        {formatUsd(fundedUsd)} &middot; {fundedCount} daget{fundedCount !== 1 ? 's' : ''}
                    </div>
                </div>
                <div>
                    <div className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-0.5">Claimed</div>
                    <div className="text-base font-bold font-mono text-text-primary leading-tight">
                        {formatTokenAmount(claimedBaseUnits, decimals, symbol)}
                    </div>
                    <div className="text-[11px] text-text-muted">
                        {formatUsd(claimedUsd)} &middot; {claimedCount} claim{claimedCount !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>
        </GlassCard>
    );
}

function ActivityChart({
    title, data, color,
}: {
    title: string; data: { date: string; count: number }[]; color: string;
}) {
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const total = data.reduce((sum, d) => sum + d.count, 0);

    if (data.length === 0) {
        return (
            <GlassCard className="p-5">
                <div className="text-sm font-semibold text-text-primary mb-1">{title}</div>
                <div className="h-20 flex items-center justify-center text-xs text-text-muted">No data in the last 30 days</div>
            </GlassCard>
        );
    }

    return (
        <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <div className="text-sm font-semibold text-text-primary">{title}</div>
                    <div className="text-xs text-text-muted">Last 30 days</div>
                </div>
                <div className="text-right">
                    <div className="text-lg font-bold font-mono text-text-primary">{formatNumber(total)}</div>
                    <div className="text-[11px] text-text-muted">total</div>
                </div>
            </div>
            <div className="flex items-end gap-[2px] h-20">
                {data.map((d) => (
                    <div
                        key={d.date}
                        className="flex-1 group relative"
                        style={{ height: '100%' }}
                    >
                        <div
                            className={`${color} rounded-sm opacity-60 group-hover:opacity-100 transition-opacity absolute bottom-0 left-0 right-0`}
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
