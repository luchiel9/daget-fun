'use client';

import { useState, useEffect } from 'react';

interface WalletData {
    wallet_public_key: string;
    sol: string;
    usdc: string;
    usdt: string;
}

interface TokenPrices {
    solana?: { usd: number };
}

interface WalletBarProps {
    onRefresh?: () => void;
    onExportKey?: () => void;
    onChangeWallet?: () => void;
}

function truncateAddress(addr: string, start = 4, end = 4): string {
    if (!addr || addr.length <= start + end + 3) return addr || '';
    return `${addr.slice(0, start)}...${addr.slice(-end)}`;
}

export default function WalletBar({ onRefresh, onExportKey, onChangeWallet }: WalletBarProps) {
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [tokenPrices, setTokenPrices] = useState<TokenPrices>({});
    const [copyFeedback, setCopyFeedback] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [walletBarExpanded, setWalletBarExpanded] = useState(false);

    const fetchWalletData = async () => {
        try {
            const res = await fetch('/api/wallet/balances');
            if (res.ok) {
                const data = await res.json();
                setWallet(data);
            }
        } catch (error) {
            console.error('Failed to fetch wallet data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWalletData();
        fetchTokenPrices();
    }, []);

    const fetchTokenPrices = async () => {
        try {
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana,usd-coin,tether&vs_currencies=usd');
            const data = await res.json();
            setTokenPrices(data);
        } catch (error) {
            console.error('Failed to fetch token prices', error);
        }
    };

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
        await fetchWalletData();
        await fetchTokenPrices();
        if (onRefresh) {
            await onRefresh();
        }
        setRefreshing(false);
    };

    const solBalance = wallet ? parseFloat(wallet.sol) : 0;
    const usdcBalance = wallet ? parseFloat(wallet.usdc) : 0;
    const usdtBalance = wallet ? parseFloat(wallet.usdt) : 0;

    if (loading && !wallet) {
        return (
            <div className="px-3 wallet:px-8 py-3 border-b border-border-dark/30 bg-card-dark/60 backdrop-blur-md flex-shrink-0">
                <div className="max-w-7xl mx-auto glass-card rounded-xl overflow-hidden">
                    <div className="px-3 wallet:px-5 py-3 flex flex-col wallet:flex-row items-stretch wallet:items-center gap-3 wallet:gap-6">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-white/10 animate-pulse flex-shrink-0" />
                            <span className="h-4 w-28 rounded bg-white/10 animate-pulse" aria-hidden />
                        </div>
                        <div className="hidden wallet:block w-px h-6 bg-border-dark/60 flex-shrink-0" />
                        <div className="flex items-center gap-5 flex-1">
                            <span className="h-4 w-20 rounded bg-white/10 animate-pulse" aria-hidden />
                            <span className="h-4 w-16 rounded bg-white/10 animate-pulse" aria-hidden />
                            <span className="h-4 w-16 rounded bg-white/10 animate-pulse" aria-hidden />
                        </div>
                        <div className="flex items-center gap-2 border-t border-border-dark/40 pt-3 wallet:border-0 wallet:pt-0">
                            <span className="h-8 w-20 rounded-lg bg-white/10 animate-pulse hidden wallet:block" aria-hidden />
                            <span className="h-8 w-24 rounded-lg bg-white/10 animate-pulse" aria-hidden />
                            <span className="h-8 w-28 rounded-lg bg-white/10 animate-pulse" aria-hidden />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!wallet) {
        return null;
    }

    return (
        <div className="px-3 wallet:px-8 py-3 border-b border-border-dark/30 bg-card-dark/60 backdrop-blur-md flex-shrink-0 mb-6">
            <div className="max-w-7xl mx-auto glass-card rounded-xl overflow-hidden">
                {/* Under 1250px: collapsed header — "Manage Creator Wallet" + compact balances + burger; click to expand */}
                <button
                    type="button"
                    className="wallet:hidden w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
                    onClick={() => setWalletBarExpanded((e) => !e)}
                    aria-expanded={walletBarExpanded}
                >
                    <span className="text-sm font-semibold text-text-primary flex items-center gap-2 flex-shrink-0">
                        <span className="material-icons text-primary text-[18px]">account_balance_wallet</span>
                        Manage Creator Wallet
                    </span>
                    <span className="flex items-center gap-3 min-w-0 flex-1 justify-end text-[10px] font-mono">
                        {refreshing ? (
                            <span className="flex items-center gap-3">
                                <span className="h-2.5 w-12 rounded bg-white/10 animate-pulse" aria-hidden />
                                <span className="h-2.5 w-12 rounded bg-white/10 animate-pulse" aria-hidden />
                                <span className="h-2.5 w-12 rounded bg-white/10 animate-pulse" aria-hidden />
                            </span>
                        ) : (
                            <>
                                <span className="flex items-center gap-1 text-text-primary">
                                    <img alt="SOL" className="w-3.5 h-3.5 rounded-full flex-shrink-0" src="https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png" />
                                    <span>{solBalance.toFixed(2)}</span>
                                </span>
                                <span className="flex items-center gap-1 text-text-primary">
                                    <img alt="USDC" className="w-3.5 h-3.5 rounded-full flex-shrink-0" src="https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png" />
                                    <span>{usdcBalance.toFixed(2)}</span>
                                </span>
                                <span className="flex items-center gap-1 text-text-primary min-w-0">
                                    <img alt="USDT" className="w-3.5 h-3.5 rounded-full flex-shrink-0" src="https://s2.coinmarketcap.com/static/img/coins/64x64/825.png" />
                                    <span className="truncate">{usdtBalance.toFixed(2)}</span>
                                </span>
                            </>
                        )}
                    </span>
                    <span className="material-icons text-text-muted text-[22px] flex-shrink-0">
                        {walletBarExpanded ? 'expand_less' : 'menu'}
                    </span>
                </button>

                {/* Content: at 1250px+ always visible; under 1250 only when expanded. Tokens can wrap (SOL USDC / USDT). */}
                <div className={`px-3 py-3 wallet:px-5 wallet:pb-4 flex flex-col wallet:flex-row wallet:items-center gap-3 wallet:gap-6 ${!walletBarExpanded ? 'hidden wallet:flex' : 'flex'}`}>
                    <div className="flex items-center justify-between wallet:justify-start gap-2 min-w-0 flex-shrink-0 overflow-hidden">
                        <div className="flex items-center gap-1.5 wallet:gap-2 min-w-0 overflow-hidden">
                            <div className="w-6 h-6 wallet:w-7 wallet:h-7 bg-primary/15 rounded-lg flex items-center justify-center flex-shrink-0">
                                <span className="material-icons text-primary text-[14px] wallet:text-[16px]">account_balance_wallet</span>
                            </div>
                            <span className="text-xs wallet:text-sm font-mono font-medium text-text-primary truncate min-w-0">
                                {truncateAddress(wallet.wallet_public_key, 6, 6)}
                            </span>
                            <button
                                className="p-1 hover:bg-primary/15 rounded-md transition-all text-text-muted hover:text-primary flex-shrink-0"
                                title={copyFeedback ? 'Copied!' : 'Copy'}
                                onClick={handleCopyAddress}
                            >
                                <span className="material-icons text-[12px] wallet:text-[14px]">{copyFeedback ? 'check' : 'content_copy'}</span>
                            </button>
                        </div>
                        <button
                            className="wallet:hidden px-2 py-1 rounded-lg text-[10px] font-semibold text-green-400/70 hover:text-green-400 hover:bg-green-500/10 border border-green-400/20 transition-all flex items-center gap-1 active:scale-[0.97] flex-shrink-0"
                            title="Refresh balances"
                            onClick={handleRefresh}
                            disabled={refreshing}
                        >
                            <span className={`material-icons text-[12px] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
                            Refresh
                        </button>
                    </div>

                    <div className="hidden wallet:block w-px h-6 bg-border-dark/60 flex-shrink-0 self-center" />

                    <div className="grid grid-cols-3 wallet:flex wallet:flex-wrap wallet:items-center gap-x-3 gap-y-2 wallet:gap-x-6 wallet:gap-y-3 min-w-0 flex-1 overflow-hidden">
                        <div className="flex items-center gap-1.5 wallet:gap-2 flex-shrink-0 min-w-0 overflow-hidden">
                            <img alt="SOL" className="w-4 h-4 wallet:w-5 wallet:h-5 flex-shrink-0" src="https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png" />
                            {refreshing ? (
                                <>
                                    <span className="h-3.5 wallet:h-4 w-14 wallet:w-16 rounded bg-white/10 animate-pulse" aria-hidden />
                                    <span className="text-[9px] wallet:text-[10px] text-text-muted font-semibold flex-shrink-0">SOL</span>
                                    <span className="hidden lg:inline h-3 w-10 rounded bg-white/10 animate-pulse flex-shrink-0" aria-hidden />
                                </>
                            ) : (
                                <>
                                    <span className="text-xs wallet:text-sm font-mono font-bold text-text-primary truncate">{solBalance.toFixed(4)}</span>
                                    <span className="text-[9px] wallet:text-[10px] text-text-muted font-semibold flex-shrink-0">SOL</span>
                                    {tokenPrices.solana?.usd && (
                                        <span className="hidden lg:inline text-[10px] text-green-500 font-medium flex-shrink-0">
                                            ≈ ${(solBalance * tokenPrices.solana.usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 wallet:gap-2 flex-shrink-0 min-w-0 overflow-hidden">
                            <img alt="USDC" className="w-4 h-4 wallet:w-5 wallet:h-5 flex-shrink-0" src="https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png" />
                            {refreshing ? (
                                <>
                                    <span className="h-3.5 wallet:h-4 w-12 wallet:w-14 rounded bg-white/10 animate-pulse" aria-hidden />
                                    <span className="text-[9px] wallet:text-[10px] text-text-muted font-semibold">USDC</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-xs wallet:text-sm font-mono font-bold text-text-primary truncate">{usdcBalance.toFixed(2)}</span>
                                    <span className="text-[9px] wallet:text-[10px] text-text-muted font-semibold flex-shrink-0">USDC</span>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 wallet:gap-2 flex-shrink-0 min-w-0 overflow-hidden">
                            <img alt="USDT" className="w-4 h-4 wallet:w-5 wallet:h-5 flex-shrink-0" src="https://s2.coinmarketcap.com/static/img/coins/64x64/825.png" />
                            {refreshing ? (
                                <>
                                    <span className="h-3.5 wallet:h-4 w-12 wallet:w-14 rounded bg-white/10 animate-pulse" aria-hidden />
                                    <span className="text-[9px] wallet:text-[10px] text-text-muted font-semibold">USDT</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-xs wallet:text-sm font-mono font-bold text-text-primary truncate">{usdtBalance.toFixed(2)}</span>
                                    <span className="text-[9px] wallet:text-[10px] text-text-muted font-semibold flex-shrink-0">USDT</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 wallet:gap-3 justify-end flex-shrink-0 border-t border-border-dark/30 wallet:border-0 pt-2 wallet:pt-0 min-w-0">
                        <button
                            className="hidden wallet:flex px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-white/5 border border-transparent hover:border-white/10 transition-all items-center gap-1.5 active:scale-[0.97]"
                            title="Refresh balances"
                            onClick={handleRefresh}
                            disabled={refreshing}
                        >
                            <span className={`material-icons text-[16px] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
                            Refresh
                        </button>
                        {onExportKey && (
                            <button
                                onClick={onExportKey}
                                className="flex-1 wallet:flex-none px-3 py-1.5 wallet:px-4 wallet:py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 rounded-lg text-[11px] wallet:text-xs font-semibold transition-all flex items-center justify-center gap-1.5 wallet:gap-2 active:scale-[0.97]"
                            >
                                <span className="material-icons text-[14px] wallet:text-[16px]">vpn_key</span>
                                <span className="hidden sm:inline">Export Key</span>
                            </button>
                        )}
                        {onChangeWallet && (
                            <button
                                onClick={onChangeWallet}
                                className="flex-1 wallet:flex-none px-3 py-1.5 wallet:px-4 wallet:py-2 bg-card-dark hover:bg-white/5 text-text-secondary border border-border-dark rounded-lg text-[11px] wallet:text-xs font-semibold transition-all flex items-center justify-center gap-1.5 wallet:gap-2 active:scale-[0.97]"
                            >
                                <span className="material-icons text-[14px] wallet:text-[16px]">logout</span>
                                <span className="hidden sm:inline">Change Wallet</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
