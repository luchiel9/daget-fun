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

    useEffect(() => {
        fetchWalletData();
        fetchTokenPrices();
    }, []);

    const fetchWalletData = async () => {
        try {
            const res = await fetch('/api/wallet/balances');
            if (res.ok) {
                const data = await res.json();
                setWallet(data);
            }
        } catch (error) {
            console.error('Failed to fetch wallet data', error);
        }
    };

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

    if (!wallet) {
        return null;
    }

    const solBalance = parseFloat(wallet.sol);
    const usdcBalance = parseFloat(wallet.usdc);
    const usdtBalance = parseFloat(wallet.usdt);

    return (
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
                    {onExportKey && (
                        <button
                            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-orange-400/70 hover:text-orange-400 hover:bg-orange-500/10 border border-orange-400/20 hover:border-orange-400/40 transition-all flex items-center gap-1.5 active:scale-[0.97]"
                            title="Export private key"
                            onClick={onExportKey}
                        >
                            <span className="material-icons text-[14px]">key</span>
                            Export Key
                        </button>
                    )}
                    {onChangeWallet && (
                        <button
                            onClick={onChangeWallet}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-text-muted hover:text-primary hover:bg-primary/5 border border-border-dark/60 hover:border-primary/30 transition-all flex items-center gap-1.5 active:scale-[0.97]"
                            title="Change wallet"
                        >
                            <span className="material-icons text-[14px]">swap_horiz</span>
                            Change Wallet
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
