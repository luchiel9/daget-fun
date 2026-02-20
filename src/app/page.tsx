'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import BlurText from '@/components/reactbits/BlurText';
import Particles from '@/components/reactbits/Particles';
import SpotlightCard from '@/components/reactbits/SpotlightCard';
import FadeIn from '@/components/reactbits/FadeIn';

export default function LandingPage() {
    const [hasSession, setHasSession] = useState(false);

    useEffect(() => {
        fetch('/api/me')
            .then(r => setHasSession(r.ok))
            .catch(() => setHasSession(false));
    }, []);

    const handleLogin = () => {
        window.location.href = '/api/discord/auth?return_to=/dashboard';
    };

    return (
        <div className="min-h-screen bg-background-dark text-text-secondary font-mono antialiased overflow-x-hidden">
            <nav className="fixed top-0 left-0 right-0 z-50 bg-background-dark/95 backdrop-blur-md border-b border-border-dark/60">
                <div className="max-w-7xl mx-auto px-4 h-20 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <img src="/images/dagetfun_logo.png" alt="Daget.fun" className="w-12 h-12 rounded" />

                    </div>
                    <div className="hidden md:flex items-center space-x-8 font-mono text-sm tracking-widest uppercase">
                        <a className="hover:text-primary transition-colors" href="#how-it-works">[ How It Works ]</a>
                        <a className="hover:text-primary transition-colors" href="#use-cases">[ Use Cases ]</a>
                        <a className="hover:text-primary transition-colors" href="#faq">[ FAQ ]</a>
                    </div>
                    <div className="flex items-center gap-6">

                    </div>
                </div>
            </nav>

            <main className="relative pt-40 pb-20">
                {/* Subtle particle background */}
                <div className="absolute inset-0 pointer-events-none">
                    <Particles
                        particleCount={1000}
                        particleSpread={10}
                        speed={0.1}
                        particleColors={['#4FD1ED', '#D16BA5', '#6E9B8A']}
                        alphaParticles={true}
                        particleBaseSize={130}
                        sizeRandomness={0.1}
                        cameraDistance={20}
                    />
                </div>

                <div className="relative max-w-7xl mx-auto px-4">
                    <div className="text-center w-full mb-12 flex flex-col items-center">
                        <h1 className="inline-block px-6 py-2 arcade-border-magenta bg-background-dark text-neon-magenta font-arcade text-2xl sm:text-3xl md:text-5xl lg:text-6xl animate-pulse mt-12 lg:mt-0 relative z-10">
                            DAGET.FUN
                        </h1>
                        {/* Pronunciation Guide */}
                        <div className="mt-3 flex items-center justify-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                            <span className="font-mono text-[10px] tracking-[0.2em] text-text-muted uppercase">
                                read:[ <span className="text-neon-magenta font-semibold italic">/da - get/</span> ]
                            </span>
                        </div>
                    </div>

                    {/* Middle Row: Text and Visual */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center pb-24">
                        {/* Left Column: Text & CTA */}
                        <div className="text-center lg:text-left flex flex-col justify-center max-w-2xl mx-auto lg:mx-0 z-10 w-full mb-12 lg:mb-0">
                            <h2 className="font-arcade text-2xl sm:text-3xl md:text-[2.75rem] lg:text-[3.25rem] leading-[1.1] md:leading-[1] text-transparent relative mb-6">
                                {/* Base text */}
                                <span className="absolute inset-0 bg-clip-text text-transparent bg-gradient-to-br from-white via-primary-light to-primary opacity-50 blur-[2px]">
                                    Role-gated<br />onchain<br />giveaways<br />for your<br />community.
                                </span>
                                {/* Top text */}
                                <span className="relative bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-primary-light drop-shadow-[0_0_15px_rgba(110,155,138,0.5)]">
                                    Role-gated<br />onchain<br />giveaways<br />for your<br />community.
                                </span>
                            </h2>

                            <p className="font-mono text-xs md:text-sm text-text-muted/80 max-w-xl mx-auto lg:mx-0 leading-relaxed uppercase tracking-wide">
                                SECURE, TRANSPARENT, AND AUTOMATED. REWARD YOUR DISCORD MEMBERS WITH SOLANA TOKENS BASED ON THEIR SERVER ROLES.
                            </p>

                            <div className="flex flex-row flex-wrap items-center justify-center lg:justify-start gap-3 md:gap-4 mt-6 text-[9px] md:text-[10px] font-mono text-[#5C6E85] uppercase tracking-widest">
                                <span>Free to use</span>
                                <span className="opacity-50">·</span>
                                <span>Only pay Solana gas fees</span>
                                <span className="opacity-50">·</span>
                                <span className="text-primary/70">No connect wallet needed</span>
                            </div>

                            {/* CTA */}
                            <div className="flex flex-col items-center lg:items-start justify-center mt-12 mb-4 w-full">
                                <div className="flex flex-col w-max lg:self-start">
                                    {hasSession ? (
                                        <Link href="/dashboard" className="inline-block relative group py-2 pr-4 pl-0 mb-4">
                                            {/* L-shaped border: Bottom and Right only */}
                                            <div className="absolute bottom-0 right-0 w-full h-[2px] bg-primary group-hover:shadow-[0_0_10px_rgba(110,155,138,0.5)] transition-all duration-300 origin-left"></div>
                                            <div className="absolute bottom-0 right-0 w-[2px] h-full bg-primary group-hover:shadow-[0_0_10px_rgba(110,155,138,0.5)] transition-all duration-300 origin-bottom"></div>

                                            <div className="relative flex items-center gap-4">
                                                <span className="w-2 h-2 md:w-3 md:h-3 flex-shrink-0 bg-primary/80 group-hover:bg-primary shadow-[0_0_8px_rgba(110,155,138,0.5)] transition-all duration-300"></span>
                                                <span className="font-arcade text-xs sm:text-sm md:text-xl text-primary group-hover:text-primary-light tracking-widest uppercase mb-1 whitespace-nowrap">OPEN DASHBOARD</span>
                                            </div>
                                        </Link>
                                    ) : (
                                        <button onClick={handleLogin} className="inline-block relative group py-2 pr-4 pl-0 mb-4 text-left">
                                            {/* L-shaped border: Bottom and Right only */}
                                            <div className="absolute bottom-0 right-0 w-full h-[2px] bg-[#5865F2] group-hover:shadow-[0_0_10px_rgba(110,155,138,0.5)] transition-all duration-300 origin-left"></div>
                                            <div className="absolute bottom-0 right-0 w-[2px] h-full bg-[#5865F2] group-hover:shadow-[0_0_10px_rgba(110,155,138,0.5)] transition-all duration-300 origin-bottom"></div>

                                            <div className="relative flex items-center gap-4">
                                                <div className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" className="w-full h-full fill-[#5865F2] group-hover:fill-[#6f7bf7] transition-colors">
                                                        <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.16,46,96.06,53,91,65.69,84.69,65.69Z" />
                                                    </svg>
                                                </div>
                                                <span className="font-arcade text-xs sm:text-sm md:text-xl text-[#5865F2] group-hover:text-[#6f7bf7] tracking-widest uppercase mb-1 drop-shadow-md transition-colors whitespace-nowrap">LOGIN WITH DISCORD</span>
                                            </div>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Floating Visual */}
                        <div className="hidden lg:flex justify-end relative perspective-1000 w-full ml-auto">
                            <div className="relative animate-float w-full max-w-md mr-4 lg:mr-0" style={{ transformStyle: 'preserve-3d', transform: 'rotateY(-15deg) rotateX(5deg)' }}>
                                {/* Decorative elements behind ticket */}
                                <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full"></div>
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-neon-magenta/20 blur-xl rounded-full mix-blend-screen"></div>

                                {/* The Ticket Card - Updated to match ClaimPageClient */}
                                <div className="relative bg-surface border border-border-dark/80 rounded-2xl shadow-2xl overflow-hidden w-full pointer-events-none">
                                    {/* Hero with Title and Creator */}
                                    <div className="relative overflow-hidden h-32 md:h-40">
                                        <div className="absolute inset-0 bg-primary/10"></div>
                                        <div className="absolute inset-0 dot-pattern opacity-50"></div>
                                        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent"></div>

                                        {/* Title and Creator Info */}
                                        <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-5 space-y-2">
                                            <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-md">Weekly Community Reward</h2>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-text-muted">by</span>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                                                        <span className="text-[8px] font-semibold text-primary">S</span>
                                                    </div>
                                                    <span className="text-[10px] font-medium text-text-secondary">Solana Maxi</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6 pt-5 space-y-5">
                                        {/* Info Pills */}
                                        <div className="flex flex-wrap gap-2">
                                            <span className="flex items-center gap-1 bg-blue-400/10 text-blue-400 px-2.5 py-1 rounded-full text-[10px] font-semibold">
                                                <span className="material-icons text-[12px]">paid</span> USDC
                                            </span>
                                            <span className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-[10px] font-semibold">
                                                <span className="material-icons text-[12px]">track_changes</span> 42/50 left
                                            </span>
                                        </div>

                                        {/* Requirements */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-2.5 rounded-xl border bg-green-500/5 border-green-500/20">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-[#5865F2]/20 flex items-center justify-center">
                                                        <span className="text-[#5865F2] font-bold text-xs">D</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] uppercase tracking-wide text-text-muted font-semibold mb-0.5">Member of:</p>
                                                        <p className="text-xs font-bold text-text-primary">Daget.fun Community</p>
                                                    </div>
                                                </div>
                                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.6)' }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 p-1.5 pl-2 pr-3 rounded-xl border border-[#4ade80] bg-[#4ade80]/10 w-fit" style={{ boxShadow: '0 0 12px rgba(74,222,128,0.2)' }}>
                                                <div className="w-4 h-4 rounded-full flex items-center justify-center text-white bg-[#22c55e]">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                                </div>
                                                <span className="text-[10px] font-bold text-[#4ade80]">@Diamond_Hands</span>
                                            </div>
                                        </div>

                                        {/* Address Input & CTA */}
                                        <div className="pt-2">
                                            <label className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-1.5 block">Your Solana Address</label>
                                            <div className="w-full bg-background-dark/50 border-2 border-border-dark rounded-xl px-3 py-3 text-[11px] text-text-muted/60 font-mono mb-4">
                                                Paste address here...
                                            </div>

                                            <button className="w-full py-3.5 bg-gradient-to-r from-primary to-[#5A6AE6] text-white font-bold text-sm rounded-xl shadow-[0_4px_12px_rgba(109,124,255,0.3)] flex items-center justify-center gap-2">
                                                Claim Your Daget <span className="material-icons text-xs">arrow_forward</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <section className="py-24 border-y border-border-dark/40 bg-surface">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-20">
                        <h2 className="font-arcade text-lg sm:text-xl md:text-2xl text-white mb-4">BUILT FOR TRANSPARENCY</h2>
                        <div className="h-1 w-32 bg-primary mx-auto"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <FadeIn delay={0} direction="up">
                            <SpotlightCard className="bg-card-dark p-8 border border-border-dark/40 border-l-2 border-l-primary group hover:border-primary/30 transition-colors h-full" spotlightColor="rgba(110, 155, 138, 0.15)">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="p-3 bg-primary/10">
                                        <span className="material-symbols-outlined text-primary text-3xl">security</span>
                                    </div>
                                    <span className="font-arcade text-[10px] text-text-muted">MOD_01</span>
                                </div>
                                <h3 className="font-arcade text-sm text-white mb-4">SERVER-SIDE SECURITY</h3>
                                <p className="font-mono text-sm leading-relaxed text-text-secondary uppercase tracking-tighter">
                                    Verifying roles directly through Discord API to prevent botting. No manual verification required.
                                </p>
                            </SpotlightCard>
                        </FadeIn>
                        <FadeIn delay={0.15} direction="up">
                            <SpotlightCard className="bg-card-dark p-8 border border-border-dark/40 border-l-2 border-l-neon-magenta group hover:border-neon-magenta/30 transition-colors h-full" spotlightColor="rgba(209, 107, 165, 0.15)">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="p-3 bg-neon-magenta/10">
                                        <span className="material-symbols-outlined text-neon-magenta text-3xl">account_balance_wallet</span>
                                    </div>
                                    <span className="font-arcade text-[10px] text-text-muted">MOD_02</span>
                                </div>
                                <h3 className="font-arcade text-sm text-white mb-4">ONCHAIN TRANSFERS</h3>
                                <p className="font-mono text-sm leading-relaxed text-text-secondary uppercase tracking-tighter">
                                    Every giveaway is backed by transparent Solana transactions. Proof of distribution is permanent.
                                </p>
                            </SpotlightCard>
                        </FadeIn>
                        <FadeIn delay={0.3} direction="up">
                            <SpotlightCard className="bg-card-dark p-8 border border-border-dark/40 border-l-2 border-l-primary group hover:border-primary/30 transition-colors h-full" spotlightColor="rgba(110, 155, 138, 0.15)">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="p-3 bg-primary/10">
                                        <span className="material-symbols-outlined text-primary text-3xl">history_edu</span>
                                    </div>
                                    <span className="font-arcade text-[10px] text-text-muted">MOD_03</span>
                                </div>
                                <h3 className="font-arcade text-sm text-white mb-4">AUDIT TRAILS</h3>
                                <p className="font-mono text-sm leading-relaxed text-text-secondary uppercase tracking-tighter">
                                    Fully indexable history of every claim and distribution. Build ultimate trust with your community.
                                </p>
                            </SpotlightCard>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ─── HOW IT WORKS ─── */}
            <section id="how-it-works" className="py-24 bg-background-dark">
                <style>{`
                    @keyframes discordSpin {
                        0% { transform: rotate(0deg) scale(1.1); }
                        100% { transform: rotate(360deg) scale(1.1); }
                    }
                    @keyframes linkPulse {
                        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(110, 155, 138, 0.4); }
                        70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(110, 155, 138, 0); }
                        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(110, 155, 138, 0); }
                    }
                    @keyframes txSubmit {
                        0%, 35% { opacity: 1; transform: translateY(0) scale(1); visibility: visible; }
                        40%, 100% { opacity: 0; transform: translateY(-10px) scale(0.9); visibility: hidden; }
                    }
                    @keyframes txSuccess {
                        0%, 40% { opacity: 0; transform: translateY(10px) scale(0.9); visibility: hidden; }
                        45%, 85% { opacity: 1; transform: translateY(0) scale(1); visibility: visible; }
                        90%, 100% { opacity: 0; transform: translateY(-10px) scale(0.9); visibility: hidden; }
                    }
                    @keyframes progressFill {
                        0% { width: 0%; }
                        80%, 100% { width: 100%; }
                    }
                    @keyframes tooltipShow {
                        0%, 45% { opacity: 0; transform: translateX(-50%) translateY(5px); }
                        50%, 80% { opacity: 1; transform: translateX(-50%) translateY(0); }
                        85%, 100% { opacity: 0; transform: translateX(-50%) translateY(-5px); }
                    }
                    @keyframes linkIconSwapLink {
                        0%, 45% { opacity: 1; }
                        45.01%, 100% { opacity: 0; }
                    }
                    @keyframes linkIconSwapCopy {
                        0%, 45% { opacity: 0; }
                        45.01%, 100% { opacity: 1; }
                    }
                    /* Form filling animations */
                    @keyframes formFill1 { 0%, 10% { width: 0%; } 20%, 100% { width: 100%; } }
                    @keyframes formFill2 { 0%, 25% { width: 0%; } 35%, 100% { width: 100%; } }
                    @keyframes formFill3 { 0%, 40% { width: 0%; } 50%, 100% { width: 100%; } }
                    @keyframes btnPress {
                        0%, 60% { transform: scale(1); background-color: rgba(209,107,165,0.2); }
                        65%, 75% { transform: scale(0.95); background-color: rgba(209,107,165,1); box-shadow: 0 0 10px rgba(209,107,165,0.8); }
                        80%, 100% { transform: scale(1); background-color: rgba(209,107,165,1); box-shadow: 0 0 10px rgba(209,107,165,0.8); }
                    }
                    @keyframes formReset {
                        0%, 85% { opacity: 1; transform: scale(1); }
                        90%, 95% { opacity: 0; transform: scale(0.95); }
                        100% { opacity: 1; transform: scale(1); }
                    }
                    @keyframes cursorClickForm {
                        0%, 20% { top: 100%; left: 80%; opacity: 0; }
                        30%, 50% { top: 60%; left: 50%; opacity: 1; }
                        55% { transform: scale(0.9); }
                        60%, 100% { top: 60%; left: 50%; opacity: 0; transform: scale(1); }
                    }
                    @keyframes cursorClickLink {
                        0%, 20% { top: 150%; opacity: 0; }
                        30%, 50% { top: 50%; opacity: 1; }
                        55% { transform: scale(0.9); }
                        60%, 100% { top: 50%; opacity: 0; transform: scale(1); }
                    }
                `}</style>
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-6">
                        <span className="font-arcade text-[10px] text-neon-magenta bg-neon-magenta/10 px-4 py-2 arcade-border-magenta inline-block mb-6">TUTORIAL_MODE</span>
                        <h2 className="font-arcade text-lg sm:text-xl md:text-2xl text-white mb-4">HOW IT WORKS</h2>
                        <p className="font-mono text-sm text-text-muted uppercase tracking-tighter max-w-xl mx-auto">
                            Four steps. That&apos;s it. No smart contract deploys, no complicated setup, no connect wallet.
                        </p>
                    </div>

                    <div className="relative mt-20 max-w-5xl mx-auto px-4 sm:px-12">
                        {/* Center glowing line */}
                        <div className="absolute left-8 md:left-1/2 top-4 bottom-4 w-px bg-border-dark/60 transform md:-translate-x-1/2 hidden sm:block">
                            <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-transparent via-primary/50 to-primary/50"></div>
                            <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-b from-primary/50 via-primary/50 to-transparent"></div>
                            {/* Moving dot */}
                            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-1.5 h-16 bg-primary rounded-full shadow-[0_0_10px_rgba(110,155,138,0.8)] animate-[slide-down_4s_infinite_linear]"></div>
                        </div>

                        <div className="space-y-16 md:space-y-24">
                            {/* Step 1 */}
                            <FadeIn delay={0} direction="up">
                                <div className="relative flex flex-col md:flex-row items-center justify-between group">
                                    <div className="md:w-[45%] mb-8 md:mb-0 text-left md:text-right flex flex-col items-start md:items-end w-full px-4 md:px-0">
                                        <div className="flex flex-row md:flex-col items-center md:items-end gap-3 md:gap-0 mb-3 md:mb-0 w-full">
                                            <div className="font-arcade text-3xl sm:text-4xl text-text-muted/30 md:mb-2 group-hover:text-primary/50 transition-colors leading-none">01</div>
                                            <h3 className="font-arcade text-base md:text-lg text-white group-hover:text-primary transition-colors leading-none mt-1 md:mt-0">SIGN IN WITH DISCORD</h3>
                                        </div>
                                        <p className="font-mono text-xs md:text-sm leading-relaxed text-text-secondary uppercase tracking-tighter max-w-sm">
                                            That&apos;s your login. No extra accounts, no wallet extensions, no connect wallet pop-ups. If you have Discord, you&apos;re already in.
                                        </p>
                                    </div>
                                    {/* Timeline Node */}
                                    <div className="absolute left-8 md:left-1/2 top-0 md:top-1/2 transform -translate-y-1/2 md:-translate-x-1/2 w-8 h-8 rounded-full bg-background-dark border-2 border-primary/50 flex items-center justify-center group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(110,155,138,0.5)] transition-all z-10 hidden sm:flex">
                                        <div className="w-2 h-2 rounded-full bg-primary/50 group-hover:bg-primary transition-colors"></div>
                                    </div>
                                    <div className="w-full max-w-sm mx-auto pl-0 md:max-w-none md:mx-0 md:w-[45%]">
                                        <SpotlightCard className="bg-card-dark p-6 border border-border-dark/40 group-hover:border-primary/30 transition-colors" spotlightColor="rgba(110, 155, 138, 0.12)">
                                            <div className="flex flex-col items-center justify-center h-24 overflow-hidden group">
                                                <div className="flex flex-col items-center justify-center gap-3 opacity-40 group-hover:opacity-100 transition-opacity duration-300">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 127.14 96.36"
                                                        className="w-10 h-10 fill-[#5865F2] animate-[discordSpin_2s_linear_infinite]"
                                                    >
                                                        <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.16,46,96.06,53,91,65.69,84.69,65.69Z" />
                                                    </svg>
                                                    <div className="w-16 h-2 bg-black/60 rounded-full overflow-hidden shadow-inner">
                                                        <div className="h-full bg-[#5865F2]" style={{ animation: "progressFill 2s ease-in-out infinite" }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-4 border-t border-border-dark/40 pt-4 text-[10px] font-mono text-text-muted/50 text-center uppercase">AUTH_INITIALIZED: TRUE</div>
                                        </SpotlightCard>
                                    </div>
                                </div>
                            </FadeIn>

                            {/* Step 2 */}
                            <FadeIn delay={0.1} direction="up">
                                <div className="relative flex flex-col md:flex-row-reverse items-center justify-between group">
                                    <div className="md:w-[45%] mb-8 md:mb-0 text-left flex flex-col items-start w-full px-4 md:px-0">
                                        <div className="flex flex-row md:flex-col items-center md:items-start gap-3 md:gap-0 mb-3 md:mb-0 w-full">
                                            <div className="font-arcade text-3xl sm:text-4xl text-text-muted/30 md:mb-2 group-hover:text-neon-magenta/50 transition-colors leading-none">02</div>
                                            <h3 className="font-arcade text-base md:text-lg text-white group-hover:text-neon-magenta transition-colors leading-none mt-1 md:mt-0">CREATE A DAGET</h3>
                                        </div>
                                        <p className="font-mono text-xs md:text-sm leading-relaxed text-text-secondary uppercase tracking-tighter max-w-sm">
                                            Set the token (USDC or USDT), total pool, number of winners, and which Discord roles can claim. Add a custom message too.
                                        </p>
                                    </div>
                                    {/* Timeline Node */}
                                    <div className="absolute left-8 md:left-1/2 top-0 md:top-1/2 transform -translate-y-1/2 md:-translate-x-1/2 w-8 h-8 rounded-full bg-background-dark border-2 border-neon-magenta/50 flex items-center justify-center group-hover:border-neon-magenta group-hover:shadow-[0_0_15px_rgba(209,107,165,0.5)] transition-all z-10 hidden sm:flex">
                                        <div className="w-2 h-2 rounded-full bg-neon-magenta/50 group-hover:bg-neon-magenta transition-colors"></div>
                                    </div>
                                    <div className="w-full max-w-sm mx-auto pl-0 md:max-w-none md:mx-0 md:w-[45%]">
                                        <SpotlightCard className="bg-card-dark p-6 border border-border-dark/40 group-hover:border-neon-magenta/30 transition-colors" spotlightColor="rgba(209, 107, 165, 0.12)">
                                            <div className="flex flex-col items-center justify-center h-24 group">
                                                <div className="w-24 h-16 bg-black/60 border border-neon-magenta/30 rounded-md p-2 flex flex-col justify-between opacity-40 group-hover:opacity-100 group-hover:border-neon-magenta/80 transition-all duration-500 shadow-inner overflow-hidden" style={{ animation: "formReset 4s infinite" }}>
                                                    <div className="w-full flex gap-1.5 items-center">
                                                        <div className="w-1/4 h-1.5 bg-border-dark rounded-sm"></div>
                                                        <div className="w-3/4 h-2.5 bg-black/80 border border-border-dark/50 rounded-sm relative overflow-hidden"><div className="absolute top-0 left-0 bottom-0 bg-neon-magenta" style={{ animation: "formFill1 4s infinite" }}></div></div>
                                                    </div>
                                                    <div className="w-full flex gap-1.5 items-center">
                                                        <div className="w-1/3 h-1.5 bg-border-dark rounded-sm"></div>
                                                        <div className="w-2/3 h-2.5 bg-black/80 border border-border-dark/50 rounded-sm relative overflow-hidden"><div className="absolute top-0 left-0 bottom-0 bg-neon-magenta" style={{ animation: "formFill2 4s infinite" }}></div></div>
                                                    </div>
                                                    <div className="w-full flex gap-1.5 items-center">
                                                        <div className="w-1/5 h-1.5 bg-border-dark rounded-sm"></div>
                                                        <div className="w-4/5 h-2.5 bg-black/80 border border-border-dark/50 rounded-sm relative overflow-hidden"><div className="absolute top-0 left-0 bottom-0 bg-neon-magenta" style={{ animation: "formFill3 4s infinite" }}></div></div>
                                                    </div>
                                                    <div className="mt-1 self-end w-10 h-3 rounded-sm" style={{ animation: "btnPress 4s infinite" }}></div>
                                                </div>
                                            </div>
                                            <div className="mt-4 border-t border-border-dark/40 pt-4 text-[10px] font-mono text-text-muted/50 text-center uppercase">CONFIG_SAVED: SUCCESS</div>
                                        </SpotlightCard>
                                    </div>
                                </div>
                            </FadeIn>

                            {/* Step 3 */}
                            <FadeIn delay={0.2} direction="up">
                                <div className="relative flex flex-col md:flex-row items-center justify-between group">
                                    <div className="md:w-[45%] mb-8 md:mb-0 text-left md:text-right flex flex-col items-start md:items-end w-full px-4 md:px-0">
                                        <div className="flex flex-row md:flex-col items-center md:items-end gap-3 md:gap-0 mb-3 md:mb-0 w-full">
                                            <div className="font-arcade text-3xl sm:text-4xl text-text-muted/30 md:mb-2 group-hover:text-primary/50 transition-colors leading-none">03</div>
                                            <h3 className="font-arcade text-base md:text-lg text-white group-hover:text-primary transition-colors leading-none mt-1 md:mt-0">SHARE THE LINK</h3>
                                        </div>
                                        <p className="font-mono text-xs md:text-sm leading-relaxed text-text-secondary uppercase tracking-tighter max-w-sm">
                                            Each Daget gets a unique claim URL. Drop it in your Discord, tweet it, put it in your bio — wherever your community hangs out.
                                        </p>
                                    </div>
                                    {/* Timeline Node */}
                                    <div className="absolute left-8 md:left-1/2 top-0 md:top-1/2 transform -translate-y-1/2 md:-translate-x-1/2 w-8 h-8 rounded-full bg-background-dark border-2 border-primary/50 flex items-center justify-center group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(110,155,138,0.5)] transition-all z-10 hidden sm:flex">
                                        <div className="w-2 h-2 rounded-full bg-primary/50 group-hover:bg-primary transition-colors"></div>
                                    </div>
                                    <div className="w-full max-w-sm mx-auto pl-0 md:max-w-none md:mx-0 md:w-[45%]">
                                        <SpotlightCard className="bg-card-dark p-6 border border-border-dark/40 group-hover:border-primary/30 transition-colors" spotlightColor="rgba(110, 155, 138, 0.12)">
                                            <div className="flex flex-col items-center justify-center h-24 relative group">
                                                <div className="opacity-40 group-hover:opacity-100 transition-opacity duration-300 w-full h-full relative flex items-center justify-center">
                                                    <div className="relative">
                                                        {/* 'Copied' Tooltip popping up */}
                                                        <div className="absolute bottom-full left-1/2 mb-2 bg-primary/20 border border-primary text-primary font-arcade text-[8px] px-2 py-0.5 rounded-sm shadow-[0_0_10px_rgba(110,155,138,0.3)] z-10 whitespace-nowrap" style={{ animation: "tooltipShow 4s infinite" }}>
                                                            COPIED!
                                                        </div>

                                                        {/* Link element */}
                                                        <div className="flex items-center justify-center gap-1.5 bg-black/40 border border-primary/20 rounded-full px-3 py-1.5 z-10 animate-[linkPulse_2s_infinite]">
                                                            <div className="relative w-4 h-4 flex items-center justify-center">
                                                                <span className="material-symbols-outlined text-[14px] text-primary absolute" style={{ animation: "linkIconSwapLink 4s infinite" }}>link</span>
                                                                <span className="material-symbols-outlined text-[14px] text-primary absolute" style={{ animation: "linkIconSwapCopy 4s infinite" }}>content_copy</span>
                                                            </div>
                                                            <span className="font-mono text-[10px] text-primary-light whitespace-nowrap">daget.fun/123</span>
                                                        </div>

                                                        {/* Cursor click animation */}
                                                        <div className="absolute opacity-0 z-20 pointer-events-none left-1/2 -ml-2" style={{ animation: "cursorClickLink 4s infinite" }}>
                                                            <span className="material-symbols-outlined text-white text-base drop-shadow-md">ads_click</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-4 border-t border-border-dark/40 pt-4 text-[10px] font-mono text-text-muted/50 text-center uppercase">PAYLOAD_DELIVERED: ACTIVE</div>
                                        </SpotlightCard>
                                    </div>
                                </div>
                            </FadeIn>

                            {/* Step 4 */}
                            <FadeIn delay={0.3} direction="up">
                                <div className="relative flex flex-col md:flex-row-reverse items-center justify-between group">
                                    <div className="md:w-[45%] mb-8 md:mb-0 text-left flex flex-col items-start w-full px-4 md:px-0">
                                        <div className="flex flex-row md:flex-col items-center md:items-start gap-3 md:gap-0 mb-3 md:mb-0 w-full">
                                            <div className="font-arcade text-3xl sm:text-4xl text-text-muted/30 md:mb-2 group-hover:text-neon-magenta/50 transition-colors leading-none">04</div>
                                            <h3 className="font-arcade text-base md:text-lg text-white group-hover:text-neon-magenta transition-colors leading-none mt-1 md:mt-0">TOKENS FLY OUT</h3>
                                        </div>
                                        <p className="font-mono text-xs md:text-sm leading-relaxed text-text-secondary uppercase tracking-tighter max-w-sm">
                                            Eligible members claim → we verify their role → tokens land in their Solana wallet. Confirmed onchain. Done.
                                        </p>
                                    </div>
                                    {/* Timeline Node */}
                                    <div className="absolute left-8 md:left-1/2 top-0 md:top-1/2 transform -translate-y-1/2 md:-translate-x-1/2 w-8 h-8 rounded-full bg-background-dark border-2 border-neon-magenta/50 flex items-center justify-center group-hover:border-neon-magenta group-hover:shadow-[0_0_15px_rgba(209,107,165,0.5)] transition-all z-10 hidden sm:flex">
                                        <div className="w-2 h-2 rounded-full bg-neon-magenta/50 group-hover:bg-neon-magenta transition-colors"></div>
                                    </div>
                                    <div className="w-full max-w-sm mx-auto pl-0 md:max-w-none md:mx-0 md:w-[45%]">
                                        <SpotlightCard className="bg-card-dark p-6 border border-border-dark/40 group-hover:border-neon-magenta/30 transition-colors" spotlightColor="rgba(209, 107, 165, 0.12)">
                                            <div className="flex flex-col items-center justify-center h-24 relative cursor-pointer w-full group overflow-hidden">
                                                <div className="opacity-40 group-hover:opacity-100 transition-opacity duration-300 w-full h-full relative">
                                                    {/* Submitting state (looped via css) */}
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ animation: "txSubmit 4s infinite" }}>
                                                        <div className="w-8 h-8 border-[3px] border-neon-magenta/20 border-t-neon-magenta rounded-full animate-[spin_1s_linear_infinite] mb-2 shadow-[0_0_10px_rgba(209,107,165,0.4)]"></div>
                                                        <span className="font-mono text-[8px] font-bold text-neon-magenta uppercase tracking-widest text-center">Submitting<br />Tx...</span>
                                                    </div>

                                                    {/* Success state (looped via css) */}
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0" style={{ animation: "txSuccess 4s infinite" }}>
                                                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center mb-1 border border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                                                            <span className="material-symbols-outlined text-[20px] text-green-400">check</span>
                                                        </div>
                                                        <span className="font-arcade text-[10px] text-green-400 text-center drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]">CLAIM<br />SUCCESS</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-4 border-t border-border-dark/40 pt-4 text-[10px] font-mono text-text-muted/50 text-center uppercase">TX_CONFIRMED: ONCHAIN</div>
                                        </SpotlightCard>
                                    </div>
                                </div>
                            </FadeIn>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── USE CASES ─── */}
            <section id="use-cases" className="py-24 border-y border-border-dark/40 bg-surface">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-6">
                        <span className="font-arcade text-[10px] text-primary bg-primary/10 px-4 py-2 arcade-border-cyan inline-block mb-6">USE_CASES</span>
                        <h2 className="font-arcade text-lg sm:text-xl md:text-2xl text-white mb-4">WHAT CAN YOU DO WITH DAGETS?</h2>
                        <p className="font-mono text-sm text-text-muted uppercase tracking-tighter max-w-xl mx-auto">
                            If you have a Discord community and want to distribute tokens, you&apos;re in the right place.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-16 max-w-6xl mx-auto">
                        {/* Large Featured Card (Spans 7/12 columns on desktop) */}
                        <FadeIn delay={0} direction="up" className="lg:col-span-7 h-full">
                            <SpotlightCard className="bg-card-dark p-8 md:p-12 border border-border-dark/40 border-l-2 border-l-neon-magenta group hover:border-neon-magenta/30 transition-all h-full flex flex-col justify-center" spotlightColor="rgba(209, 107, 165, 0.15)">
                                <div className="flex flex-col md:flex-row gap-8 items-start md:items-center h-full">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="p-3 bg-neon-magenta/10 rounded-sm">
                                                <span className="material-symbols-outlined text-neon-magenta text-3xl">celebration</span>
                                            </div>
                                            <span className="font-arcade text-[10px] text-text-muted">SCENARIO_01</span>
                                        </div>
                                        <h3 className="font-arcade text-xl md:text-2xl text-white mb-4">COMMUNITY REWARDS</h3>
                                        <p className="font-mono text-sm leading-relaxed text-text-secondary uppercase tracking-tighter">
                                            Reward your most loyal members. Gate it by &quot;OG&quot; or &quot;Diamond Hands&quot; roles so only the real ones eat.
                                            Stop weeding through thousands of bot wallets and let the Discord roles do the heavy lifting for you automatically.
                                        </p>
                                    </div>
                                    <div className="hidden md:flex w-40 h-40 preserve-3d group-hover:rotate-y-12 transition-transform duration-700 items-center justify-center relative flex-shrink-0">
                                        <div className="absolute inset-0 bg-neon-magenta/5 blur-2xl rounded-full"></div>
                                        <div className="w-28 h-28 border-2 border-neon-magenta/20 rounded-full flex items-center justify-center relative spin-slow">
                                            <div className="w-20 h-20 border-2 border-neon-magenta/40 rounded-full rotate-45 border-dashed"></div>
                                        </div>
                                        <span className="material-symbols-outlined text-neon-magenta text-5xl absolute z-10 animate-pulse">workspace_premium</span>
                                    </div>
                                </div>
                            </SpotlightCard>
                        </FadeIn>

                        {/* Stacked Smaller Cards Column (Spans 5/12 columns on desktop) */}
                        <div className="flex flex-col gap-6 h-full lg:col-span-5">
                            <FadeIn delay={0.15} direction="up" className="h-full flex-1">
                                <SpotlightCard className="bg-card-dark p-6 md:p-8 border border-border-dark/40 border-l-2 border-l-primary group hover:border-primary/30 transition-colors h-full flex flex-col" spotlightColor="rgba(110, 155, 138, 0.15)">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-2 bg-primary/10 rounded-sm">
                                            <span className="material-symbols-outlined text-primary text-xl">campaign</span>
                                        </div>
                                        <span className="font-arcade text-[8px] text-text-muted">SCENARIO_02</span>
                                    </div>
                                    <h3 className="font-arcade text-sm text-white mb-3 mt-auto">MARKETING CAMPAIGNS</h3>
                                    <p className="font-mono text-[10px] md:text-sm leading-relaxed text-text-secondary uppercase tracking-tighter">
                                        Running a collab? Create a Daget, gate it by partner server roles, and let their members claim. Cross-community love.
                                    </p>
                                </SpotlightCard>
                            </FadeIn>

                            <FadeIn delay={0.3} direction="up" className="h-full flex-1">
                                <SpotlightCard className="bg-card-dark p-6 md:p-8 border border-border-dark/40 border-l-2 border-l-primary group hover:border-primary/30 transition-colors h-full flex flex-col" spotlightColor="rgba(110, 155, 138, 0.15)">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-2 bg-primary/10 rounded-sm">
                                            <span className="material-symbols-outlined text-primary text-xl">mystery_box</span>
                                        </div>
                                        <span className="font-arcade text-[8px] text-text-muted">SCENARIO_03</span>
                                    </div>
                                    <h3 className="font-arcade text-sm text-white mb-3 mt-auto">RANDOM DROPS</h3>
                                    <p className="font-mono text-[10px] md:text-sm leading-relaxed text-text-secondary uppercase tracking-tighter">
                                        Use random mode to spice things up. Each claimer gets a different amount within your set range. Same pool, different luck.
                                    </p>
                                </SpotlightCard>
                            </FadeIn>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── BUILT DIFFERENT ─── */}
            <section className="py-24 bg-background-dark">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-6">
                        <span className="font-arcade text-[10px] text-primary bg-primary/10 px-4 py-2 arcade-border-cyan inline-block mb-6">VERSUS_MODE</span>
                        <h2 className="font-arcade text-lg sm:text-xl md:text-2xl text-white mb-4">WHY NOT JUST USE A BOT?</h2>
                        <p className="font-mono text-sm text-text-muted uppercase tracking-tighter max-w-2xl mx-auto">
                            Good question. Here&apos;s the honest comparison.
                        </p>
                    </div>

                    <div className="mt-16 max-w-5xl mx-auto relative flex flex-col md:block">
                        {/* VS Badge for Desktop ONLY */}
                        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-16 h-16 bg-background-dark border-4 border-white/10 rounded-full items-center justify-center rotate-12 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                            <span className="font-arcade text-2xl text-white italic">VS</span>
                        </div>

                        <div className="flex flex-col md:flex-row overflow-hidden rounded-xl border border-border-dark/60 shadow-2xl relative">
                            {/* Player 1: The Daget Way */}
                            <div className="flex-1 bg-[#1A2624] relative p-8 md:p-12 md:pr-16 group">
                                <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors"></div>
                                {/* Slanted overlay for desktop */}
                                <div className="hidden md:block absolute top-0 bottom-0 right-[-20px] w-10 bg-card-dark transform skew-x-12 z-10 border-r-2 border-primary/30"></div>

                                <div className="relative z-10 text-center md:text-left">
                                    <div className="flex flex-col md:flex-row items-center md:items-end gap-3 md:gap-3 mb-8 border-b border-primary/20 pb-4 justify-center md:justify-start">
                                        <h3 className="font-arcade text-3xl sm:text-4xl text-primary drop-shadow-[0_0_8px_rgba(110,155,138,0.5)]">P1</h3>
                                        <span className="font-mono text-sm text-primary mb-1 uppercase tracking-widest">
                                            THE <span style={{ color: 'rgb(209, 107, 165)' }}>DAGET.FUN</span> WAY
                                        </span>
                                    </div>
                                    <ul className="space-y-5">
                                        <li className="flex items-start gap-4 border border-primary/0 group-hover:border-primary/20 p-2 -ml-2 rounded-sm transition-all duration-300 group-hover:bg-primary/5">
                                            <span className="material-symbols-outlined text-primary mt-0.5 drop-shadow-[0_0_4px_rgba(110,155,138,1)]">check</span>
                                            <span className="font-mono text-xs text-white uppercase tracking-tighter">Members claim with one click — no form needed</span>
                                        </li>
                                        <li className="flex items-start gap-4 border border-primary/0 group-hover:border-primary/20 p-2 -ml-2 rounded-sm transition-all duration-300 group-hover:bg-primary/5">
                                            <span className="material-symbols-outlined text-primary mt-0.5 drop-shadow-[0_0_4px_rgba(110,155,138,1)]">check</span>
                                            <span className="font-mono text-xs text-white uppercase tracking-tighter">Roles verified server-side via Discord API automatically</span>
                                        </li>
                                        <li className="flex items-start gap-4 border border-primary/0 group-hover:border-primary/20 p-2 -ml-2 rounded-sm transition-all duration-300 group-hover:bg-primary/5">
                                            <span className="material-symbols-outlined text-primary mt-0.5 drop-shadow-[0_0_4px_rgba(110,155,138,1)]">check</span>
                                            <span className="font-mono text-xs text-white uppercase tracking-tighter">Tokens sent to their Solana address onchain, instantly</span>
                                        </li>
                                        <li className="flex items-start gap-4 border border-primary/0 group-hover:border-primary/20 p-2 -ml-2 rounded-sm transition-all duration-300 group-hover:bg-primary/5">
                                            <span className="material-symbols-outlined text-primary mt-0.5 drop-shadow-[0_0_4px_rgba(110,155,138,1)]">check</span>
                                            <span className="font-mono text-xs text-white uppercase tracking-tighter">One claim per person enforced — no duplicates possible</span>
                                        </li>
                                        <li className="flex items-start gap-4 border border-primary/0 group-hover:border-primary/20 p-2 -ml-2 rounded-sm transition-all duration-300 group-hover:bg-primary/5 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-primary/10 w-0 group-hover:w-full transition-all duration-700 ease-out"></div>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* VS Badge for Mobile ONLY */}
                            <div className="md:hidden flex justify-center -my-8 z-20 relative">
                                <div className="w-16 h-16 bg-background-dark border-4 border-white/10 rounded-full flex items-center justify-center rotate-12 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                                    <span className="font-arcade text-2xl text-white italic">VS</span>
                                </div>
                            </div>

                            {/* Player 2: Standard Bots */}
                            <div className="flex-1 bg-card-dark relative p-8 md:p-12 md:pl-16 group">

                                {/* Glow originating from the split */}
                                <div className="absolute inset-x-0 top-0 h-32 md:inset-x-auto md:inset-y-0 md:left-0 md:w-32 md:h-auto bg-gradient-to-b md:bg-gradient-to-r from-red-500/10 to-transparent"></div>

                                <div className="relative z-10 text-center md:text-left">
                                    <div className="flex flex-col md:flex-row items-center md:items-end gap-3 md:gap-3 mb-8 border-b border-red-500/30 pb-4 justify-center md:justify-start pt-10 md:pt-0">
                                        <h3 className="font-arcade text-3xl sm:text-4xl text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">P2</h3>
                                        <span className="font-mono text-sm text-red-400 mb-1 uppercase tracking-widest">STANDARD BOTS</span>
                                    </div>
                                    <ul className="space-y-5">
                                        <li className="flex items-start gap-4 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <span className="material-symbols-outlined text-red-500 mt-0.5">close</span>
                                            <span className="font-mono text-xs text-text-secondary uppercase tracking-tighter">Only picks a username — doesn&apos;t actually handle the tokens</span>
                                        </li>
                                        <li className="flex items-start gap-4 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <span className="material-symbols-outlined text-red-500 mt-0.5">close</span>
                                            <span className="font-mono text-xs text-text-secondary uppercase tracking-tighter">You still have to DM the winner and collect their wallet address</span>
                                        </li>
                                        <li className="flex items-start gap-4 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <span className="material-symbols-outlined text-red-500 mt-0.5">close</span>
                                            <span className="font-mono text-xs text-text-secondary uppercase tracking-tighter">Copy-paste addresses into CSV, pray nothing is wrong</span>
                                        </li>
                                        <li className="flex items-start gap-4 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <span className="material-symbols-outlined text-red-500 mt-0.5">close</span>
                                            <span className="font-mono text-xs text-text-secondary uppercase tracking-tighter">Send tokens one by one or use sketchy multisend tools</span>
                                        </li>
                                        <li className="flex items-start gap-4 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <span className="material-symbols-outlined text-red-500 mt-0.5">close</span>
                                            <span className="font-mono text-xs text-text-secondary uppercase tracking-tighter">&quot;Did I already send to this address?&quot; — you every time</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── FAQ ─── */}
            <section id="faq" className="py-24 border-y border-border-dark/40 bg-surface">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-16 relative">
                        {/* Background glow for the header */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-20 bg-primary/20 blur-3xl rounded-full"></div>
                        <h2 className="font-arcade text-xl sm:text-2xl md:text-4xl text-white relative z-10 inline-block drop-shadow-[0_0_15px_rgba(110,155,138,0.5)]">
                            <span className="text-primary mr-4">[</span>
                            FREQUENTLY ASKED
                            <span className="text-primary ml-4">]</span>
                        </h2>
                        <div className="h-px w-48 bg-gradient-to-r from-transparent via-primary/50 to-transparent mx-auto mt-6"></div>
                    </div>

                    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SpotlightCard className="bg-card-dark p-6 border border-border-dark/40 hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1" spotlightColor="rgba(110, 155, 138, 0.15)">
                            <h3 className="font-arcade text-xs text-primary mb-3 flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary text-base">help</span>
                                WHAT TOKENS ARE SUPPORTED?
                            </h3>
                            <p className="font-mono text-xs leading-relaxed text-text-secondary uppercase tracking-tighter pl-8">
                                Currently USDC and USDT on Solana. We went with stablecoins first because your community deserves to know exactly what they&apos;re getting — no price volatility surprises.
                            </p>
                        </SpotlightCard>

                        <SpotlightCard className="bg-card-dark p-6 border border-border-dark/40 hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1" spotlightColor="rgba(110, 155, 138, 0.15)">
                            <h3 className="font-arcade text-xs text-primary mb-3 flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary text-base">help</span>
                                DO CLAIMERS NEED TO CONNECT A WALLET?
                            </h3>
                            <p className="font-mono text-xs leading-relaxed text-text-secondary uppercase tracking-tighter pl-8">
                                No! That&apos;s the whole point. Claimers just paste their Solana address — no browser extension, no wallet pop-up, no &quot;approve transaction&quot; flow. Tokens go directly to their address onchain. It&apos;s as simple as filling in one field.
                            </p>
                        </SpotlightCard>

                        <SpotlightCard className="bg-card-dark p-6 border border-border-dark/40 hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1" spotlightColor="rgba(110, 155, 138, 0.15)">
                            <h3 className="font-arcade text-xs text-primary mb-3 flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary text-base">help</span>
                                WHAT&apos;S &quot;RANDOM MODE&quot;?
                            </h3>
                            <p className="font-mono text-xs leading-relaxed text-text-secondary uppercase tracking-tighter pl-8">
                                Instead of everyone getting the same fixed amount, random mode gives each claimer a different amount within a range you set. Think of it as a loot box — same pool, different luck. Great for keeping things exciting.
                            </p>
                        </SpotlightCard>

                        <SpotlightCard className="bg-card-dark p-6 border border-border-dark/40 hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1" spotlightColor="rgba(110, 155, 138, 0.15)">
                            <h3 className="font-arcade text-xs text-primary mb-3 flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary text-base">help</span>
                                CAN SOMEONE CLAIM TWICE?
                            </h3>
                            <p className="font-mono text-xs leading-relaxed text-text-secondary uppercase tracking-tighter pl-8">
                                Nope. One claim per Discord account per Daget. Enforced at the database level. Even if they try with a different browser, same Discord = same person = one claim. We don&apos;t play.
                            </p>
                        </SpotlightCard>

                        <SpotlightCard className="bg-card-dark p-6 border border-border-dark/40 hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1" spotlightColor="rgba(110, 155, 138, 0.15)">
                            <h3 className="font-arcade text-xs text-primary mb-3 flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary text-base">help</span>
                                HOW DO I FUND A DAGET?
                            </h3>
                            <p className="font-mono text-xs leading-relaxed text-text-secondary uppercase tracking-tighter pl-8">
                                When you sign up, you get a managed Solana wallet. Send USDC or USDT to it, then create your Daget with the amount you want to distribute. The balance is checked before creation so you can&apos;t overspend.
                            </p>
                        </SpotlightCard>

                        <SpotlightCard className="bg-card-dark p-6 border border-border-dark/40 hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1" spotlightColor="rgba(110, 155, 138, 0.15)">
                            <h3 className="font-arcade text-xs text-primary mb-3 flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary text-base">help</span>
                                IS IT FREE?
                            </h3>
                            <p className="font-mono text-xs leading-relaxed text-text-secondary uppercase tracking-tighter pl-8">
                                Yes. You only pay the Solana transaction fees for each claim (less than a cent). No platform fees, no hidden charges. We&apos;re here to help communities, not tax them.
                            </p>
                        </SpotlightCard>
                    </div>
                </div>
            </section>

            {/* ─── CTA ─── */}
            <section className="py-32 bg-background-dark relative overflow-hidden">
                <div className="absolute inset-0 grid-background opacity-30"></div>
                <div className="relative max-w-3xl mx-auto px-4 text-center">
                    <div className="inline-block px-4 py-1 mb-8 arcade-border-magenta bg-background-dark">
                        <span className="font-arcade text-[10px] text-neon-magenta">READY_PLAYER_ONE</span>
                    </div>
                    <h2 className="font-arcade text-lg sm:text-2xl md:text-3xl text-white mb-6 leading-tight">
                        STOP MAKING GIVEAWAYS<br />
                        <span className="text-primary">SO COMPLICATED.</span>
                    </h2>
                    <p className="font-mono text-sm md:text-base text-text-secondary uppercase tracking-tighter max-w-2xl mx-auto mb-2 leading-relaxed">
                        REWARD YOUR COMMUNITY, INSTANTLY. VERIFY DISCORD ROLES AND AIRDROP ONCHAIN IN ONE CLICK. NO BOTS. NO SPREADSHEETS. NO HASSLE.
                    </p>
                    <p className="font-mono text-sm text-primary uppercase tracking-widest max-w-2xl mx-auto mb-12 font-bold">
                        SET UP YOUR FIRST DAGET IN UNDER 3 MINUTES.
                    </p>
                    {hasSession ? (
                        <Link
                            href="/dashboard"
                            className="inline-block relative group py-2 pr-4 pl-0"
                        >
                            {/* L-shaped border: Bottom and Right only */}
                            <div className="absolute bottom-0 right-0 w-full h-[2px] bg-primary group-hover:shadow-[0_0_10px_rgba(110,155,138,0.5)] transition-all duration-300 origin-left"></div>
                            <div className="absolute bottom-0 right-0 w-[2px] h-full bg-primary group-hover:shadow-[0_0_10px_rgba(110,155,138,0.5)] transition-all duration-300 origin-bottom"></div>

                            <div className="relative flex items-center gap-4">
                                <span className="w-3 h-3 bg-primary/80 group-hover:bg-primary shadow-[0_0_8px_rgba(110,155,138,0.5)] transition-all duration-300"></span>
                                <span className="font-arcade text-xl text-primary group-hover:text-primary-light tracking-widest uppercase mb-1">OPEN DASHBOARD</span>
                            </div>
                        </Link>
                    ) : (
                        <button
                            onClick={handleLogin}
                            className="inline-block relative group py-2 pr-4 pl-0 mt-8 mb-4 text-left"
                        >
                            {/* L-shaped border: Bottom and Right only */}
                            <div className="absolute bottom-0 right-0 w-full h-[2px] bg-[#5865F2] group-hover:shadow-[0_0_10px_rgba(110,155,138,0.5)] transition-all duration-300 origin-left"></div>
                            <div className="absolute bottom-0 right-0 w-[2px] h-full bg-[#5865F2] group-hover:shadow-[0_0_10px_rgba(110,155,138,0.5)] transition-all duration-300 origin-bottom"></div>

                            <div className="relative flex items-center gap-4">
                                <div className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" className="w-full h-full fill-[#5865F2] group-hover:fill-[#6f7bf7] transition-colors">
                                        <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.16,46,96.06,53,91,65.69,84.69,65.69Z" />
                                    </svg>
                                </div>
                                <span className="font-arcade text-xs sm:text-sm md:text-xl text-[#5865F2] group-hover:text-[#6f7bf7] tracking-widest uppercase mb-1 drop-shadow-md transition-colors whitespace-nowrap">LOGIN WITH DISCORD</span>
                            </div>
                        </button>
                    )}
                    <p className="font-mono text-xs mt-6 uppercase tracking-tighter">
                        <span className="text-text-muted">Free to use · Only pay Solana gas fees · </span>
                        <span className="text-primary">No connect wallet needed</span>
                    </p>
                </div>
            </section>

            <footer className="py-16 border-t-4 border-border-dark">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-12">
                        <div className="flex items-center gap-4">
                            <img src="/images/dagetfun_logo.png" alt="Daget.fun" className="w-10 h-10 rounded" />

                        </div>
                        <div className="flex flex-wrap justify-center gap-8 font-mono text-[10px] tracking-widest uppercase items-center">
                            <Link className="text-white hover:text-primary transition-colors px-3 py-1 arcade-border-cyan bg-background-dark" href="/terms">TERMS OF USE</Link>
                            <Link className="text-white hover:text-neon-magenta transition-colors px-3 py-1 arcade-border-magenta bg-background-dark" href="/privacy">PRIVACY POLICY</Link>
                            <a className="text-text-muted hover:text-primary transition-colors" href="https://x.com/dagetfun" target="_blank" rel="noopener noreferrer">[ TWITTER ]</a>
                        </div>
                        <div className="text-right">
                            <p className="font-arcade text-[8px] text-text-muted">
                                © 2026 DAGET.FUN<br />
                                RUNNING ON SOLANA_MAINNET
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div >
    );
}
