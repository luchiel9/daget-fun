'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GlassCard, Button, EmptyState, Modal } from '@/components/ui';
import { useUser } from '@/components/sidebar';

export default function DagetsListPage() {
    const router = useRouter();
    const { hasWallet } = useUser();
    const [dagets, setDagets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

    // Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        actionLabel: string;
        onAction: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        actionLabel: '',
        onAction: () => { },
    });
    const [checking, setChecking] = useState(false);

    useEffect(() => { fetchDagets(); }, [statusFilter]);

    const fetchDagets = async (cursor?: string) => {
        try {
            const params = new URLSearchParams();
            if (cursor) params.append('cursor', cursor);
            if (statusFilter) params.append('status', statusFilter);

            const res = await fetch(`/api/dagets?${params.toString()}`);
            const data = await res.json();
            if (cursor) {
                setDagets((prev) => [...prev, ...data.items]);
            } else {
                setDagets(data.items);
            }
            setNextCursor(data.next_cursor);
        } catch { } finally { setLoading(false); }
    };

    const copyDagetLink = async (claimSlug: string, dagetId: string) => {
        const link = `${window.location.origin}/open/${claimSlug}`;
        await navigator.clipboard.writeText(link);
        setCopiedId(dagetId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleCreateDaget = async () => {
        setChecking(true);
        try {
            // Check 1: Creator Wallet
            if (!hasWallet) {
                setModalConfig({
                    isOpen: true,
                    title: 'Creator Wallet Required',
                    message: 'Create creator wallet from dashboard to start distributing tokens.',
                    actionLabel: 'Go to Dashboard',
                    onAction: () => router.push('/dashboard'),
                });
                return;
            }

            // Check 2: Active Daget
            // Fetch directly to be sure
            const res = await fetch('/api/dagets?status=active&limit=1');
            if (res.ok) {
                const data = await res.json();
                if (data.items && data.items.length > 0) {
                    const activeId = data.items[0].daget_id;
                    setModalConfig({
                        isOpen: true,
                        title: 'Active Daget Found',
                        message: 'Only one active daget is possible. You must stop or close or let it be fully claimed before creating a new one.',
                        actionLabel: 'View Active Daget',
                        onAction: () => router.push(`/dagets/${activeId}`),
                    });
                    return;
                }
            }

            // All clear
            router.push('/create');
        } catch (error) {
            console.error(error);
            // Fallback to create if check fails? Or alert?
            // Safer to let them try if check fails, worst case backend rejects.
            router.push('/create');
        } finally {
            setChecking(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    const statusClass = (status: string) => {
        if (status === 'active') return 'bg-green-500/10 text-green-400 border border-green-500/20';
        if (status === 'stopped') return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
        if (status === 'closed' || status === 'released') return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
        if (status === 'created') return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
        return 'bg-primary/10 text-primary border border-primary/20';
    };

    const getStatusLabel = (status: string) => {
        if (status === 'closed' || status === 'released') return 'Fully Claimed';
        return status;
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setStatusFilter(undefined)} className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 active:scale-[0.95] ${!statusFilter ? 'bg-primary/10 text-primary border border-primary/20' : 'text-text-secondary hover:text-primary hover:bg-primary/5 border border-transparent'}`}>All</button>
                            <button onClick={() => setStatusFilter('active')} className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 active:scale-[0.95] ${statusFilter === 'active' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-text-secondary hover:text-primary hover:bg-primary/5 border border-transparent'}`}>Active</button>
                            <button onClick={() => setStatusFilter('stopped')} className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 active:scale-[0.95] ${statusFilter === 'stopped' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-text-secondary hover:text-primary hover:bg-primary/5 border border-transparent'}`}>Stopped</button>
                            <button onClick={() => setStatusFilter('closed')} className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 active:scale-[0.95] ${statusFilter === 'closed' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-text-secondary hover:text-primary hover:bg-primary/5 border border-transparent'}`}>Fully Claimed</button>
                        </div>
                        <Button
                            size="sm"
                            variant="primary"
                            className="rounded-full px-5"
                            onClick={handleCreateDaget}
                            loading={checking}
                        >
                            <span className="material-icons text-sm mr-2">add</span>
                            Create Daget
                        </Button>
                    </div>

                    {dagets.length === 0 ? (
                        <GlassCard className="p-6">
                            <EmptyState
                                icon="redeem"
                                title="No Dagets yet"
                                description="Create your first community Daget."
                                action={
                                    <Button variant="primary" onClick={handleCreateDaget} loading={checking}>
                                        Create Daget
                                    </Button>
                                }
                            />
                        </GlassCard>
                    ) : (
                        <div className="space-y-3">
                            {dagets.map((d) => {
                                const progress = d.total_winners > 0 ? Math.min(100, Math.round((d.claimed_count / d.total_winners) * 100)) : 0;
                                return (
                                    <div key={d.daget_id} className="block group">
                                        <GlassCard
                                            className="rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4 cursor-pointer relative"
                                            hover
                                            onClick={() => router.push(`/dagets/${d.daget_id}`)}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-1.5">
                                                    <h4 className="font-semibold text-text-primary group-hover:text-primary transition-colors">{d.name}</h4>
                                                </div>
                                                <p className="text-xs text-text-muted">Created {new Date(d.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                            <div className="flex items-center gap-6 flex-shrink-0">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusClass(d.status)}`}>
                                                    {d.status === 'active' && (
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                        </span>
                                                    )}
                                                    {getStatusLabel(d.status)}
                                                </span>

                                                <div className="w-40 hidden md:block">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Claimed</span>
                                                        <span className="text-[10px] text-text-secondary font-mono font-bold">{d.claimed_count}/{d.total_winners}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-border-dark/60 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full bg-gradient-to-r from-primary to-teal-300" style={{ width: `${progress}%`, transition: 'width 0.8s ease-out' }}></div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
                                                    <span className="text-xs font-bold text-primary font-mono">{d.token_symbol}</span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            copyDagetLink(d.claim_slug, d.daget_id);
                                                        }}
                                                        className="w-8 h-8 rounded-full bg-background-dark/50 hover:bg-primary/20 hover:text-primary flex items-center justify-center transition-all"
                                                        title={copiedId === d.daget_id ? "Copied!" : "Copy Link"}
                                                    >
                                                        <span className="material-icons text-[16px]">
                                                            {copiedId === d.daget_id ? 'check' : 'link'}
                                                        </span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/dagets/${d.daget_id}/edit`);
                                                        }}
                                                        className="w-8 h-8 rounded-full bg-background-dark/50 hover:bg-primary/20 hover:text-primary flex items-center justify-center transition-all"
                                                        title="Edit Daget"
                                                    >
                                                        <span className="material-icons text-[16px]">edit</span>
                                                    </button>
                                                    <span className="material-icons text-text-muted group-hover:text-primary transition-colors text-[20px]">chevron_right</span>
                                                </div>
                                            </div>
                                        </GlassCard>
                                    </div>
                                );
                            })}
                            {nextCursor && (
                                <Button variant="ghost" onClick={() => fetchDagets(nextCursor)} className="w-full">
                                    Load more
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <Modal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                title={modalConfig.title}
                message={modalConfig.message}
                primaryAction={{
                    label: modalConfig.actionLabel,
                    onClick: modalConfig.onAction,
                }}
                secondaryAction={{
                    label: 'Cancel',
                    onClick: () => setModalConfig({ ...modalConfig, isOpen: false }),
                }}
            />
        </div>
    );
}

function Spinner({ size }: { size: string }) {
    return <div className={`animate-spin rounded-full border-t-2 border-primary ${size === 'lg' ? 'h-10 w-10' : 'h-6 w-6'}`}></div>
}
