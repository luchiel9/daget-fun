'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui';

import { nanoid } from 'nanoid';
import confetti from 'canvas-confetti';
import DOMPurify from 'isomorphic-dompurify';

type ViewState = 'claim' | 'processing' | 'success';

type ClaimStatus = {
    claim_id: string;
    status: string;
    amount_base_units: number | null;
    tx_signature: string | null;
    attempt_count: number;
    last_error: string | null;
};

type ActivityClaim = {
    claim_id: string;
    status: string;
    amount_base_units: number | null;
    tx_signature: string | null;
    created_at: string;
    claimant?: {
        discord_username: string | null;
        discord_avatar_url: string | null;
    };
};

function shortenTx(sig: string | null) {
    if (!sig) return '';
    if (sig.length <= 14) return sig;
    return `${sig.slice(0, 6)}...${sig.slice(-6)}`;
}

function formatAmount(baseUnits: number | null, decimals: number, tokenSymbol?: string) {
    if (baseUnits == null) return tokenSymbol === 'SOL' ? '0.00000' : '0.00';
    const displayDecimals = tokenSymbol === 'SOL' ? 5 : 2;
    return (baseUnits / Math.pow(10, decimals)).toFixed(displayDecimals);
}

function solscanUrl(sig: string) {
    const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'mainnet-beta';
    const suffix = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
    return `https://solscan.io/tx/${sig}${suffix}`;
}

function getTokenIcon(symbol: string): string | null {
    if (symbol === 'USDC') return 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png';
    if (symbol === 'USDT') return 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png';
    if (symbol === 'SOL') return 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png';
    return null;
}

