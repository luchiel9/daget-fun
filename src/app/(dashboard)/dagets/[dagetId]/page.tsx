'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GlassCard, StatusChip, Button, SecurityModal, Modal, Input } from '@/components/ui';
import DOMPurify from 'isomorphic-dompurify';

export default function DagetDetailPage() {
    const { dagetId } = useParams<{ dagetId: string }>();
    const router = useRouter();
    const [daget, setDaget] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showStopModal, setShowStopModal] = useState(false);
    const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);
    const [stopping, setStopping] = useState(false);

    useEffect(() => { fetchDaget(); }, [dagetId]);

    const fetchDaget = async () => {
        try {
            const res = await fetch(`/api/dagets/${dagetId}`);
            if (res.ok) setDaget(await res.json());
        } catch { } finally { setLoading(false); }
    };

    const stopDaget = async () => {
        setStopping(true);
        try {
            const res = await fetch(`/api/dagets/${dagetId}/stop`, { method: 'POST' });
            if (res.ok) { await fetchDaget(); setShowStopModal(false); }
        } catch { } finally { setStopping(false); }
    };

    const releaseClaim = async (claimId: string) => {
        await fetch(`/api/claims/${claimId}/release`, { method: 'POST' });
        fetchDaget();
    };

    const retryClaim = async (claimId: string) => {
        await fetch(`/api/claims/${claimId}/retry`, { method: 'POST' });
        fetchDaget();
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>;
    }

    if (!daget) {
        return <div className="text-text-secondary">Daget not found</div>;
    }

    const claimUrl = `${window.location.origin}/open/${daget.claim_slug || ''}`;
    const progress = daget.total_winners > 0 ? (daget.claimed_count / daget.total_winners) * 100 : 0;
    const decimals = daget.token_symbol === 'SOL' ? 9 : 6;
    const displayDecimals = daget.token_symbol === 'SOL' ? 5 : 2;
    const totalAmount = daget.total_amount_base_units != null
        ? (daget.total_amount_base_units / 10 ** decimals).toFixed(displayDecimals)
        : '—';
    const distributedAmount = (daget.total_amount_base_units != null && daget.total_winners > 0)
        ? ((daget.total_amount_base_units / daget.total_winners) * daget.claimed_count / 10 ** decimals).toFixed(displayDecimals)
        : '—';
    const remainingAmount = (daget.total_amount_base_units != null && daget.total_winners > 0)
        ? ((daget.total_amount_base_units / 10 ** decimals) - ((daget.total_amount_base_units / daget.total_winners) * daget.claimed_count / 10 ** decimals)).toFixed(displayDecimals)
        : '—';
    const failedCount = daget.failed_count ?? (daget.claims?.filter((c: any) => c.status === 'failed_permanent').length || 0);

    const statusBadgeClass = (status: string) => {
        if (status === 'active') return 'bg-green-500/20 text-green-300 border border-green-500/30';
        if (status === 'stopped') return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
        if (status === 'closed' || status === 'released') return 'bg-slate-500/20 text-slate-300 border border-slate-500/30';
        return 'bg-primary/20 text-primary border border-primary/30';
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="max-w-7xl mx-auto space-y-8">
                    <div className="bg-card-dark rounded-xl border border-border-dark/40 overflow-hidden">
                        <div className="h-32 relative overflow-hidden">
                            <div className="absolute inset-0 animated-hero-bg"></div>
                            <div className="absolute inset-0 dot-pattern"></div>
                            <div className="hero-overlay absolute inset-0"></div>
                            <div className="absolute bottom-4 left-6 flex items-end gap-4 z-10">
                                <div className="mb-0.5">
                                    <h3 className="text-white font-bold text-xl">{daget.name}</h3>
                                    <p className="text-white/70 text-sm">{daget.token_symbol} · {daget.daget_type === 'fixed' ? 'Fixed' : 'Random'}</p>
                                </div>
                            </div>
                            <div className="absolute top-4 right-6 flex items-center gap-2 z-10">
                                <span className={`${statusBadgeClass(daget.status)} backdrop-blur-md text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full`}>
                                    {daget.status}
                                </span>
                            </div>
                        </div>
                        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex flex-wrap gap-2 flex-1">
                                <span className="bg-blue-400/10 text-blue-400 px-3 py-1.5 rounded-full text-xs font-semibold">Token: {daget.token_symbol}</span>
                                <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-semibold">Type: {daget.daget_type === 'fixed' ? 'Fixed' : 'Random'}</span>
                                <span className="bg-surface text-text-secondary px-3 py-1.5 rounded-full text-xs font-semibold">Created: {new Date(daget.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => router.push(`/dagets/${dagetId}/edit`)}
                                    className="px-4 py-2 rounded-xl border border-primary/20 text-text-primary hover:bg-primary/5 hover:border-primary/40 transition-all duration-200 flex items-center gap-2 text-sm font-medium active:scale-[0.98]"
                                >
                                    <span className="material-icons text-sm">edit</span>Edit
                                </button>
                                {daget.status === 'active' && (
                                    <button
                                        className="px-4 py-2 rounded-xl border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all duration-200 flex items-center gap-2 text-sm font-medium active:scale-[0.98]"
                                        onClick={() => setShowStopModal(true)}
                                    >
                                        <span className="material-icons text-sm">stop_circle</span>Stop Daget
                                    </button>
                                )}
                                <div className="relative">
                                    <button
                                        className="px-4 py-2 rounded-xl border border-primary/20 text-text-primary hover:bg-primary/10 transition-all duration-200 flex items-center gap-2 text-sm font-medium active:scale-[0.98]"
                                        onClick={() => {
                                            navigator.clipboard.writeText(claimUrl);
                                            setShowCopiedTooltip(true);
                                            setTimeout(() => setShowCopiedTooltip(false), 2000);
                                        }}
                                    >
                                        <span className="material-icons text-sm">link</span>Copy Link
                                    </button>
                                    {showCopiedTooltip && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 text-white text-[10px] rounded shadow-lg whitespace-nowrap z-10 animate-in fade-in zoom-in-95 duration-200">
                                            Link Copied!
                                        </div>
                                    )}
                                </div>
                                <button className="w-10 h-10 flex items-center justify-center bg-surface rounded-xl hover:bg-border-dark transition-all duration-200 active:scale-[0.98]">
                                    <span className="material-icons text-sm text-text-secondary">share</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <GlassCard className="rounded-xl p-4">
                            <p className="text-[11px] text-text-muted font-semibold uppercase tracking-wider mb-1">Total Amount</p>
                            <p className="text-xl font-bold font-mono text-text-primary">{totalAmount} <span className="text-xs opacity-60">{daget.token_symbol}</span></p>
                        </GlassCard>
                        <GlassCard className="rounded-xl p-4">
                            <p className="text-[11px] text-text-muted font-semibold uppercase tracking-wider mb-1">Distributed</p>
                            <p className="text-xl font-bold font-mono text-green-400">{distributedAmount} <span className="text-xs opacity-60">{daget.token_symbol}</span></p>
                        </GlassCard>
                        <GlassCard className="rounded-xl p-4">
                            <p className="text-[11px] text-text-muted font-semibold uppercase tracking-wider mb-1">Remaining</p>
                            <p className="text-xl font-bold font-mono text-text-primary">{remainingAmount} <span className="text-xs opacity-60">{daget.token_symbol}</span></p>
                        </GlassCard>
                        <GlassCard className="rounded-xl p-4">
                            <p className="text-[11px] text-text-muted font-semibold uppercase tracking-wider mb-1">Failed</p>
                            <p className="text-xl font-bold font-mono text-red-400">{failedCount}</p>
                        </GlassCard>
                    </div>

                    {/* Message & Requirements Grid */}
                    {(daget.message_html || daget.requirements?.length > 0) && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Message Column */}
                            {daget.message_html && (
                                <div className={`bg-card-dark rounded-xl border border-border-dark/40 overflow-hidden flex flex-col ${daget.requirements?.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                                    <div className="p-4 border-b border-border-dark/40 bg-black/20">
                                        <h4 className="font-bold text-text-primary text-sm flex items-center gap-2">
                                            <span className="material-icons text-text-muted text-sm">chat</span>
                                            Message
                                        </h4>
                                    </div>
                                    <div className="p-5 flex-1">
                                        <div
                                            className="text-sm text-text-secondary leading-relaxed bg-background-dark/30 p-4 rounded-lg border border-border-dark/20 h-full rich-text-content"
                                            dangerouslySetInnerHTML={{
                                                __html: DOMPurify.sanitize(daget.message_html, {
                                                    ADD_TAGS: ['img', 'iframe', 'video'],
                                                    ADD_ATTR: ['src', 'alt', 'class', 'style', 'width', 'height', 'frameborder', 'allowfullscreen'],
                                                    ADD_URI_SCHEMES: ['data']
                                                } as any)
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Requirements Column */}
                            {daget.requirements?.length > 0 && (
                                <div className={`bg-card-dark rounded-xl border border-border-dark/40 overflow-hidden flex flex-col ${daget.message_html ? 'lg:col-span-1' : 'lg:col-span-3'}`}>
                                    <div className="p-4 border-b border-border-dark/40 bg-black/20">
                                        <h4 className="font-bold text-text-primary text-sm flex items-center gap-2">
                                            <span className="material-icons text-purple-400 text-sm">verified_user</span>
                                            Requirements
                                        </h4>
                                    </div>
                                    <div className="p-5 flex-1 space-y-5">
                                        {/* Discord Server Info */}
                                        {daget.discord_guild_name && (
                                            <div>
                                                <p className="text-[10px] text-text-muted uppercase font-semibold mb-2">Server</p>
                                                <div className="flex items-center gap-3 p-3 bg-background-dark/30 rounded-lg border border-border-dark/20">
                                                    {daget.discord_guild_icon && daget.discord_guild_id ? (
                                                        <img
                                                            src={`https://cdn.discordapp.com/icons/${daget.discord_guild_id}/${daget.discord_guild_icon}.png`}
                                                            alt={daget.discord_guild_name}
                                                            className="w-10 h-10 rounded-full"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-[#5865F2]/20 flex items-center justify-center">
                                                            <span className="text-[#5865F2] font-bold text-lg">{daget.discord_guild_name?.charAt(0) || 'D'}</span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-bold text-text-primary">{daget.discord_guild_name}</p>
                                                        <p className="text-[11px] text-text-muted">Discord Server</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Roles List */}
                                        <div>
                                            <p className="text-[10px] text-text-muted uppercase font-semibold mb-2">Required Roles</p>
                                            <div className="flex flex-wrap gap-2">
                                                {daget.requirements.map((role: any) => {
                                                    const roleColor = role.color && role.color !== 0
                                                        ? `#${role.color.toString(16).padStart(6, '0')}`
                                                        : null;

                                                    return (
                                                        <span
                                                            key={role.id}
                                                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5"
                                                            style={{
                                                                borderColor: roleColor ? `${roleColor}30` : 'rgba(255,255,255,0.1)',
                                                                backgroundColor: roleColor ? `${roleColor}10` : 'rgba(255,255,255,0.05)',
                                                                color: roleColor || '#a1a1aa'
                                                            }}
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: roleColor || '#52525b' }}></span>
                                                            {role.name || role.id}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="bg-card-dark rounded-xl border border-border-dark/40 overflow-hidden">
                        <div className="p-5 border-b border-border-dark/40 flex justify-between items-center">
                            <h4 className="font-bold text-text-primary text-sm">Claims ({daget.claims?.length || 0})</h4>
                            <button className="text-xs text-text-muted hover:text-primary transition-colors font-semibold">Export CSV</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-border-dark/40">
                                        <th className="py-3 px-6 text-[11px] uppercase tracking-wider text-text-muted font-semibold">#</th>
                                        <th className="py-3 px-6 text-[11px] uppercase tracking-wider text-text-muted font-semibold">Discord</th>
                                        <th className="py-3 px-6 text-[11px] uppercase tracking-wider text-text-muted font-semibold">Amount</th>
                                        <th className="py-3 px-6 text-[11px] uppercase tracking-wider text-text-muted font-semibold">Status</th>
                                        <th className="py-3 px-6 text-[11px] uppercase tracking-wider text-text-muted font-semibold">TX Hash</th>
                                        <th className="py-3 px-6 text-[11px] uppercase tracking-wider text-text-muted font-semibold">Date</th>
                                        <th className="py-3 px-6 text-[11px] uppercase tracking-wider text-text-muted font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {daget.claims?.length > 0 ? daget.claims.map((c: any, idx: number) => (
                                        <tr key={c.claim_id} className="border-b border-border-dark/20 group hover:bg-primary/5 transition-colors">
                                            <td className="py-4 px-6 text-sm text-text-muted font-mono">{daget.claims.length - idx}</td>
                                            <td className="py-4 px-6 text-sm text-text-primary font-medium">
                                                <div className="flex items-center gap-3">
                                                    {c.claimant_discord_avatar ? (
                                                        <img
                                                            src={c.claimant_discord_avatar}
                                                            alt={c.claimant_discord_name}
                                                            className="w-8 h-8 rounded-full bg-background-dark/50"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                                            <span className="text-xs font-bold text-primary">{(c.claimant_discord_name || c.claimant_discord_name_masked || '?').charAt(0).toUpperCase()}</span>
                                                        </div>
                                                    )}
                                                    <span className="font-semibold">{c.claimant_discord_name || c.claimant_discord_name_masked || 'Unknown'}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-sm font-mono font-bold text-text-primary">
                                                {c.amount_base_units != null ? `${(c.amount_base_units / 10 ** decimals).toFixed(displayDecimals)} ${daget.token_symbol}` : '—'}
                                            </td>
                                            <td className="py-4 px-6">
                                                <StatusChip status={c.status} />
                                            </td>
                                            <td className="py-4 px-6">
                                                {c.tx_signature ? (
                                                    <a href={`https://solscan.io/tx/${c.tx_signature}`} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-primary hover:underline">
                                                        {c.tx_signature.slice(0, 6)}...{c.tx_signature.slice(-4)}
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-text-muted">—</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 text-xs text-text-muted">
                                                {new Date(c.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="py-4 px-6">
                                                {c.status === 'failed_permanent' && (
                                                    <div className="flex gap-2">
                                                        <Button variant="secondary" size="sm" onClick={() => retryClaim(c.claim_id)}>Retry</Button>
                                                        <Button variant="danger" size="sm" onClick={() => releaseClaim(c.claim_id)}>Release</Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td className="py-6 px-6 text-sm text-text-muted" colSpan={7}>No claims yet</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <SecurityModal
                        isOpen={showStopModal}
                        onClose={() => setShowStopModal(false)}
                        onConfirm={stopDaget}
                        title="Stop Daget"
                        message="This will prevent new claims. Existing pending claims will still process. This action cannot be undone."
                        confirmLabel="Stop Daget"
                        loading={stopping}
                    />
                </div>
            </div>
        </div>
    );
}
