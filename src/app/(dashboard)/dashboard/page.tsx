'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Spinner, SecurityModal } from '@/components/ui';
import { useUser } from '@/components/sidebar';

/* ── Types ── */
interface WalletData {
    wallet_public_key: string;
    sol: string;
    usdc: string;
    usdt: string;
    sol_base_units: number;
    usdc_base_units: number;
    usdt_base_units: number;
}

interface DagetItem {
    daget_id: string;
    name: string;
    status: string;
    token_symbol: string;
    total_winners: number;
    claimed_count: number;
    created_at: string;
    total_amount_base_units?: number;
    daget_type?: string;
    message_html?: string;
    claim_slug: string;
}

interface ClaimItem {
    claim_id: string;
    claimant_discord_name_masked?: string;
    status: string;
    amount_base_units: number | null;
    tx_signature: string | null;
    created_at: string;
    claimant?: {
        discord_username: string | null;
        discord_avatar_url: string | null;
    };
}

/* ── Helpers ── */
function truncateAddress(addr: string, start = 4, end = 4): string {
    if (!addr || addr.length <= start + end + 3) return addr || '';
    return `${addr.slice(0, start)}...${addr.slice(-end)}`;
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

function formatAmount(baseUnits: number | null, decimals = 6): string {
    if (baseUnits == null) return '—';
    return (baseUnits / 10 ** decimals).toFixed(2);
}

function solscanTxUrl(sig: string): string {
    const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'mainnet-beta';
    const base = 'https://solscan.io/tx/';
    const normalized = cluster?.toLowerCase();
    const suffix = (normalized === 'mainnet-beta' || normalized === 'mainnet') ? '' : `?cluster=${cluster}`;
    return `${base}${sig}${suffix}`;
}

export default function DashboardPage() {
    const {
        hasWallet: initialHasWallet,
        discordUsername,
        discordAvatarUrl,
        walletPublicKey,
    } = useUser();
    const router = useRouter();
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [showRotateModal, setShowRotateModal] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [copyFeedback, setCopyFeedback] = useState(false);
    const [shareCopyFeedback, setShareCopyFeedback] = useState(false);

    // Track if we should fetch wallet data (starts with server state, updates on generation)
    const [walletActive, setWalletActive] = useState(initialHasWallet);

    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [activeDaget, setActiveDaget] = useState<DagetItem | null>(null);
    const [recentClaims, setRecentClaims] = useState<ClaimItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [tokenPrices, setTokenPrices] = useState<Record<string, { usd: number }>>({});
    const [refreshing, setRefreshing] = useState(false);

    // Recipient address state
    const [recipientAddress, setRecipientAddress] = useState('');
    const [recipientAddressInput, setRecipientAddressInput] = useState('');
    const [savingAddress, setSavingAddress] = useState(false);
    const [addressSaved, setAddressSaved] = useState(false);
    const [recipientError, setRecipientError] = useState('');

    /* ── Data Fetching ── */
    const fetchDashboardData = useCallback(async (forceWalletCheck = false) => {
        try {
            const shouldFetchWallet = walletActive || forceWalletCheck;

            // Fetch token prices in background
            fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana,usd-coin,tether&vs_currencies=usd')
                .then((r) => r.json())
                .then((d) => setTokenPrices(d))
                .catch(() => { });

            // Parallel fetch for wallet (if active) and dagets
            const [walletRes, dagetsRes] = await Promise.all([
                shouldFetchWallet
                    ? fetch('/api/wallet/balances').then((r) => {
                        // Swallow 404s for wallet (user hasn't created one yet)
                        if (r.status === 404) return null;
                        if (r.ok) return r.json();
                        return null;
                    })
                    : Promise.resolve(null),
                fetch('/api/dagets?status=active&limit=1').then((r) => (r.ok ? r.json() : null)),
            ]);

            if (walletRes) setWallet(walletRes);

            const daget = dagetsRes?.items?.[0] ?? null;
            setActiveDaget(daget);

            // Fetch recent claims for the active daget's live activity feed
            if (daget?.daget_id) {
                const detailRes = await fetch(`/api/dagets/${daget.daget_id}?limit=10`);
                if (detailRes.ok) {
                    const detail = await detailRes.json();
                    // Initial load uses detail endpoint, subsequent updates use activity endpoint via polling
                    // We might want to just rely on the polling effect below? 
                    // No, initial load is good for perceived performance. 
                    // However, detail endpoint doesn't return full user info (masked name only).
                    // The activity endpoint returns user info. 
                    // Let's just fetch activity once here too or wait for the poller.
                    // Actually, let's just fetch activity here to replace the claims from detail if we want robust data.
                    // But detail endpoint is already called. Let's stick with Detail for initial load 
                    // OR switch to only fetch `dagets` and then let the poller fetch claims.
                    // The current code fetches detail (with claims) then sets claims. 

                    // Let's keep it simple: Use detail for initial, but then polling will overwrite with better data.
                    // It's acceptable for a split second.
                    setRecentClaims(detail.claims ?? []);
                    // Backfill extra fields from detail response
                    setActiveDaget((prev) =>
                        prev
                            ? {
                                ...prev,
                                total_amount_base_units: detail.total_amount_base_units,
                                daget_type: detail.daget_type,
                                message_html: detail.message_html,
                            }
                            : null,
                    );
                }
            }
        } catch {
            // Keep dashboard usable even if data fails to load.
        } finally {
            setLoading(false);
        }
    }, [walletActive]);

    useEffect(() => {
        fetchDashboardData();
        fetchRecipientAddress();
    }, [fetchDashboardData]);

    // Live Activity Polling
    useEffect(() => {
        if (!activeDaget?.daget_id) return;

        const pollActivity = async () => {
            try {
                // Poll every 5 seconds
                const res = await fetch(`/api/dagets/${activeDaget.daget_id}/activity?limit=10`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.items) {
                        setRecentClaims(prev => {
                            // Simple diffing: if the first item ID is different, update.
                            // Or just replace. Replacing is easier and 10 items is small payload.
                            // To prevent flicker, maybe check if JSON stringified is different? 
                            // Or just check the ID of the latest one.
                            if (prev.length === 0 && data.items.length === 0) return prev;
                            if (prev.length > 0 && data.items.length > 0 && prev[0].claim_id === data.items[0].claim_id && prev.length === data.items.length) {
                                // Assume no change if latest ID is same and length same (simplistic but effective for append-only log)
                                // Actually status might change (processing -> confirmed). 
                                // So we should check status of visible items.
                                // Let's just always update for now, React is fast enough to diff the DOM.
                                return data.items;
                            }
                            return data.items;
                        });
                    }
                }
            } catch (error) {
                console.error('Polling error', error);
            }
        };

        const intervalId = setInterval(pollActivity, 5000);

        // Initial fetch to get the user details immediately (since detail endpoint only gives masked name)
        pollActivity();

        return () => clearInterval(intervalId);
    }, [activeDaget?.daget_id]);

    /* ── Recipient Address Functions ── */
    const fetchRecipientAddress = async () => {
        try {
            const res = await fetch('/api/me');
            if (res.ok) {
                const data = await res.json();
                const address = data.receiving_address || '';
                setRecipientAddress(address);
                setRecipientAddressInput(address);
            }
        } catch {
            // Ignore errors on load
        }
    };

    const handleSaveRecipientAddress = async () => {
        setRecipientError('');

        if (!recipientAddressInput.trim()) {
            setRecipientError('Please enter a valid Solana address');
            return;
        }

        setSavingAddress(true);
        setAddressSaved(false);

        try {
            // Validate address first
            const validationRes = await fetch('/api/validate-address', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: recipientAddressInput.trim() }),
            });

            const validationData = await validationRes.json();

            if (!validationData.valid) {
                setRecipientError(validationData.message || 'Invalid address');
                return;
            }

            if (!validationData.exists) {
                // Determine strictness based on user request ("check blockchain if exist")
                // We will block if it doesn't exist.
                setRecipientError(validationData.message || 'Address not found on blockchain');
                return;
            }

            const res = await fetch('/api/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receiving_address: recipientAddressInput.trim() }),
            });

            if (!res.ok) {
                const err = await res.json();
                setRecipientError(err.error?.message || 'Failed to save address');
                return;
            }

            setRecipientAddress(recipientAddressInput.trim());
            setAddressSaved(true);
            setTimeout(() => setAddressSaved(false), 3000);
        } catch {
            setRecipientError('Failed to save address');
        } finally {
            setSavingAddress(false);
        }
    };

    /* ── Derived Values ── */
    const solBalance = wallet ? parseFloat(wallet.sol) : 0;
    const usdcBalance = wallet ? parseFloat(wallet.usdc) : 0;
    const usdtBalance = wallet ? parseFloat(wallet.usdt) : 0;

    const totalWinners = activeDaget?.total_winners ?? 0;
    const claimedCount = activeDaget?.claimed_count ?? 0;
    const progressPercent = totalWinners > 0 ? Math.min(100, Math.round((claimedCount / totalWinners) * 100)) : 0;
    const totalBudgetDisplay = activeDaget?.total_amount_base_units
        ? formatAmount(activeDaget.total_amount_base_units)
        : '—';
    const distributedDisplay = activeDaget?.total_amount_base_units && totalWinners > 0
        ? formatAmount(Math.round((activeDaget.total_amount_base_units / totalWinners) * claimedCount))
        : '—';

    /* ── Actions ── */
    const handleCopyAddress = async () => {
        if (!wallet?.wallet_public_key) return;
        try {
            await navigator.clipboard.writeText(wallet.wallet_public_key);
            setCopyFeedback(true);
            setTimeout(() => setCopyFeedback(false), 2000);
        } catch {
            // No-op
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchDashboardData(true);
        setRefreshing(false);
    };

    const handleGenerateWallet = async (rotate = false) => {
        setGenerating(true);
        try {
            const res = await fetch('/api/wallet/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rotate }),
            });

            if (!res.ok) {
                const err = await res.json();

                // Self-healing: If wallet already exists, force update
                if (res.status === 409 || err.error?.code === 'WALLET_ACTIVE_EXISTS') {
                    setWalletActive(true);
                    await fetchDashboardData(true);
                    router.refresh();
                    return;
                }

                alert(err.error?.message || 'Failed to generate wallet');
                return;
            }

            const data = await res.json();

            // Optimistically set wallet state to show UI immediately
            setWallet({
                wallet_public_key: data.public_key,
                sol: '0.000000000',
                usdc: '0.00',
                usdt: '0.00',
                sol_base_units: 0,
                usdc_base_units: 0,
                usdt_base_units: 0,
            });

            setWalletActive(true);

            // Also fetch to be sure (background update)
            fetchDashboardData(true).catch(() => { });

            setShowRotateModal(false);
        } catch {
            alert('Failed to generate wallet');
        } finally {
            setGenerating(false);
        }
    };

    const handleExportKey = async () => {
        setExportLoading(true);
        try {
            // Step 1: Request one-time token
            const tokenRes = await fetch('/api/export-key/request', { method: 'POST' });
            if (!tokenRes.ok) {
                const err = await tokenRes.json().catch(() => null);
                alert(err?.error?.message || 'Failed to request export token. Please try again.');
                return;
            }
            const { export_token } = await tokenRes.json();

            // Step 2: Download the key file
            const downloadRes = await fetch('/api/export-key/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ export_token }),
            });
            if (!downloadRes.ok) {
                const err = await downloadRes.json().catch(() => null);
                alert(err?.error?.message || 'Failed to download key. Please try again.');
                return;
            }

            // Trigger browser download
            const blob = await downloadRes.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'daget-private-key.txt';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            setShowSecurityModal(false);
        } catch {
            alert('An unexpected error occurred. Please try again.');
        } finally {
            setExportLoading(false);
        }
    };

    /* ── Render ── */
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[500px]">
                <Spinner size="xl" />
            </div>
        );
    }

    return (
        <>
            {wallet && (
                <div className="px-8 py-3 border-b border-border-dark/30 bg-card-dark/60 backdrop-blur-md flex-shrink-0">
                    <div className="max-w-7xl mx-auto glass-card rounded-xl px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 bg-primary/15 rounded-lg flex items-center justify-center flex-shrink-0">
                                <span className="material-icons text-primary text-[16px]">account_balance_wallet</span>
                            </div>
                            <span className="text-sm font-mono font-medium text-text-primary truncate">
                                {truncateAddress(wallet.wallet_public_key, 6, 6)}
                            </span>
                            <button
                                className="p-1 hover:bg-primary/15 rounded-md transition-all text-text-muted hover:text-primary"
                                title={copyFeedback ? 'Copied!' : 'Copy'}
                                onClick={handleCopyAddress}
                            >
                                <span className="material-icons text-[14px]">{copyFeedback ? 'check' : 'content_copy'}</span>
                            </button>
                            <button
                                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-green-400/70 hover:text-green-400 hover:bg-green-500/10 border border-green-400/20 hover:border-green-400/40 transition-all flex items-center gap-1.5 active:scale-[0.97]"
                                title="Refresh balances"
                                onClick={handleRefresh}
                                disabled={refreshing}
                            >
                                <span className={`material-icons text-[14px] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
                                Refresh
                            </button>
                        </div>
                        <div className="hidden md:block w-px h-6 bg-border-dark/60"></div>
                        <div className="flex items-center gap-5 flex-1">
                            <div className="flex items-center gap-2">
                                <img alt="SOL" className="w-5 h-5" src="https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png" />
                                <span className="text-sm font-mono font-bold text-text-primary">{solBalance.toFixed(4)}</span>
                                <span className="text-[10px] text-text-muted font-semibold">SOL</span>
                                {tokenPrices.solana?.usd && (
                                    <span className="text-[10px] text-green-500 font-medium">
                                        ≈ ${(solBalance * tokenPrices.solana.usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <img alt="USDC" className="w-5 h-5" src="https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png" />
                                <span className="text-sm font-mono font-bold text-text-primary">{usdcBalance.toFixed(2)}</span>
                                <span className="text-[10px] text-text-muted font-semibold">USDC</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <img alt="USDT" className="w-5 h-5" src="https://s2.coinmarketcap.com/static/img/coins/64x64/825.png" />
                                <span className="text-sm font-mono font-bold text-text-primary">{usdtBalance.toFixed(2)}</span>
                                <span className="text-[10px] text-text-muted font-semibold">USDT</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                            <button
                                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-orange-400/70 hover:text-orange-400 hover:bg-orange-500/10 border border-orange-400/20 hover:border-orange-400/40 transition-all flex items-center gap-1.5 active:scale-[0.97]"
                                title="Export private key"
                                onClick={() => setShowSecurityModal(true)}
                            >
                                <span className="material-icons text-[14px]">key</span>
                                Export Key
                            </button>
                            <button
                                onClick={() => setShowRotateModal(true)}
                                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-yellow-400/70 hover:text-yellow-400 hover:bg-yellow-500/10 border border-yellow-400/20 hover:border-yellow-400/40 transition-all flex items-center gap-1.5 active:scale-[0.97]"
                                title="Change wallet"
                            >
                                <span className="material-icons text-[14px]">swap_horiz</span>
                                Change Wallet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={`flex-1 overflow-y-auto p-8 custom-scrollbar`}>
                <div className="max-w-7xl mx-auto space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Recipient Address + Active Daget */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Recipient Address Section */}
                            <section>
                                <div className="glass-card rounded-xl p-6 border border-border-dark/60">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <span className="material-icons text-primary text-xl">account_balance_wallet</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-bold mb-1 text-text-primary">Claim Recipient Address</h3>
                                            <p className="text-sm text-text-secondary mb-4">
                                                Set your default Solana wallet address for receiving claims from Dagets
                                            </p>
                                            <div className="flex gap-3">
                                                <input
                                                    type="text"
                                                    value={recipientAddressInput}
                                                    onChange={(e) => {
                                                        setRecipientAddressInput(e.target.value);
                                                        if (recipientError) setRecipientError('');
                                                    }}
                                                    placeholder="Enter your Solana wallet address (e.g., 7xR...9jkP)"
                                                    className={`flex-1 px-4 py-2.5 bg-background-dark border ${recipientError ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-border-dark/60 focus:border-primary/40 focus:ring-primary/20'} rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 transition-all font-mono`}
                                                />
                                                <button
                                                    onClick={handleSaveRecipientAddress}
                                                    disabled={savingAddress || recipientAddressInput === recipientAddress}
                                                    className="px-6 py-2.5 bg-primary hover:bg-primary/85 text-white rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-primary/20"
                                                >
                                                    {savingAddress ? (
                                                        <>
                                                            <Spinner size="sm" className="text-white" />
                                                            Saving...
                                                        </>
                                                    ) : addressSaved ? (
                                                        <>
                                                            <span className="material-icons text-sm">check</span>
                                                            Saved!
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="material-icons text-sm">save</span>
                                                            Save
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                            {recipientError && (
                                                <div className="mt-2 flex items-center gap-2 text-xs text-red-400">
                                                    <span className="material-icons text-red-400" style={{ fontSize: '14px' }}>error_outline</span>
                                                    <span>{recipientError}</span>
                                                </div>
                                            )}
                                            {recipientAddress && !recipientError && (
                                                <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
                                                    <span className="material-icons text-green-400" style={{ fontSize: '14px' }}>check_circle</span>
                                                    <span>Ready to claim Daget.</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {!wallet && (
                                <section>
                                    <div className="glass-card rounded-xl p-8 text-center border border-border-dark/60">
                                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <span className="material-icons text-3xl text-primary">account_balance_wallet</span>
                                        </div>
                                        <h3 className="text-xl font-bold mb-2 text-text-primary">Setup Your Wallet</h3>
                                        <p className="text-sm text-text-secondary mb-6 max-w-md mx-auto">
                                            Generate a secure Solana wallet to start creating Dagets. Your private key is encrypted and stored safely.
                                        </p>
                                        <button
                                            onClick={() => handleGenerateWallet(false)}
                                            disabled={generating}
                                            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/85 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-primary/20 active:scale-[0.98]"
                                        >
                                            {generating ? <Spinner size="sm" className="text-white" /> : <span className="material-icons text-sm">add</span>}
                                            {generating ? 'Generating...' : 'Generate Wallet'}
                                        </button>
                                    </div>
                                </section>
                            )}

                            {/* Active Daget Card */}
                            <div>
                                {!activeDaget && !loading ? (
                                    <div className="bg-card-dark rounded-xl border border-border-dark/40 p-12 text-center">
                                        <span className="material-icons text-5xl text-primary/30 mb-4 block">redeem</span>
                                        <h3 className="text-lg font-bold mb-2 text-text-primary">No Active Daget</h3>
                                        <p className="text-sm text-text-secondary mb-6">
                                            {wallet ? 'Create your first community Daget to get started.' : 'Generate a wallet first, then create a Daget.'}
                                        </p>
                                        {wallet && (
                                            <Link href="/create" className="inline-flex items-center gap-2 bg-primary hover:bg-primary/85 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]">
                                                <span className="material-icons text-sm">add</span>
                                                Create Daget
                                            </Link>
                                        )}
                                    </div>
                                ) : activeDaget ? (
                                    <div className="bg-card-dark rounded-xl border border-border-dark/40 overflow-hidden">
                                        {/* Header banner */}
                                        <div className="h-32 relative overflow-hidden">
                                            <div className="absolute inset-0 animated-hero-bg"></div>
                                            <div className="absolute inset-0 dot-pattern"></div>
                                            <div className="hero-overlay absolute inset-0"></div>
                                            <div className="absolute bottom-4 left-6 flex items-end gap-4 z-10">
                                                <div className="mb-1">
                                                    <h4 className="text-white font-bold text-xl">{activeDaget.name}</h4>
                                                    <p className="text-white/70 text-sm">{activeDaget.token_symbol} · {activeDaget.daget_type === 'random' ? 'Random' : 'Fixed'} mode</p>
                                                </div>
                                            </div>
                                            <div className="absolute top-4 right-6 z-10">
                                                <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-white/30">
                                                    {activeDaget.status.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="p-6">
                                            <div className="flex flex-col md:flex-row gap-8 items-center">
                                                {/* Progress ring */}
                                                <div className="relative w-28 h-28 flex-shrink-0">
                                                    <svg className="w-full h-full transform -rotate-90">
                                                        <circle className="text-border-dark/60" cx="56" cy="56" fill="transparent" r="50" stroke="currentColor" strokeWidth="8"></circle>
                                                        <circle className="text-primary transition-all duration-700" cx="56" cy="56" fill="transparent" r="50" stroke="currentColor" strokeDasharray="314" strokeDashoffset={(100 - progressPercent) / 100 * 314} strokeWidth="8" strokeLinecap="round"></circle>
                                                    </svg>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <span className="text-2xl font-bold text-text-primary">{progressPercent}%</span>
                                                        <span className="text-[10px] uppercase text-text-muted font-semibold tracking-wider">Claimed</span>
                                                    </div>
                                                </div>

                                                <div className="flex-1 space-y-4">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="bg-background-dark/50 p-4 rounded-lg">
                                                            <p className="text-[11px] text-text-muted mb-1 font-semibold uppercase tracking-wider">Total Budget</p>
                                                            <p className="font-bold text-text-primary font-mono">{totalBudgetDisplay} {activeDaget.token_symbol}</p>
                                                        </div>
                                                        <div className="bg-background-dark/50 p-4 rounded-lg">
                                                            <p className="text-[11px] text-text-muted mb-1 font-semibold uppercase tracking-wider">Distributed</p>
                                                            <p className="font-bold text-text-primary font-mono">{distributedDisplay} {activeDaget.token_symbol}</p>
                                                        </div>
                                                        <div className="bg-background-dark/50 p-4 rounded-lg">
                                                            <p className="text-[11px] text-text-muted mb-1 font-semibold uppercase tracking-wider">Participants</p>
                                                            <p className="font-bold text-text-primary">{claimedCount} / {totalWinners}</p>
                                                        </div>
                                                        <div className="bg-background-dark/50 p-4 rounded-lg">
                                                            <p className="text-[11px] text-text-muted mb-1 font-semibold uppercase tracking-wider">Type</p>
                                                            <p className="font-bold text-text-primary">{activeDaget.daget_type === 'random' ? 'Random' : 'Fixed'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <Link
                                                            href={`/dagets/${activeDaget.daget_id}`}
                                                            className="flex-1 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/85 transition-all duration-200 text-center text-sm active:scale-[0.98]"
                                                        >
                                                            Manage Daget
                                                        </Link>
                                                        <div className="relative">
                                                            <button
                                                                className="w-11 h-11 flex items-center justify-center bg-background-dark/50 rounded-xl hover:bg-border-dark transition-all duration-200 active:scale-[0.98]"
                                                                onClick={() => {
                                                                    const url = `${window.location.origin}/open/${activeDaget.claim_slug}`;
                                                                    navigator.clipboard.writeText(url).catch(() => { });
                                                                    setShareCopyFeedback(true);
                                                                    setTimeout(() => setShareCopyFeedback(false), 2000);
                                                                }}
                                                                title="Copy claim link"
                                                            >
                                                                <span className="material-icons text-lg text-text-secondary">
                                                                    {shareCopyFeedback ? 'check' : 'share'}
                                                                </span>
                                                            </button>
                                                            {/* Tooltip */}
                                                            <div
                                                                className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-background-dark border border-border-dark/60 rounded-lg shadow-xl text-xs font-semibold text-text-primary whitespace-nowrap transition-all duration-200 ${shareCopyFeedback ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}
                                                            >
                                                                Link Copied!
                                                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-border-dark/60"></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {/* Right Column: Live Activity Feed */}
                        <div className="lg:col-span-1">
                            <div className="bg-card-dark rounded-xl border border-border-dark/40 flex flex-col h-full min-h-[480px]">
                                <div className="p-5 border-b border-border-dark/40 flex justify-between items-center">
                                    <h4 className="font-bold text-text-primary text-sm">Live Activity</h4>
                                    {activeDaget && (
                                        <div className="flex gap-1.5 items-center">
                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                            <span className="text-[10px] text-text-muted font-semibold">LIVE</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                                    {recentClaims.length === 0 && !loading ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                            <span className="material-icons text-3xl text-text-muted mb-3">inbox</span>
                                            <p className="text-sm text-text-secondary">No claims yet</p>
                                            <p className="text-xs text-text-muted mt-1">Activity will appear here when users start claiming.</p>
                                        </div>
                                    ) : (
                                        recentClaims.map((claim) => (
                                            <div
                                                key={claim.claim_id}
                                                className="group p-3 hover:bg-primary/5 rounded-lg transition-all duration-200 cursor-pointer border border-transparent hover:border-primary/10"
                                                onClick={() => {
                                                    if (claim.tx_signature) {
                                                        window.open(solscanTxUrl(claim.tx_signature), '_blank');
                                                    }
                                                }}
                                            >
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className={`text-xs font-bold ${claim.status === 'confirmed' ? 'text-primary' : claim.status === 'failed_permanent' ? 'text-red-500' : 'text-text-muted'}`}>
                                                        {claim.status === 'confirmed'
                                                            ? `Claimed ${formatAmount(claim.amount_base_units)} ${activeDaget?.token_symbol || ''}`
                                                            : claim.status === 'failed_permanent'
                                                                ? 'Failed'
                                                                : 'Processing...'}
                                                    </span>
                                                    <span className="text-[10px] text-text-muted uppercase">{timeAgo(claim.created_at)}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-surface flex items-center justify-center text-[10px] border border-primary/20 text-text-secondary font-semibold overflow-hidden">
                                                        {claim.claimant?.discord_avatar_url ? (
                                                            <img src={claim.claimant.discord_avatar_url} alt="Av" className="w-full h-full object-cover" />
                                                        ) : (
                                                            (claim.claimant?.discord_username || claim.claimant_discord_name_masked || '??').slice(0, 2).toUpperCase()
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-text-muted font-mono truncate">
                                                        {claim.claimant?.discord_username || claim.claimant_discord_name_masked || (claim.tx_signature ? truncateAddress(claim.tx_signature, 4, 4) : '—')}
                                                    </p>
                                                    {claim.tx_signature && (
                                                        <span className="material-icons text-[14px] text-text-muted ml-auto group-hover:text-primary transition-colors">open_in_new</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                {activeDaget && recentClaims.length > 0 && (
                                    <div className="p-4 border-t border-border-dark/40">
                                        <Link
                                            href={`/dagets/${activeDaget.daget_id}`}
                                            className="w-full block text-center text-[10px] font-bold text-text-muted hover:text-primary uppercase tracking-widest transition-colors"
                                        >
                                            View All Transactions
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Export Key Modal ── */}
            <SecurityModal
                isOpen={showSecurityModal}
                onClose={() => setShowSecurityModal(false)}
                onConfirm={handleExportKey}
                title="Export Private Key"
                message="Never share your private key. The key will be downloaded as a .txt file. Keep it secure."
                confirmLabel="Download Key"
                loading={exportLoading}
            />

            {/* ── Rotate Wallet Modal ── */}
            <SecurityModal
                isOpen={showRotateModal}
                onClose={() => setShowRotateModal(false)}
                onConfirm={() => handleGenerateWallet(true)}
                title="Regenerate Wallet"
                message="Are you sure? This will deactivate your current wallet. Any funds remaining in the old wallet will effectively be lost unless you have exported your private key. This action cannot be undone."
                confirmLabel="Regenerate"
                loading={generating}
            />
        </>
    );
}