export default function ClaimPageClient() {
    const { claimSlug } = useParams<{ claimSlug: string }>();
    const [daget, setDaget] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [address, setAddress] = useState('');
    const [showAtaModal, setShowAtaModal] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [eligibility, setEligibility] = useState<{
        eligible: boolean;
        error?: string;
        checked: boolean;
        inGuild?: boolean;
        userRoles?: string[];
        claimed?: boolean;
        isCreator?: boolean;
    }>({
        eligible: false,
        checked: false,
    });
    const [checkingEligibility, setCheckingEligibility] = useState(false);

    // Processing & success states
    const [viewState, setViewState] = useState<ViewState>('claim');
    const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Live Activity
    const [recentClaims, setRecentClaims] = useState<ActivityClaim[]>([]);
    const activityPollRef = useRef<NodeJS.Timeout | null>(null);

    // Winners Modal State
    const [showWinnersModal, setShowWinnersModal] = useState(false);
    const [winnersList, setWinnersList] = useState<ActivityClaim[]>([]);
    const [loadingWinners, setLoadingWinners] = useState(false);

    // SOL price for success view (show USD value when token is SOL)
    const [solPrice, setSolPrice] = useState<number>(0);

    const fetchWinners = async () => {
        setLoadingWinners(true);
        try {
            const res = await fetch(`/api/claim/${claimSlug}/activity?limit=50`);
            if (res.ok) {
                const data = await res.json();
                setWinnersList(data.claims || []);
            }
        } catch { } finally { setLoadingWinners(false); }
    };

    useEffect(() => {
        fetchDaget();
        checkAuth();
        fetchActivityFeed();

        // Poll activity feed every 10 seconds
        activityPollRef.current = setInterval(() => {
            fetchActivityFeed();
        }, 10000);

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (activityPollRef.current) clearInterval(activityPollRef.current);
        };
    }, [claimSlug]);

    // Fetch SOL price when showing success and token is SOL (for USD value)
    useEffect(() => {
        if (viewState !== 'success' || !daget || daget.token_symbol !== 'SOL') return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
                const data = await res.json();
                if (!cancelled && data.solana?.usd) setSolPrice(data.solana.usd);
            } catch { /* ignore */ }
        })();
        return () => { cancelled = true; };
    }, [viewState, daget?.token_symbol]);

    // Fetch SOL price when showing winners modal and token is SOL (for USD value)
    useEffect(() => {
        if (!showWinnersModal || !daget || daget.token_symbol !== 'SOL') return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
                const data = await res.json();
                if (!cancelled && data.solana?.usd) setSolPrice(data.solana.usd);
            } catch { /* ignore */ }
        })();
        return () => { cancelled = true; };
    }, [showWinnersModal, daget?.token_symbol]);

    // Confetti effect on success
    useEffect(() => {
        if (viewState === 'success') {
            const count = 200;
            const defaults = {
                origin: { y: 0.6 },
                zIndex: 1000 // Ensure it's on top of everything
            };

            const fire = (particleRatio: number, opts: any) => {
                confetti({
                    ...defaults,
                    ...opts,
                    particleCount: Math.floor(count * particleRatio)
                });
            };

            fire(0.25, { spread: 26, startVelocity: 55 });
            fire(0.2, { spread: 60 });
            fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
            fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
            fire(0.1, { spread: 120, startVelocity: 45 });
        }
    }, [viewState]);

    const fetchDaget = async () => {
        try {
            const res = await fetch(`/api/claim/${claimSlug}`);
            if (res.ok) setDaget(await res.json());
        } catch { } finally { setLoading(false); }
    };

    const fetchActivityFeed = async () => {
        try {
            const res = await fetch(`/api/claim/${claimSlug}/activity?limit=10`);
            if (res.ok) {
                const data = await res.json();
                setRecentClaims(data.claims || []);
            }
        } catch {
            // Silently fail - don't disrupt the user experience
        }
    };

    const [currentDiscordId, setCurrentDiscordId] = useState<string | null>(null);

    const checkAuth = async () => {
        try {
            const res = await fetch('/api/me');
            if (res.ok) {
                const userData = await res.json();
                setIsLoggedIn(true);
                setCurrentDiscordId(userData.discord_id ?? null);
                if (userData.receiving_address) {
                    setAddress(userData.receiving_address);
                }
                if (viewState !== 'success') {
                    checkEligibility();
                }
            } else {
                setIsLoggedIn(false);
            }
        } catch {
            setIsLoggedIn(false);
        }
    };

    const checkEligibility = async () => {
        setCheckingEligibility(true);
        try {
            const res = await fetch(`/api/claim/${claimSlug}/verify`);
            if (res.ok) {
                const data = await res.json();
                setEligibility({
                    eligible: data.eligible,
                    error: data.error,
                    checked: true,
                    inGuild: data.inGuild,
                    userRoles: data.userRoles || [],
                    claimed: data.claimed || false,
                    isCreator: data.isCreator || false,
                });
            } else {
                const data = await res.json();
                setEligibility({
                    eligible: false,
                    error: data.error?.message || 'Verification failed',
                    checked: true,
                    inGuild: false,
                    userRoles: []
                });
            }
        } catch {
            setEligibility({ eligible: false, error: 'Failed to check eligibility', checked: true });
        } finally {
            setCheckingEligibility(false);
        }
    };

    const loginAndClaim = () => {
        const returnTo = encodeURIComponent(`/open/${claimSlug}`);
        const usePopup = process.env.NEXT_PUBLIC_DISCORD_AUTH_POP_UP === '1';

        if (isLoggedIn || !usePopup) {
            // Expired token OR popup disabled — full redirect, returns here after OAuth.
            window.location.href = `/api/discord/auth?return_to=${returnTo}`;
        } else {
            // No session + popup enabled — open popup so this page stays open.
            const url = `/api/discord/auth?return_to=${returnTo}&popup=1`;
            const popup = window.open(url, 'discord-auth', 'width=500,height=800,scrollbars=yes');
            if (!popup) {
                // Popup blocked — fall back to full redirect.
                window.location.href = `/api/discord/auth?return_to=${returnTo}`;
                return;
            }
            const onMessage = async (event: MessageEvent) => {
                if (event.origin !== window.location.origin) return;
                if (event.data?.type === 'DISCORD_LOGIN_SUCCESS') {
                    window.removeEventListener('message', onMessage);
                    await checkAuth();
                }
            };
            window.addEventListener('message', onMessage);
        }
    };

    const pollClaimStatus = useCallback((claimId: string) => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/api/claims/${claimId}`);
                if (res.ok) {
                    const data: ClaimStatus = await res.json();
                    setClaimStatus(data);
                    if (data.status === 'confirmed') {
                        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                        setViewState('success');
                    } else if (data.status === 'failed_permanent') {
                        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                        setError(data.last_error || 'Claim failed permanently.');
                        setViewState('claim');
                    }
                }
            } catch { /* keep polling */ }
        }, 3000);
    }, []);

    const submitClaim = async () => {
        setClaiming(true);
        setError(null);
        // Don't set viewState to processing immediately, validate first
        // But if we want specific UI behavior...
        // Let's validate first.

        try {
            // Validate address + ATA check
            const validationRes = await fetch('/api/validate-address', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: address, tokenMint: daget?.token_mint }),
            });
            const validationData = await validationRes.json();

            if (!validationData.valid) {
                setError(validationData.message || 'Invalid address');
                setClaiming(false);
                return;
            }

            if (!validationData.exists) {
                setError(validationData.message || 'Address not found on blockchain. Please use an active wallet.');
                setClaiming(false);
                return;
            }

            // Check if wallet has the required token account (skip for native SOL - no ATA needed)
            if (daget?.token_symbol !== 'SOL' && !validationData.hasAta) {
                setShowAtaModal(true);
                setClaiming(false);
                return;
            }

            setViewState('processing'); // Now transition

            // Save wallet address to user profile
            try {
                await fetch('/api/me', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        receiving_address: address,
                    }),
                });
            } catch (err) {
                console.error('Failed to save wallet address:', err);
                // Don't fail the claim if saving the address fails
            }

            const res = await fetch('/api/claims', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Idempotency-Key': nanoid(),
                },
                body: JSON.stringify({
                    claim_slug: claimSlug,
                    receiving_address: address,
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error?.message || 'Claim failed');
                setViewState('claim'); // Revert on error
            } else {
                setClaimStatus({
                    claim_id: data.claim_id,
                    status: 'created',
                    amount_base_units: null,
                    tx_signature: null,
                    attempt_count: 0,
                    last_error: null,
                });
                // viewState is already processing
                pollClaimStatus(data.claim_id);
            }
        } catch {
            setError('Something went wrong');
            setViewState('claim'); // Revert on error
        } finally {
            setClaiming(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-background-dark flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>;
    }

    if (!daget) {
        return <div className="min-h-screen bg-background-dark flex items-center justify-center text-text-secondary">
            Daget not found
        </div>;
    }

    const spotsLeft = daget.total_winners - daget.claimed_count;
    const progressPercent = daget.total_winners > 0 ? Math.round((daget.claimed_count / daget.total_winners) * 100) : 0;
    const isEligibilityFailure = eligibility.error === 'You are not a member of the required Discord server.' ||
        eligibility.error === 'You do not have any of the required roles in this server.';
    const shouldPromptLogin = eligibility.error && !isEligibilityFailure && !eligibility.claimed && !eligibility.isCreator;

    // Derive processing step from claim status
    const hasTxSignature = Boolean(claimStatus?.tx_signature);
    const processingStep = (() => {
        if (!claimStatus) return 0;
        if (claimStatus.status === 'confirmed') return 4;
        if (hasTxSignature) return 3;
        // status is 'created', 'submitted' or 'failed_retryable'
        // If it was created, then picked up by the worker, it becomes submitted.
        // During 'submitted' it usually means the worker is trying to send the TX.
        // So step 2 is "Submitting to Solana".
        if (claimStatus.status === 'submitted' || claimStatus.status === 'failed_retryable') return 2;
        // Step 1: Claim Created / Data Stored
        return 1;
    })();

    return (
        <div className="min-h-screen bg-background-dark text-text-primary claim-bg-glow">
            {/* Header */}
            <header className="h-14 flex items-center justify-between px-4 max-w-[1250px] mx-auto w-full">
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <img src="/images/dagetfun_logo.png" alt="Daget.fun" className="w-8 h-8 rounded-lg" />
                    <div className="inline-block px-3 py-1 bg-transparent arcade-border-magenta leading-none">
                        <span className="font-arcade text-sm text-neon-magenta animate-pulse tracking-widest leading-none">DAGET.FUN</span>
                    </div>
                </Link>
            </header>

            <div className="flex items-start justify-center px-4 pb-12 mt-2 md:mt-4">
                <div className="w-full max-w-[1250px] flex flex-col items-center mx-auto">

                    {/* ═══════════ CLAIM FORM STATE ═══════════ */}
                    {viewState === 'claim' && (
                        <div className="w-full bg-surface border border-border-dark/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:grid md:grid-cols-[60%_40%] md:grid-rows-[auto_1fr] relative">
                            {/* Hero Background Glow (Spans whole card) */}
                            <div className="absolute inset-x-0 top-0 h-48 md:h-64 overflow-hidden pointer-events-none opacity-60 z-0">
                                <div className="absolute inset-0 animated-hero-bg"></div>
                                <div className="absolute inset-0 dot-pattern"></div>
                                <div className="hero-overlay absolute inset-0 bg-gradient-to-b from-transparent via-surface/80 to-surface"></div>
                            </div>

                            {/* Row 1 left: Title and Creator Info */}
                            <div className="relative z-10 border-b md:border-b-0 border-border-dark/50 p-6 md:p-8 md:pr-4">
                                <div className="relative z-10 space-y-3 mb-6">
                                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary">{daget.name}</h2>
                                    {/* Creator Info */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-text-muted">by</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                                                {daget.author_discord_avatar_url ? (
                                                    <img
                                                        src={daget.author_discord_avatar_url}
                                                        alt={daget.author_discord_username || 'Creator'}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-[10px] font-semibold text-primary">
                                                        {(daget.author_discord_username || 'U').charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs font-medium text-text-secondary">
                                                {daget.author_discord_username || 'Unknown'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Row 1 right: spacer so row 2 aligns with rich-text */}
                            <div className="hidden md:block p-6 md:p-8 md:pl-4" aria-hidden />

                            {/* Row 2 left: Message (rich-text) */}
                            <div className="relative z-10 flex flex-col border-b md:border-b-0 border-border-dark/50 p-6 md:pt-4 md:pb-8 md:pr-4 md:min-h-0">
                                <div className="relative z-10 flex-grow min-h-0">
                                    {daget.message_html ? (
                                        <div
                                            className="text-sm text-text-secondary leading-relaxed rich-text-content"
                                            dangerouslySetInnerHTML={{
                                                __html: DOMPurify.sanitize(daget.message_html, {
                                                    ADD_TAGS: ['img', 'iframe', 'video'],
                                                    ADD_ATTR: ['src', 'alt', 'class', 'style', 'width', 'height', 'frameborder', 'allowfullscreen'],
                                                    ADD_URI_SCHEMES: ['data']
                                                } as any)
                                            }}
                                        />
                                    ) : null}
                                </div>
                            </div>

                            {/* Row 2 right: Actions and Requirements (aligned with rich-text) */}
                            <div className="w-full p-6 md:p-8 md:pt-4 md:pl-4 space-y-7 bg-transparent flex flex-col justify-start relative z-10">

                                {/* Info Pills */}
                                <div className="flex flex-wrap gap-2">
                                    <span className="flex items-center gap-1.5 bg-blue-400/10 text-blue-400 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide">
                                        <span className="material-icons text-[12px]">paid</span>
                                        Token: {daget.token_symbol}
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide">
                                        <span className="material-icons text-[12px]">track_changes</span>
                                        Spots: {spotsLeft} left
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-emerald-400/10 text-emerald-400 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide">
                                        <span className="material-icons text-[12px]">category</span>
                                        Mode: {daget.daget_type === 'fixed' ? 'Fixed' : 'Random'}
                                    </span>
                                </div>

                                {/* Progress Bar */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">Progress</span>
                                        <span className="text-[11px] font-mono font-bold text-text-muted">
                                            {daget.claimed_count.toLocaleString()} / {daget.total_winners.toLocaleString()} Claimed
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-border-dark/60 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full progress-fill"
                                            style={{ width: `${progressPercent}%`, transition: 'width 0.8s ease-out' }}
                                        ></div>
                                    </div>

                                    <div className="flex items-center justify-between mt-6 mb-2 min-h-[24px]">
                                        {daget.requirements_summary && daget.requirements_summary !== 'No specific roles required' ? (
                                            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Requirements</span>
                                        ) : <span />}

                                        <button
                                            onClick={() => { setShowWinnersModal(true); fetchWinners(); }}
                                            className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-[9px] font-bold text-white transition-all duration-200 border border-white/10 hover:bg-white/20 active:scale-95"
                                        >
                                            <span className="material-icons text-[11px] text-primary">emoji_events</span>
                                            <span className="uppercase tracking-wide">Show Winners</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Requirements */}
                                {daget.requirements_summary && daget.requirements_summary !== 'No specific roles required' && (
                                    <div className="space-y-4">
                                        {/* Server Requirement */}
                                        <div className={`flex items-center justify-between p-3 rounded-xl border transition-colors duration-200 ${isLoggedIn && eligibility.checked
                                            ? (eligibility.inGuild ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20')
                                            : 'bg-background-dark/30 border-border-dark/60'
                                            }`}>
                                            <div className="flex items-center gap-3">
                                                {daget.discord_guild_icon && daget.discord_guild_id ? (
                                                    <img
                                                        src={`https://cdn.discordapp.com/icons/${daget.discord_guild_id}/${daget.discord_guild_icon}.png`}
                                                        alt={daget.discord_guild_name}
                                                        className="w-10 h-10 rounded-full"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-[#5865F2]/20 flex items-center justify-center">
                                                        <span className="text-[#5865F2] font-bold">{daget.discord_guild_name?.charAt(0) || 'D'}</span>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-wide text-text-muted font-semibold mb-0.5">Member of the following discord server:</p>
                                                    <p className="text-sm font-bold text-text-primary">{daget.discord_guild_name}</p>
                                                </div>
                                            </div>

                                            {isLoggedIn && checkingEligibility ? (
                                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                                </div>
                                            ) : isLoggedIn && eligibility.checked ? (
                                                eligibility.inGuild ? (
                                                    <div
                                                        className="w-6 h-6 rounded-full flex items-center justify-center animate-in zoom-in duration-300 spring-bounce text-white shadow-sm"
                                                        style={{ backgroundColor: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.6)' }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    </div>
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center animate-in zoom-in duration-300">
                                                        <span className="material-icons text-red-400 text-[16px]">close</span>
                                                    </div>
                                                )
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-border-dark/30 flex items-center justify-center">
                                                    <span className="material-icons text-text-muted/50 text-[16px]">remove</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Roles Requirement */}
                                        {daget.requirements?.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest pl-1 mb-2">Have one of the following roles:</p>
                                                <div className="flex flex-wrap gap-2.5">
                                                    {daget.requirements.map((role: any) => {
                                                        const hasRole = eligibility.userRoles?.includes(role.role_id);
                                                        const isChecked = isLoggedIn && eligibility.checked && hasRole;
                                                        const roleColor = role.role_color && role.role_color !== 0
                                                            ? `#${role.role_color.toString(16).padStart(6, '0')}`
                                                            : null;

                                                        // Styles
                                                        const activeColor = roleColor || '#4ade80'; // Role color or Green if none
                                                        const textColor = roleColor || (isChecked ? '#4ade80' : '#a1a1aa'); // Role color, or Green (if checked+no color), or Grey

                                                        const glowStyle = isChecked
                                                            ? {
                                                                boxShadow: `0 0 12px ${activeColor}40, inset 0 0 10px ${activeColor}10`,
                                                                borderColor: activeColor
                                                            }
                                                            : {
                                                                borderColor: roleColor ? `${roleColor}30` : 'rgba(255,255,255,0.1)'
                                                            };

                                                        return (
                                                            <div
                                                                key={role.role_id}
                                                                className={`
                                                                    relative flex items-center gap-2 pl-2 pr-3 py-2 rounded-xl border transition-all duration-300 overflow-hidden group bg-black/20
                                                                    ${isChecked ? '' : 'hover:border-white/20 hover:bg-white/5'}
                                                                `}
                                                                style={{
                                                                    ...glowStyle
                                                                }}
                                                                title={role.role_name}
                                                            >
                                                                {/* Left Color Indicator Bar (thicker) - Only if not checked to avoid visual clutter? Or keep it? keeping it for now */}
                                                                {roleColor && (
                                                                    <div
                                                                        className={`absolute left-0 top-0 bottom-0 w-[4px] transition-all duration-300`}
                                                                        style={{ backgroundColor: roleColor }}
                                                                    />
                                                                )}

                                                                {/* Status Icon */}
                                                                {/* Status Icon */}
                                                                <div className={`
                                                                    w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ml-1 transition-all duration-300
                                                                    ${isChecked
                                                                        ? 'text-white shadow-sm scale-110 animate-in zoom-in spring-bounce duration-500'
                                                                        : 'bg-black/40 text-text-muted/50'}
                                                                `}
                                                                    style={isChecked ? { backgroundColor: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.6)' } : {}}
                                                                >
                                                                    {isLoggedIn && checkingEligibility ? (
                                                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                                    ) : isChecked ? (
                                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                                                                            <polyline points="20 6 9 17 4 12" />
                                                                        </svg>
                                                                    ) : (
                                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: roleColor || '#52525b' }}></div>
                                                                    )}
                                                                </div>

                                                                {/* Role Name */}
                                                                <span
                                                                    className="text-xs font-bold tracking-wide transition-colors duration-200"
                                                                    style={{ color: textColor }}
                                                                >
                                                                    {role.role_name}
                                                                </span>

                                                                {/* Subtle shimmer effect for checked roles */}
                                                                {isChecked && (
                                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Eligibility status */}
                                {isLoggedIn && checkingEligibility && (
                                    <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-background-dark/50">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                                        <span className="text-xs text-text-secondary">Checking eligibility...</span>
                                    </div>
                                )}

                                {/* Discord session expired or other errors */}
                                {isLoggedIn && eligibility.checked && !eligibility.eligible && shouldPromptLogin && (
                                    <div className="p-3 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/20 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[#5865F2] text-sm">login</span>
                                            <span className="text-xs text-[#5865F2] font-medium">
                                                {eligibility.error === 'Discord session expired' ? 'Discord session expired' : 'Verification failed'}
                                            </span>
                                        </div>
                                        {eligibility.error !== 'Discord session expired' && (
                                            <p className="text-xs text-[#5865F2]/70 ml-6">{eligibility.error}</p>
                                        )}
                                        <button
                                            className="w-full flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#5865F2]/85 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 text-sm active:scale-[0.98]"
                                            onClick={loginAndClaim}
                                        >
                                            <span className="material-icons text-base">login</span>
                                            Discord Sign in
                                        </button>
                                    </div>
                                )}

                                {/* Creator cannot claim */}
                                {isLoggedIn && eligibility.checked && eligibility.isCreator && (
                                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                        <div className="flex items-center gap-2">
                                            <span className="material-icons text-amber-400 text-lg">shield</span>
                                            <span className="text-sm text-amber-400 font-semibold">You cannot claim the daget that you created.</span>
                                        </div>
                                    </div>
                                )}

                                {/* Already Claimed */}
                                {isLoggedIn && eligibility.checked && eligibility.claimed && (
                                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                                        <div className="flex items-center gap-2">
                                            <span className="material-icons text-primary text-lg">check_circle</span>
                                            <span className="text-sm text-primary font-semibold">You have already claimed this Daget.</span>
                                        </div>
                                    </div>
                                )}

                                {/* Not eligible (only for specific requirement failures) */}
                                {isLoggedIn && eligibility.checked && !eligibility.eligible && !eligibility.claimed && isEligibilityFailure && (
                                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-red-400 text-sm">block</span>
                                            <span className="text-xs text-red-400 font-medium">Not Eligible</span>
                                        </div>
                                        <p className="text-xs text-red-400/70 mt-1 ml-6">{eligibility.error}</p>
                                    </div>
                                )}

                                {/* Active daget actions */}
                                {daget.status === 'active' && (
                                    <div className="space-y-4">
                                        {isLoggedIn ? (
                                            <>
                                                {eligibility.checked && eligibility.eligible && !eligibility.claimed && (
                                                    <>
                                                        {/* Address Input */}
                                                        <div>
                                                            <label className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2 block">
                                                                Your Solana Address
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="Enter your Solana wallet address"
                                                                value={address}
                                                                onChange={(e) => setAddress(e.target.value)}
                                                                className="w-full bg-background-dark/50 border-2 border-border-dark rounded-xl px-4 py-4 text-sm text-text-primary placeholder-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 font-mono"
                                                            />
                                                        </div>

                                                        {/* CTA Button */}
                                                        <button
                                                            className="group relative w-full py-[18px] bg-gradient-to-r from-primary to-[#5A6AE6] text-white font-bold text-base rounded-[14px] cursor-pointer shadow-[0_8px_24px_rgba(109,124,255,0.3)] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(109,124,255,0.4)] active:translate-y-0 transition-all duration-200 cta-shimmer overflow-hidden flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            onClick={submitClaim}
                                                            disabled={!address || address.length < 32 || claiming}
                                                        >
                                                            {claiming ? (
                                                                <>
                                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                                                    Claiming...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    Claim Your Daget <span className="material-icons text-sm arrow-slide">arrow_forward</span>
                                                                </>
                                                            )}
                                                        </button>
                                                        {error && (
                                                            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                                                <span className="material-icons text-red-400 text-sm">error_outline</span>
                                                                <p className="text-xs text-red-400 font-medium">{error}</p>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </>
                                        ) : (
                                            <button
                                                className="group relative w-full py-[18px] bg-gradient-to-r from-primary to-[#5A6AE6] text-white font-bold text-base rounded-[14px] cursor-pointer shadow-[0_8px_24px_rgba(109,124,255,0.3)] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(109,124,255,0.4)] active:translate-y-0 transition-all duration-200 cta-shimmer overflow-hidden flex items-center justify-center gap-2"
                                                onClick={loginAndClaim}
                                            >
                                                Login with Discord to Claim
                                            </button>
                                        )}
                                    </div>
                                )}

                                {daget.status !== 'active' && (
                                    <div className="text-center text-sm text-text-secondary p-4 bg-background-dark/50 rounded-xl">
                                        This Daget is {daget.status}. No new claims can be made.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══════════ PROCESSING STATE ═══════════ */}
                    {viewState === 'processing' && (
                        <div className="w-full max-w-[560px] mx-auto bg-surface border border-border-dark/80 rounded-2xl shadow-2xl overflow-hidden">
                            <div className="p-8 space-y-6">
                                <h3 className="text-xl font-bold text-text-primary text-center">Processing Your Claim</h3>
                                <p className="text-sm text-text-secondary text-center">Sit tight — we&apos;re sending your tokens</p>

                                {/* Timeline */}
                                <div className="space-y-0">
                                    {/* Step 1: Claim Created (Storing Data) */}
                                    <div className="flex gap-4">
                                        <div className="flex flex-col items-center">
                                            {processingStep >= 2 ? (
                                                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center check-bounce shrink-0">
                                                    <span className="material-icons text-green-400 text-[18px]">check</span>
                                                </div>
                                            ) : (
                                                <div className="relative shrink-0">
                                                    <div className="absolute inset-0 bg-primary/30 rounded-full pulse-ring"></div>
                                                    <div className="relative w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                                                        <span className="material-icons text-primary text-[18px] animate-spin">sync</span>
                                                    </div>
                                                </div>
                                            )}
                                            <div className={`w-0.5 h-full min-h-[40px] ${processingStep >= 2 ? 'bg-green-500/40' : 'bg-border-dark/40 border-l border-dashed border-border-dark'}`}></div>
                                        </div>
                                        <div className="pb-6 pt-1 flex-1">
                                            <p className={`text-sm font-semibold transition-colors duration-300 ${processingStep >= 2 ? 'text-green-400' : 'text-primary'}`}>
                                                {processingStep === 1 ? 'Storing Data...' : 'Claim Created'}
                                            </p>
                                            <p className="text-xs text-text-muted mt-0.5">
                                                {processingStep >= 2 ? 'Your spot has been reserved!' : 'Saving claim securely...'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Step 2: Submitting to Solana */}
                                    <div className="flex gap-4">
                                        <div className="flex flex-col items-center">
                                            {processingStep >= 2 ? (
                                                processingStep >= 3 ? (
                                                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center check-bounce shrink-0">
                                                        <span className="material-icons text-green-400 text-[18px]">check</span>
                                                    </div>
                                                ) : (
                                                    <div className="relative shrink-0">
                                                        <div className="absolute inset-0 bg-primary/30 rounded-full pulse-ring"></div>
                                                        <div className="relative w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                                                            <span className="material-icons text-primary text-[18px] animate-spin">sync</span>
                                                        </div>
                                                    </div>
                                                )
                                            ) : (
                                                <div className="w-8 h-8 rounded-full border-2 border-dashed border-border-dark/60 flex items-center justify-center shrink-0">
                                                    <span className="material-icons text-text-muted text-[18px]">send</span>
                                                </div>
                                            )}
                                            <div className={`w-0.5 h-full min-h-[40px] flex-1 ${processingStep >= 3 ? 'bg-green-500/40' : processingStep === 2 ? 'bg-primary/40' : 'bg-border-dark/40 border-l border-dashed border-border-dark'}`}></div>
                                        </div>
                                        <div className="pb-6 pt-1 flex-1">
                                            <p className={`text-sm font-semibold ${processingStep >= 2 ? (processingStep >= 3 ? 'text-green-400' : 'text-primary') : 'text-text-muted'}`}>
                                                Submitting to Solana
                                            </p>
                                            <p className="text-xs text-text-muted mt-0.5">
                                                {processingStep >= 3 ? 'Transaction submitted!' : processingStep === 2 ? 'Sending transaction to the network...' : 'Waiting to submit...'}
                                            </p>
                                            {claimStatus?.tx_signature && (
                                                <div className="mt-4 bg-background-dark/50 rounded-lg p-3 border border-border-dark/40 flex items-center justify-between gap-4">
                                                    <span className="text-xs font-mono text-text-muted truncate">TX: {shortenTx(claimStatus.tx_signature)}</span>
                                                    <a
                                                        href={solscanUrl(claimStatus.tx_signature)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-1 flex-shrink-0"
                                                    >
                                                        View <span className="material-icons text-[12px]">open_in_new</span>
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Step 3: Finalizing */}
                                    <div className="flex gap-4">
                                        <div className="flex flex-col items-center">
                                            {processingStep >= 3 ? (
                                                processingStep >= 4 ? (
                                                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center check-bounce shrink-0">
                                                        <span className="material-icons text-green-400 text-[18px]">check</span>
                                                    </div>
                                                ) : (
                                                    <div className="relative shrink-0">
                                                        <div className="absolute inset-0 bg-primary/30 rounded-full pulse-ring"></div>
                                                        <div className="relative w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                                                            <span className="material-icons text-primary text-[18px] animate-spin">sync</span>
                                                        </div>
                                                    </div>
                                                )
                                            ) : (
                                                <div className="w-8 h-8 rounded-full border-2 border-dashed border-border-dark/60 flex items-center justify-center shrink-0">
                                                    <span className="material-icons text-text-muted text-[18px]">hourglass_top</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="pt-1 flex-1">
                                            <p className={`text-sm font-semibold ${processingStep >= 4 ? 'text-green-400' : processingStep === 3 ? 'text-primary' : 'text-text-muted'}`}>Finalizing</p>
                                            <p className="text-xs text-text-muted mt-0.5">
                                                {processingStep >= 4 ? 'Done!' : processingStep === 3 ? 'Waiting for network confirmation...' : 'Waiting for confirmation...'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-2 pt-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                    <span className="text-[10px] text-text-muted font-semibold">Refreshing in real-time</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══════════ SUCCESS STATE ═══════════ */}
                    {viewState === 'success' && claimStatus && (
                        <div className="w-full max-w-[560px] mx-auto bg-surface border border-green-500/20 rounded-2xl shadow-2xl overflow-hidden scale-up-gentle">
                            <div className="p-8 space-y-5 text-center relative">
                                {/* Confetti dots */}
                                <div className="confetti-dot c1"></div>
                                <div className="confetti-dot c2"></div>
                                <div className="confetti-dot c3"></div>
                                <div className="confetti-dot c4"></div>

                                <div>
                                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 check-bounce relative group">
                                        <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping opacity-20"></div>
                                        <span className="material-icons text-green-400 text-4xl relative z-10 group-hover:scale-110 transition-transform duration-300">check</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-text-primary fade-in-up">Claim Successful!</h3>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-sm text-text-secondary fade-in-up delay-100">You received</p>
                                    <div className="fade-in-up delay-200">
                                        <div className="flex items-center justify-center gap-3">
                                            <p className="text-4xl font-bold font-mono text-text-primary tracking-tighter shadow-green-glow inline-block">
                                                {formatAmount(claimStatus.amount_base_units, daget.token_decimals ?? 6, daget.token_symbol)}
                                            </p>
                                            {getTokenIcon(daget.token_symbol) ? (
                                                <img
                                                    src={getTokenIcon(daget.token_symbol)!}
                                                    alt={daget.token_symbol}
                                                    className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                                                />
                                            ) : (
                                                <span className="text-blue-400 text-2xl font-bold">{daget.token_symbol}</span>
                                            )}
                                        </div>
                                        {daget.token_symbol === 'SOL' && solPrice > 0 && claimStatus.amount_base_units != null && (
                                            <p className="text-sm text-green-400 mt-1.5 fade-in-up delay-200">
                                                ≈ ${((claimStatus.amount_base_units / Math.pow(10, daget.token_decimals ?? 9)) * solPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        )}
                                    </div>
                                    <p className="text-sm text-text-secondary fade-in-up delay-300">Tokens are on their way to your wallet</p>
                                </div>

                                {claimStatus.tx_signature && (
                                    <div className="fade-in-up delay-500 space-y-3">
                                        <div className="bg-background-dark/50 rounded-lg p-3 border border-border-dark/40 flex items-center justify-center max-w-[320px] mx-auto">
                                            <span className="text-xs font-mono text-text-muted truncate">TX: {shortenTx(claimStatus.tx_signature)}</span>
                                        </div>
                                        <a
                                            href={solscanUrl(claimStatus.tx_signature)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 bg-primary/10 text-primary px-6 py-3 rounded-xl text-sm font-semibold hover:bg-primary/20 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-primary/20"
                                        >
                                            <span className="material-icons text-sm">open_in_new</span>View on Solscan
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Unified Footer */}
                    <div className="mt-8 flex items-center justify-center gap-1.5 opacity-70">
                        <span className="material-icons text-primary text-[14px]">bolt</span>
                        <span className="text-[11px] text-text-muted font-semibold tracking-wide">Powered by Solana</span>
                    </div>

                </div>
            </div>

            {/* ═══════════ ATA MISSING MODAL ═══════════ */}
            {showAtaModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAtaModal(false)}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

                    {/* Modal */}
                    <div
                        className="relative bg-surface border border-border-dark/80 rounded-2xl shadow-2xl w-full max-w-[440px] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header gradient */}
                        <div className="relative h-3 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/60 via-orange-500/60 to-amber-500/60" />
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Icon + Title */}
                            <div className="text-center space-y-2">
                                <div className="w-14 h-14 bg-amber-500/15 rounded-full flex items-center justify-center mx-auto">
                                    <span className="material-icons text-amber-400 text-3xl">account_balance_wallet</span>
                                </div>
                                <h3 className="text-lg font-bold text-text-primary">Token Account Required</h3>
                            </div>

                            {/* Explanation */}
                            <div className="bg-background-dark/50 rounded-xl p-4 space-y-3">
                                <p className="text-sm text-text-secondary leading-relaxed">
                                    Your wallet doesn&apos;t have a <strong className="text-text-primary">{daget?.token_symbol}</strong> account yet.
                                    On Solana, wallets need a token account for each type of token they receive.
                                </p>
                                <div className="border-t border-border-dark/40 pt-3">
                                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">How to set it up</p>
                                    <ul className="space-y-2">
                                        <li className="flex items-start gap-2 text-sm text-text-secondary">
                                            <span className="text-primary font-bold mt-0.5">1.</span>
                                            <span>Open your Solana wallet (Phantom, Solflare, etc.)</span>
                                        </li>
                                        <li className="flex items-start gap-2 text-sm text-text-secondary">
                                            <span className="text-primary font-bold mt-0.5">2.</span>
                                            <span>Receive any amount of <strong className="text-text-primary">{daget?.token_symbol}</strong> — even $0.01 works</span>
                                        </li>
                                        <li className="flex items-start gap-2 text-sm text-text-secondary">
                                            <span className="text-primary font-bold mt-0.5">3.</span>
                                            <span>Come back and claim your Daget!</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* Why this is needed */}
                            <div className="flex items-start gap-2.5 bg-primary/5 border border-primary/10 rounded-xl p-3">
                                <span className="material-icons text-primary text-sm mt-0.5">info</span>
                                <p className="text-xs text-text-secondary leading-relaxed">
                                    <strong className="text-text-primary">Why?</strong> Setting up a new token account costs 0.00204 SOL (~$0.20). Without this check, the giveaway creator would have to pay this fee for every new wallet — which adds up fast.
                                </p>
                            </div>

                            {/* Tip */}
                            <div className="flex items-start gap-2 px-1">
                                <span className="material-icons text-amber-400 text-sm mt-0.5">lightbulb</span>
                                <p className="text-xs text-text-secondary leading-relaxed">
                                    <strong className="text-text-primary">Tip:</strong> If you already use {daget?.token_symbol}, try a different wallet address that has received {daget?.token_symbol} before.
                                </p>
                            </div>

                            {/* Close button */}
                            <button
                                className="w-full py-3 bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary font-semibold text-sm rounded-xl transition-all duration-200 active:scale-[0.98]"
                                onClick={() => setShowAtaModal(false)}
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ WINNERS LIST MODAL ═══════════ */}
            {
                showWinnersModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowWinnersModal(false)}>
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

                        {/* Modal */}
                        <div
                            className="relative bg-surface border border-border-dark/80 rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-5 border-b border-border-dark/60 flex items-center justify-between bg-card-dark/50">
                                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                    <span className="material-icons text-primary text-xl">emoji_events</span>
                                    Recent Winners
                                </h3>
                                <button
                                    onClick={() => setShowWinnersModal(false)}
                                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                                >
                                    <span className="material-icons text-text-muted text-lg">close</span>
                                </button>
                            </div>

                            {/* List */}
                            <div className="flex-1 overflow-y-auto p-0 custom-scrollbar bg-background-dark/30">
                                {loadingWinners ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                                    </div>
                                ) : winnersList.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-text-muted">
                                        <span className="material-icons text-4xl mb-2 opacity-50">inbox</span>
                                        <p className="text-sm">No winners yet</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-text-muted font-semibold sticky top-0 z-10 backdrop-blur-md">
                                            <tr>
                                                <th className="px-5 py-3">Winner</th>
                                                <th className="px-5 py-3">Amount</th>
                                                <th className="px-5 py-3">Status</th>
                                                <th className="px-5 py-3 text-right">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border-dark/40">
                                            {winnersList.map((w) => (
                                                <tr key={w.claim_id} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden flex-shrink-0">
                                                                {w.claimant?.discord_avatar_url ? (
                                                                    <img
                                                                        src={w.claimant.discord_avatar_url}
                                                                        alt=""
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary">
                                                                        {(w.claimant?.discord_username || '?').charAt(0).toUpperCase()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className="text-sm font-medium text-text-primary">
                                                                {w.claimant?.discord_username || 'Unknown'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <div className="flex flex-col">
                                                            <div>
                                                                <span className="font-mono text-sm font-bold text-text-primary">
                                                                    {formatAmount(w.amount_base_units, daget?.token_decimals || 6, daget?.token_symbol)}
                                                                </span>
                                                                <span className="text-xs text-text-muted ml-1">{daget?.token_symbol}</span>
                                                            </div>
                                                            {daget?.token_symbol === 'SOL' && solPrice > 0 && w.amount_base_units != null && (
                                                                <span className="text-xs text-green-400 mt-0.5">
                                                                    ≈ ${((w.amount_base_units / Math.pow(10, daget?.token_decimals || 9)) * solPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-1.5">
                                                            {w.status === 'confirmed' ? (
                                                                <>
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                                    <span className="text-xs text-green-400 font-medium">Claimed</span>
                                                                </>
                                                            ) : w.status === 'failed_permanent' ? (
                                                                <>
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                                    <span className="text-xs text-red-400 font-medium">Failed</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                                                                    <span className="text-xs text-yellow-400 font-medium">Processing</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        <span className="text-xs text-text-muted font-mono">
                                                            {new Date(w.created_at).toLocaleString(undefined, {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
