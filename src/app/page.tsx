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
                        <img src="/icon.png" alt="Daget.fun" className="w-12 h-12 rounded" />

                    </div>
                    <div className="hidden md:flex items-center space-x-8 font-mono text-sm tracking-widest uppercase">
                        <a className="hover:text-primary transition-colors" href="#how-it-works">[ How It Works ]</a>
                        <a className="hover:text-primary transition-colors" href="#use-cases">[ Use Cases ]</a>
                        <a className="hover:text-primary transition-colors" href="#faq">[ FAQ ]</a>
                    </div>
                    <div className="flex items-center gap-6">
                        {hasSession && (
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-3 px-4 py-2 arcade-border-cyan text-[10px] font-arcade text-primary hover:bg-primary/10 transition-colors"
                            >
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex h-2 w-2 bg-primary"></span>
                                </span>
                                DASHBOARD
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            <main className="relative pt-40 pb-20">
                {/* Subtle particle background */}
                <div className="absolute inset-0 pointer-events-none">
                    <Particles
                        particleCount={800}
                        particleSpread={10}
                        speed={0.1}
                        particleColors={['#4FD1ED', '#D16BA5', '#6E9B8A']}
                        alphaParticles={true}
                        particleBaseSize={120}
                        sizeRandomness={1}
                        cameraDistance={20}
                    />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 text-center">
                    <h1 className="inline-block px-6 py-2 mb-8 arcade-border-magenta bg-background-dark text-neon-magenta font-arcade text-3xl md:text-5xl lg:text-6xl animate-pulse">
                        DAGET.FUN
                    </h1>

                    <BlurText
                        text="Role-gated onchain giveaways for your community."
                        className="text-3xl md:text-5xl lg:text-6xl font-arcade text-white mb-8 leading-tight"
                        delay={80}
                        animateBy="words"
                        direction="top"
                    />

                    <p className="font-mono text-lg text-text-secondary max-w-3xl mx-auto mb-4 uppercase tracking-tighter">
                        Secure, transparent, and automated. Reward your Discord members with Solana tokens based on their server roles.
                    </p>
                    <p className="font-arcade text-xs text-primary mb-12 tracking-widest">
                        NO CONNECT WALLET NEEDED
                    </p>
                    <button
                        onClick={handleLogin}
                        className="inline-flex items-center justify-center gap-4 bg-[#5865F2] hover:brightness-110 text-white px-10 py-5 arcade-border font-arcade text-xs transition-transform active:scale-95"
                    >
                        <img
                            alt="Discord"
                            className="w-6 h-6"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCl7InillKVvqmL7_KGDx0E2FtuvX6OjrAMNOLCZ57S2mLfPOo_NF4hCJpFDbVmp6qsJ23VW-1w4zDKsMzPQdeYpU1XvGwXAV0mj7yMWaWL_6GxXQv8MuLx2FCyFlWwcHcLPMF6qlQToqV4vKN0NMjeqbP5O-Qce-4KrQQ9HecuSqFz1XSEFhkoPvwzYz7XvfjJ1ZxVdGTHrucIrDpA8HMtgQtfGdjqnSxn71SzTzLaNPKsBVIfMBRYTVoVKL0wwFyrQPEKcwslZON6"
                        />
                        LOGIN WITH DISCORD
                    </button>
                </div>
            </main>

            <section className="py-24 border-y border-border-dark/40 bg-surface">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-20">
                        <h2 className="font-arcade text-2xl text-white mb-4">BUILT FOR TRANSPARENCY</h2>
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
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-6">
                        <span className="font-arcade text-[10px] text-neon-magenta bg-neon-magenta/10 px-4 py-2 arcade-border-magenta inline-block mb-6">TUTORIAL_MODE</span>
                        <h2 className="font-arcade text-2xl text-white mb-4">HOW IT WORKS</h2>
                        <p className="font-mono text-sm text-text-muted uppercase tracking-tighter max-w-xl mx-auto">
                            Four steps. That&apos;s it. No smart contract deploys, no complicated setup, no connect wallet.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-16">
                        <FadeIn delay={0} direction="up">
                            <SpotlightCard className="relative group h-full" spotlightColor="rgba(110, 155, 138, 0.12)">
                                <div className="bg-card-dark p-8 border border-border-dark/40 hover:border-primary/20 transition-colors h-full">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-3 bg-primary/10 w-fit">
                                            <span className="material-symbols-outlined text-primary text-2xl">login</span>
                                        </div>
                                        <span className="font-arcade text-2xl text-text-muted">01</span>
                                    </div>
                                    <h3 className="font-arcade text-xs text-white mb-3">SIGN IN WITH DISCORD</h3>
                                    <p className="font-mono text-xs leading-relaxed text-text-secondary uppercase tracking-tighter">
                                        That&apos;s your login. No extra accounts, no wallet extensions, no connect wallet pop-ups. If you have Discord, you&apos;re already in.
                                    </p>
                                </div>
                            </SpotlightCard>
                        </FadeIn>

                        <FadeIn delay={0.1} direction="up">
                            <SpotlightCard className="relative group h-full" spotlightColor="rgba(110, 155, 138, 0.12)">
                                <div className="bg-card-dark p-8 border border-border-dark/40 hover:border-primary/20 transition-colors h-full">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-3 bg-primary/10 w-fit">
                                            <span className="material-symbols-outlined text-primary text-2xl">edit_note</span>
                                        </div>
                                        <span className="font-arcade text-2xl text-text-muted">02</span>
                                    </div>
                                    <h3 className="font-arcade text-xs text-white mb-3">CREATE A DAGET</h3>
                                    <p className="font-mono text-xs leading-relaxed text-text-secondary uppercase tracking-tighter">
                                        Set the token (USDC or USDT), total pool, number of winners, and which Discord roles can claim. Add a custom message too.
                                    </p>
                                </div>
                            </SpotlightCard>
                        </FadeIn>

                        <FadeIn delay={0.2} direction="up">
                            <SpotlightCard className="relative group h-full" spotlightColor="rgba(110, 155, 138, 0.12)">
                                <div className="bg-card-dark p-8 border border-border-dark/40 hover:border-primary/20 transition-colors h-full">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-3 bg-primary/10 w-fit">
                                            <span className="material-symbols-outlined text-primary text-2xl">share</span>
                                        </div>
                                        <span className="font-arcade text-2xl text-text-muted">03</span>
                                    </div>
                                    <h3 className="font-arcade text-xs text-white mb-3">SHARE THE LINK</h3>
                                    <p className="font-mono text-xs leading-relaxed text-text-secondary uppercase tracking-tighter">
                                        Each Daget gets a unique claim URL. Drop it in your Discord, tweet it, put it in your bio — wherever your community hangs out.
                                    </p>
                                </div>
                            </SpotlightCard>
                        </FadeIn>

                        <FadeIn delay={0.3} direction="up">
                            <SpotlightCard className="relative group h-full" spotlightColor="rgba(110, 155, 138, 0.12)">
                                <div className="bg-card-dark p-8 border border-border-dark/40 hover:border-primary/20 transition-colors h-full">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-3 bg-primary/10 w-fit">
                                            <span className="material-symbols-outlined text-primary text-2xl">rocket_launch</span>
                                        </div>
                                        <span className="font-arcade text-2xl text-text-muted">04</span>
                                    </div>
                                    <h3 className="font-arcade text-xs text-white mb-3">TOKENS FLY OUT</h3>
                                    <p className="font-mono text-xs leading-relaxed text-text-secondary uppercase tracking-tighter">
                                        Eligible members claim → we verify their role → tokens land in their Solana wallet. Confirmed onchain. Done.
                                    </p>
                                </div>
                            </SpotlightCard>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ─── USE CASES ─── */}
            <section id="use-cases" className="py-24 border-y border-border-dark/40 bg-surface">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-6">
                        <span className="font-arcade text-[10px] text-primary bg-primary/10 px-4 py-2 arcade-border-cyan inline-block mb-6">USE_CASES</span>
                        <h2 className="font-arcade text-2xl text-white mb-4">WHAT CAN YOU DO WITH DAGETS?</h2>
                        <p className="font-mono text-sm text-text-muted uppercase tracking-tighter max-w-xl mx-auto">
                            If you have a Discord community and want to distribute tokens, you&apos;re in the right place.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-16">
                        <FadeIn delay={0} direction="up">
                            <SpotlightCard className="bg-card-dark p-8 border border-border-dark/40 border-l-2 border-l-neon-magenta group hover:border-neon-magenta/30 transition-colors h-full" spotlightColor="rgba(209, 107, 165, 0.15)">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 bg-neon-magenta/10">
                                        <span className="material-symbols-outlined text-neon-magenta text-2xl">celebration</span>
                                    </div>
                                    <span className="font-arcade text-[10px] text-text-muted">SCENARIO_01</span>
                                </div>
                                <h3 className="font-arcade text-sm text-white mb-4">COMMUNITY REWARDS</h3>
                                <p className="font-mono text-xs leading-relaxed text-text-secondary uppercase tracking-tighter">
                                    Reward your most loyal members. Gate it by &quot;OG&quot; or &quot;Diamond Hands&quot; roles so only the real ones eat.
                                </p>
                            </SpotlightCard>
                        </FadeIn>

                        <FadeIn delay={0.15} direction="up">
                            <SpotlightCard className="bg-card-dark p-8 border border-border-dark/40 border-l-2 border-l-primary group hover:border-primary/30 transition-colors h-full" spotlightColor="rgba(110, 155, 138, 0.15)">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 bg-primary/10">
                                        <span className="material-symbols-outlined text-primary text-2xl">campaign</span>
                                    </div>
                                    <span className="font-arcade text-[10px] text-text-muted">SCENARIO_02</span>
                                </div>
                                <h3 className="font-arcade text-sm text-white mb-4">MARKETING CAMPAIGNS</h3>
                                <p className="font-mono text-xs leading-relaxed text-text-secondary uppercase tracking-tighter">
                                    Running a collab? Create a Daget, gate it by partner server roles, and let their members claim. Cross-community love.
                                </p>
                            </SpotlightCard>
                        </FadeIn>

                        <FadeIn delay={0.3} direction="up">
                            <SpotlightCard className="bg-card-dark p-8 border border-border-dark/40 border-l-2 border-l-primary group hover:border-primary/30 transition-colors h-full" spotlightColor="rgba(110, 155, 138, 0.15)">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 bg-primary/10">
                                        <span className="material-symbols-outlined text-primary text-2xl">mystery_box</span>
                                    </div>
                                    <span className="font-arcade text-[10px] text-text-muted">SCENARIO_03</span>
                                </div>
                                <h3 className="font-arcade text-sm text-white mb-4">RANDOM DROPS</h3>
                                <p className="font-mono text-xs leading-relaxed text-text-secondary uppercase tracking-tighter">
                                    Use random mode to spice things up. Each claimer gets a different amount within your set range. Some get more, some get less — everyone has fun.
                                </p>
                            </SpotlightCard>
                        </FadeIn>
                    </div>
                </div>
            </section>

            {/* ─── BUILT DIFFERENT ─── */}
            <section className="py-24 bg-background-dark">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-6">
                        <span className="font-arcade text-[10px] text-primary bg-primary/10 px-4 py-2 arcade-border-cyan inline-block mb-6">VERSUS_MODE</span>
                        <h2 className="font-arcade text-2xl text-white mb-4">WHY NOT JUST USE A BOT?</h2>
                        <p className="font-mono text-sm text-text-muted uppercase tracking-tighter max-w-2xl mx-auto">
                            Good question. Here&apos;s the honest comparison.
                        </p>
                    </div>

                    <div className="mt-16 max-w-4xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                            {/* Old Way */}
                            <SpotlightCard className="bg-card-dark p-8 border border-border-dark/40 border-r-0 md:border-r-0 hover:border-red-400/50 hover:shadow-lg hover:shadow-red-400/10 transition-all duration-300 hover:-translate-y-1 z-10" spotlightColor="rgba(248, 113, 113, 0.15)">
                                <div className="flex items-center gap-3 mb-8">
                                    <span className="material-symbols-outlined text-red-400 text-2xl">dangerous</span>
                                    <h3 className="font-arcade text-sm text-red-400">THE OLD WAY</h3>
                                </div>
                                <ul className="space-y-4">
                                    <li className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-red-400/60 text-base mt-0.5">close</span>
                                        <span className="font-mono text-xs text-text-secondary uppercase tracking-tighter">Manual wallet collection via Google Forms</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-red-400/60 text-base mt-0.5">close</span>
                                        <span className="font-mono text-xs text-text-secondary uppercase tracking-tighter">Copy-paste addresses into CSV, pray nothing is wrong</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-red-400/60 text-base mt-0.5">close</span>
                                        <span className="font-mono text-xs text-text-secondary uppercase tracking-tighter">Send tokens one by one or use sketchy multisend tools</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-red-400/60 text-base mt-0.5">close</span>
                                        <span className="font-mono text-xs text-text-secondary uppercase tracking-tighter">No way to verify roles — anyone can submit</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-red-400/60 text-base mt-0.5">close</span>
                                        <span className="font-mono text-xs text-text-secondary uppercase tracking-tighter">&quot;Did I already send to this address?&quot; — you every time</span>
                                    </li>
                                </ul>
                            </SpotlightCard>

                            {/* Daget Way */}
                            <SpotlightCard className="bg-card-dark p-8 border border-primary/30 hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 z-10" spotlightColor="rgba(110, 155, 138, 0.15)">
                                <div className="flex items-center gap-3 mb-8">
                                    <span className="material-symbols-outlined text-primary text-2xl">verified</span>
                                    <h3 className="font-arcade text-sm text-primary">THE DAGET WAY</h3>
                                </div>
                                <ul className="space-y-4">
                                    <li className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-primary/60 text-base mt-0.5">check</span>
                                        <span className="font-mono text-xs text-text-primary uppercase tracking-tighter">Members claim with one click — no form needed</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-primary/60 text-base mt-0.5">check</span>
                                        <span className="font-mono text-xs text-text-primary uppercase tracking-tighter">Roles verified server-side via Discord API automatically</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-primary/60 text-base mt-0.5">check</span>
                                        <span className="font-mono text-xs text-text-primary uppercase tracking-tighter">Tokens sent to their Solana address onchain, instantly</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-primary/60 text-base mt-0.5">check</span>
                                        <span className="font-mono text-xs text-text-primary uppercase tracking-tighter">One claim per person enforced — no duplicates possible</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-primary/60 text-base mt-0.5">check</span>
                                        <span className="font-mono text-xs text-text-primary uppercase tracking-tighter">Full audit trail — every claim verifiable on Solana explorer</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-primary text-base mt-0.5">check</span>
                                        <span className="font-mono text-xs text-primary uppercase tracking-tighter font-bold">No connect wallet needed — just Discord login + paste address</span>
                                    </li>
                                </ul>
                            </SpotlightCard>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── FAQ ─── */}
            <section id="faq" className="py-24 border-y border-border-dark/40 bg-surface">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-6">
                        <span className="font-arcade text-[10px] text-neon-magenta bg-neon-magenta/10 px-4 py-2 arcade-border-magenta inline-block mb-6">HELP_MENU</span>
                        <h2 className="font-arcade text-2xl text-white mb-4">FREQUENTLY ASKED</h2>
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
                    <h2 className="font-arcade text-2xl md:text-4xl text-white mb-6">
                        STOP USING GOOGLE FORMS<br />
                        <span className="text-primary">FOR GIVEAWAYS.</span>
                    </h2>
                    <p className="font-mono text-sm text-text-secondary uppercase tracking-tighter max-w-lg mx-auto mb-12">
                        Your community deserves better. Set up your first Daget in under 2 minutes. Seriously, we timed it.
                    </p>
                    <button
                        onClick={handleLogin}
                        className="inline-flex items-center justify-center gap-4 bg-[#5865F2] hover:brightness-110 text-white px-12 py-5 arcade-border font-arcade text-xs transition-transform active:scale-95"
                    >
                        <img
                            alt="Discord"
                            className="w-6 h-6"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCl7InillKVvqmL7_KGDx0E2FtuvX6OjrAMNOLCZ57S2mLfPOo_NF4hCJpFDbVmp6qsJ23VW-1w4zDKsMzPQdeYpU1XvGwXAV0mj7yMWaWL_6GxXQv8MuLx2FCyFlWwcHcLPMF6qlQToqV4vKN0NMjeqbP5O-Qce-4KrQQ9HecuSqFz1XSEFhkoPvwzYz7XvfjJ1ZxVdGTHrucIrDpA8HMtgQtfGdjqnSxn71SzTzLaNPKsBVIfMBRYTVoVKL0wwFyrQPEKcwslZON6"
                        />
                        GET STARTED NOW
                    </button>
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
                            <img src="/icon.png" alt="Daget.fun" className="w-10 h-10 rounded" />

                        </div>
                        <div className="flex flex-wrap justify-center gap-8 font-mono text-[10px] tracking-widest uppercase items-center">
                            <Link className="text-white hover:text-primary transition-colors px-3 py-1 arcade-border-cyan bg-background-dark" href="/terms">TERMS OF USE</Link>
                            <Link className="text-white hover:text-neon-magenta transition-colors px-3 py-1 arcade-border-magenta bg-background-dark" href="/privacy">PRIVACY POLICY</Link>
                            <a className="text-text-muted hover:text-primary transition-colors" href="#">[ TWITTER ]</a>
                            <a className="text-text-muted hover:text-primary transition-colors" href="#">[ DISCORD ]</a>
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
        </div>
    );
}
