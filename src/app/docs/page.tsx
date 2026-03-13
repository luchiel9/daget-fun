'use client';

import Link from 'next/link';

const sections = [
    { id: '01', title: 'WHAT IS DAGET.FUN?' },
    { id: '02', title: 'HOW IT WORKS' },
    { id: '03', title: 'DAGET MODES' },
    { id: '04', title: 'FIXED MODE' },
    { id: '05', title: 'RANDOM MODE' },
    { id: '06', title: 'RAFFLE MODE' },
    { id: '07', title: 'SUPPORTED TOKENS' },
    { id: '08', title: 'FOR CREATORS' },
    { id: '09', title: 'FOR CLAIMERS' },
    { id: '10', title: 'COMMON QUESTIONS' },
];

/* ─── Reusable visual components ─── */

function FlowStep({ number, label, description, accent = 'primary' }: {
    number: string;
    label: string;
    description: string;
    accent?: 'primary' | 'magenta' | 'amber';
}) {
    const colors = {
        primary: { text: 'text-primary', border: 'border-primary/30', bg: 'bg-primary/5' },
        magenta: { text: 'text-neon-magenta', border: 'border-neon-magenta/30', bg: 'bg-neon-magenta/5' },
        amber: { text: 'text-amber-400', border: 'border-amber-400/30', bg: 'bg-amber-400/5' },
    };
    const c = colors[accent];
    return (
        <div className={`flex items-start gap-4 ${c.bg} border ${c.border} p-4 rounded-sm`}>
            <div className={`shrink-0 w-8 h-8 flex items-center justify-center font-arcade text-[10px] ${c.text} border ${c.border}`}>
                {number}
            </div>
            <div>
                <p className="text-white font-mono text-sm font-bold mb-1">{label}</p>
                <p className="text-text-secondary text-[14px] leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

function ModeCard({ title, subtitle, accent, icon, children }: {
    title: string;
    subtitle: string;
    accent: 'primary' | 'magenta' | 'amber';
    icon: string;
    children: React.ReactNode;
}) {
    const styles = {
        primary: {
            border: 'arcade-border-cyan',
            titleColor: 'text-primary',
            iconBg: 'bg-primary/10',
            iconBorder: 'border-primary/30',
        },
        magenta: {
            border: 'arcade-border-magenta',
            titleColor: 'text-neon-magenta',
            iconBg: 'bg-neon-magenta/10',
            iconBorder: 'border-neon-magenta/30',
        },
        amber: {
            border: 'arcade-border-amber',
            titleColor: 'text-amber-400',
            iconBg: 'bg-amber-400/10',
            iconBorder: 'border-amber-400/30',
        },
    };
    const s = styles[accent];
    return (
        <div className={`${s.border} bg-card-dark p-6`}>
            <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 flex items-center justify-center ${s.iconBg} border ${s.iconBorder} rounded-sm`}>
                    <span className="material-symbols-outlined text-2xl" style={{
                        color: accent === 'primary' ? '#6E9B8A' : accent === 'magenta' ? '#d16ba5' : '#FBBF24',
                    }}>{icon}</span>
                </div>
                <div>
                    <h3 className={`font-arcade text-xs ${s.titleColor}`}>{title}</h3>
                    <p className="font-mono text-[11px] text-text-muted mt-1">{subtitle}</p>
                </div>
            </div>
            {children}
        </div>
    );
}

export default function DocsPage() {
    return (
        <div className="min-h-screen bg-background-dark text-text-secondary font-mono antialiased overflow-x-hidden">

            {/* ─── NAV ─── */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-background-dark/95 backdrop-blur-md border-b border-border-dark/60">
                <div className="max-w-7xl mx-auto px-4 h-20 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-4">
                        <img src="/images/dagetfun_logo.png" alt="Daget.fun" className="w-12 h-12 rounded" />
                    </Link>
                    <div className="flex items-center gap-6">
                        <Link
                            href="/"
                            className="flex items-center gap-3 px-4 py-2 arcade-border-cyan text-[10px] font-arcade text-primary hover:bg-primary/10 transition-colors"
                        >
                            ← BACK TO HOME
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="relative pt-32 pb-20">
                {/* Subtle grid background */}
                <div className="absolute inset-0 grid-background opacity-20 pointer-events-none" />

                <div className="relative max-w-6xl mx-auto px-6">

                    {/* ─── HEADER ─── */}
                    <div className="text-center mb-16">
                        <div className="inline-block px-4 py-1 mb-6 arcade-border-cyan bg-background-dark">
                            <span className="font-arcade text-[10px] text-primary">USER_GUIDE // v1.0</span>
                        </div>
                        <h1 className="font-arcade text-2xl md:text-4xl text-white mb-4">DOCUMENTATION</h1>
                        <p className="font-mono text-sm text-text-muted uppercase tracking-tighter">
                            Everything you need to know about Daget.fun
                        </p>
                        <p className="font-mono text-xs text-text-muted mt-2 max-w-2xl mx-auto leading-relaxed">
                            This guide explains how Daget.fun works, what each giveaway mode does, and how to get started — whether you&apos;re a community manager creating giveaways or a member claiming tokens.
                        </p>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-12">

                        {/* ─── SIDEBAR TOC ─── */}
                        <aside className="hidden lg:block w-56 shrink-0">
                            <div className="sticky top-28 bg-card-dark border border-border-dark/40 p-4">
                                <p className="font-arcade text-[9px] text-text-muted mb-4 tracking-widest">CONTENTS</p>
                                <nav className="space-y-1">
                                    {sections.map((s) => (
                                        <a
                                            key={s.id}
                                            href={`#section-${s.id}`}
                                            className="flex items-center gap-2 text-[10px] font-mono text-text-muted hover:text-primary transition-colors py-1 border-l-2 border-transparent hover:border-primary pl-2"
                                        >
                                            <span className="text-border-dark">{s.id}.</span>
                                            {s.title}
                                        </a>
                                    ))}
                                </nav>
                            </div>
                        </aside>

                        {/* ─── CONTENT ─── */}
                        <div className="flex-1 space-y-16 text-[15px] leading-[1.9] text-text-secondary">

                            {/* ══════════════════════════════════════════════════ */}
                            {/* 01 — WHAT IS DAGET.FUN? */}
                            {/* ══════════════════════════════════════════════════ */}
                            <section id="section-01">
                                <h2 className="font-arcade text-xs text-primary mb-6 flex items-center gap-3">
                                    <span className="text-text-muted">01.</span> WHAT IS DAGET.FUN?
                                </h2>

                                <p>
                                    <strong className="text-white">Daget.fun</strong> is a platform that lets Discord community managers send crypto tokens (like USDC, USDT, or SOL) directly to their community members through giveaways — without anyone needing to &quot;connect a wallet&quot; or install browser extensions.
                                </p>

                                <p className="mt-3">
                                    Think of it like this: instead of manually sending tokens to dozens or hundreds of people one by one, you set up a giveaway (called a <strong className="text-white">&quot;Daget&quot;</strong>), share a link with your community, and eligible members claim their tokens by simply pasting their wallet address. Everything else — verification, token transfer, confirmation — happens automatically.
                                </p>

                                <div className="bg-card-dark border border-border-dark/40 border-l-4 border-l-primary p-6 mt-6">
                                    <p className="font-arcade text-[10px] text-primary mb-3 tracking-widest">THE KEY IDEAS</p>
                                    <ul className="list-none space-y-3">
                                        {[
                                            { label: 'Role-gated', desc: 'Only Discord members with specific roles can claim. This ensures tokens go to the right people.' },
                                            { label: 'Onchain', desc: 'Every token transfer is a real Solana blockchain transaction. Transparent, verifiable, permanent.' },
                                            { label: 'No wallet connection', desc: 'Claimers just paste their Solana address. No browser extensions, no signing prompts, no approvals.' },
                                            { label: 'Automatic', desc: 'Once you set up a Daget and share the link, claims are processed automatically by our system.' },
                                        ].map((item, i) => (
                                            <li key={i} className="flex items-start gap-3 text-[14px]">
                                                <span className="text-primary mt-1 shrink-0">▸</span>
                                                <span><strong className="text-white">{item.label}:</strong> {item.desc}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <p className="mt-4">
                                    Daget.fun runs on the <strong className="text-white">Solana</strong> blockchain — a fast, low-cost network where transactions typically confirm in seconds and cost fractions of a cent.
                                </p>
                            </section>

                            {/* ══════════════════════════════════════════════════ */}
                            {/* 02 — HOW IT WORKS */}
                            {/* ══════════════════════════════════════════════════ */}
                            <section id="section-02">
                                <h2 className="font-arcade text-xs text-primary mb-6 flex items-center gap-3">
                                    <span className="text-text-muted">02.</span> HOW IT WORKS
                                </h2>

                                <p className="mb-6">
                                    The entire process from creating a giveaway to members receiving tokens takes just a few steps. Here&apos;s the journey from start to finish:
                                </p>

                                {/* Creator flow */}
                                <div className="mb-8">
                                    <p className="font-arcade text-[10px] text-primary mb-4 tracking-widest">CREATOR SIDE</p>
                                    <div className="space-y-3">
                                        <FlowStep number="01" label="Sign in with Discord" description="Log in using your Discord account. Daget.fun uses Discord OAuth — no separate passwords to remember." />
                                        <FlowStep number="02" label="Fund your managed wallet" description="The platform creates a Solana wallet for you. Send the tokens you want to give away to this wallet. Think of it as loading a gift card." />
                                        <FlowStep number="03" label="Create a Daget" description="Set up your giveaway: name it, choose the token, set the total pool, number of winners, distribution mode, and which Discord roles can participate." />
                                        <FlowStep number="04" label="Share the claim link" description="Every Daget gets a unique link. Share it in your Discord server. Only members with the roles you selected will be able to claim." />
                                        <FlowStep number="05" label="Sit back" description="Claims are processed automatically. You can watch the progress in your dashboard as members claim and tokens are sent." />
                                    </div>
                                </div>

                                {/* Claimer flow */}
                                <div>
                                    <p className="font-arcade text-[10px] text-neon-magenta mb-4 tracking-widest">CLAIMER SIDE</p>
                                    <div className="space-y-3">
                                        <FlowStep number="01" label="Click the claim link" description="The creator shares a link in Discord. Click it to open the claim page." accent="magenta" />
                                        <FlowStep number="02" label="Log in with Discord" description="Authenticate with your Discord account so the system can verify you have the right roles." accent="magenta" />
                                        <FlowStep number="03" label="Paste your Solana address" description="Enter the Solana wallet address where you want to receive your tokens. No wallet connection needed — just paste the address." accent="magenta" />
                                        <FlowStep number="04" label="Claim your tokens" description="Hit the claim button. The system verifies your Discord roles, calculates your amount, and queues the transfer." accent="magenta" />
                                        <FlowStep number="05" label="Receive your tokens" description="Within seconds, the tokens arrive in your Solana wallet. You'll see a transaction link to verify it on the blockchain." accent="magenta" />
                                    </div>
                                </div>
                            </section>

                            {/* ══════════════════════════════════════════════════ */}
                            {/* 03 — DAGET MODES OVERVIEW */}
                            {/* ══════════════════════════════════════════════════ */}
                            <section id="section-03">
                                <h2 className="font-arcade text-xs text-primary mb-6 flex items-center gap-3">
                                    <span className="text-text-muted">03.</span> DAGET MODES
                                </h2>

                                <p>
                                    When you create a Daget, you choose a <strong className="text-white">distribution mode</strong> — this determines how tokens are divided among claimers. There are three modes, each designed for different use cases:
                                </p>

                                {/* Mode comparison grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                    <ModeCard
                                        title="FIXED"
                                        subtitle="Equal shares for all"
                                        accent="primary"
                                        icon="balance"
                                    >
                                        <p className="text-[13px] text-text-secondary leading-relaxed">
                                            Every claimer gets exactly the same amount. Simple, predictable, fair.
                                        </p>
                                    </ModeCard>

                                    <ModeCard
                                        title="RANDOM"
                                        subtitle="Varied amounts"
                                        accent="magenta"
                                        icon="casino"
                                    >
                                        <p className="text-[13px] text-text-secondary leading-relaxed">
                                            Each claimer gets a different amount within a range you set. Adds excitement and surprise.
                                        </p>
                                    </ModeCard>

                                    <ModeCard
                                        title="RAFFLE"
                                        subtitle="Lucky draw"
                                        accent="amber"
                                        icon="emoji_events"
                                    >
                                        <p className="text-[13px] text-text-secondary leading-relaxed">
                                            Members enter a draw. After the deadline, winners are selected randomly and receive tokens.
                                        </p>
                                    </ModeCard>
                                </div>

                                <p className="mt-6 text-[14px] text-text-muted">
                                    Read the detailed sections below to understand exactly how each mode works and when to use it.
                                </p>
                            </section>

                            {/* ══════════════════════════════════════════════════ */}
                            {/* 04 — FIXED MODE */}
                            {/* ══════════════════════════════════════════════════ */}
                            <section id="section-04">
                                <h2 className="font-arcade text-xs text-primary mb-6 flex items-center gap-3">
                                    <span className="text-text-muted">04.</span> FIXED MODE
                                </h2>

                                <div className="arcade-border-cyan bg-card-dark p-6 mb-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="material-symbols-outlined text-primary text-2xl">balance</span>
                                        <div>
                                            <p className="font-arcade text-[10px] text-primary">FIXED MODE</p>
                                            <p className="text-text-muted text-[11px] font-mono mt-0.5">Everyone gets the same amount</p>
                                        </div>
                                    </div>

                                    <p className="text-[14px] leading-relaxed">
                                        Fixed mode is the simplest way to distribute tokens. You set a <strong className="text-white">total pool</strong> and a <strong className="text-white">number of winners</strong>, and the system divides the pool equally among all claimers.
                                    </p>
                                </div>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 tracking-widest">HOW THE MATH WORKS</p>
                                <p>
                                    It&apos;s straightforward division:
                                </p>
                                <div className="bg-card-dark border border-border-dark/40 p-5 mt-3 mb-4 text-center">
                                    <p className="font-mono text-white text-lg">
                                        Amount per person = Total Pool ÷ Number of Winners
                                    </p>
                                </div>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 mt-6 tracking-widest">EXAMPLE</p>
                                <div className="bg-card-dark border border-primary/20 p-5">
                                    <p className="text-[14px] leading-relaxed">
                                        You create a Daget with <strong className="text-white">100 USDC</strong> and <strong className="text-white">20 winners</strong>. Every person who claims gets exactly <strong className="text-primary">5 USDC</strong>. The first person gets 5 USDC, the tenth person gets 5 USDC, the twentieth person gets 5 USDC. No variation, no surprises.
                                    </p>
                                </div>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 mt-6 tracking-widest">WHEN TO USE FIXED MODE</p>
                                <ul className="list-none space-y-2 ml-4">
                                    {[
                                        'Paying contributors or bounty hunters a set reward',
                                        'Distributing equal airdrops to community members',
                                        'Rewarding event participants with the same amount',
                                        'Any situation where fairness and predictability matter most',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-primary mt-1 shrink-0">▸</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 mt-6 tracking-widest">WHAT CLAIMERS SEE</p>
                                <p>
                                    Claimers see the exact amount they&apos;ll receive <strong className="text-white">before</strong> they claim. There&apos;s no mystery — they know what they&apos;re getting upfront. The claim page shows the per-person amount clearly.
                                </p>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 mt-6 tracking-widest">FIRST COME, FIRST SERVED</p>
                                <p>
                                    In Fixed mode, claims are processed <strong className="text-white">immediately</strong> as they come in. When someone claims, tokens are sent right away. Once all winner slots are filled, the Daget closes automatically and no more claims are accepted.
                                </p>
                            </section>

                            {/* ══════════════════════════════════════════════════ */}
                            {/* 05 — RANDOM MODE */}
                            {/* ══════════════════════════════════════════════════ */}
                            <section id="section-05">
                                <h2 className="font-arcade text-xs text-neon-magenta mb-6 flex items-center gap-3">
                                    <span className="text-text-muted">05.</span> RANDOM MODE
                                </h2>

                                <div className="arcade-border-magenta bg-card-dark p-6 mb-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="material-symbols-outlined text-neon-magenta text-2xl">casino</span>
                                        <div>
                                            <p className="font-arcade text-[10px] text-neon-magenta">RANDOM MODE</p>
                                            <p className="text-text-muted text-[11px] font-mono mt-0.5">Each person gets a different amount</p>
                                        </div>
                                    </div>

                                    <p className="text-[14px] leading-relaxed">
                                        Random mode adds an element of surprise. Instead of giving everyone the same amount, each claimer receives a <strong className="text-white">different, randomized amount</strong> within a range that you control. The total pool is still fully distributed — just not equally.
                                    </p>
                                </div>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 tracking-widest">HOW IT WORKS</p>
                                <p>
                                    When you create a Random mode Daget, you set two extra parameters:
                                </p>
                                <ul className="list-none space-y-2 mt-3 ml-4">
                                    <li className="flex items-start gap-3">
                                        <span className="text-neon-magenta mt-1 shrink-0">▸</span>
                                        <span><strong className="text-white">Minimum percentage</strong> — The smallest amount anyone can receive, as a percentage of the average share.</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-neon-magenta mt-1 shrink-0">▸</span>
                                        <span><strong className="text-white">Maximum percentage</strong> — The largest amount anyone can receive, as a percentage of the average share.</span>
                                    </li>
                                </ul>

                                <p className="mt-4">
                                    The &quot;average share&quot; is simply the total pool divided by the number of winners (same as Fixed mode). The min and max percentages create a range around that average.
                                </p>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 mt-6 tracking-widest">EXAMPLE</p>
                                <div className="bg-card-dark border border-neon-magenta/20 p-5">
                                    <p className="text-[14px] leading-relaxed mb-3">
                                        You create a Daget with <strong className="text-white">100 USDC</strong>, <strong className="text-white">10 winners</strong>, and set the range to <strong className="text-neon-magenta">50% min – 150% max</strong>.
                                    </p>
                                    <p className="text-[14px] leading-relaxed mb-3">
                                        The average share is 10 USDC. With those percentages:
                                    </p>
                                    <ul className="list-none space-y-1 ml-4 text-[14px]">
                                        <li className="flex items-start gap-3">
                                            <span className="text-neon-magenta shrink-0">▸</span>
                                            <span>The minimum anyone can get is <strong className="text-white">5 USDC</strong> (50% of 10)</span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <span className="text-neon-magenta shrink-0">▸</span>
                                            <span>The maximum anyone can get is <strong className="text-white">15 USDC</strong> (150% of 10)</span>
                                        </li>
                                    </ul>
                                    <p className="text-[14px] leading-relaxed mt-3">
                                        One person might get 7.23 USDC, another 12.85 USDC, another 5.41 USDC — each amount is randomly determined within the range. The system ensures the total pool is fully distributed by the time all winners have claimed.
                                    </p>
                                </div>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 mt-6 tracking-widest">THE SMART BALANCING</p>
                                <p>
                                    The system is designed so that the <strong className="text-white">entire pool is always distributed</strong>. It doesn&apos;t just pick random numbers — it intelligently calculates each amount based on what&apos;s left in the pool and how many claimers remain, while staying within your min/max boundaries. This means:
                                </p>
                                <ul className="list-none space-y-2 mt-3 ml-4">
                                    {[
                                        'No tokens are left over or wasted',
                                        'No one gets more than the maximum you set',
                                        'No one gets less than the minimum you set',
                                        'The last claimer\'s amount is whatever remains in the pool (still within bounds)',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-neon-magenta mt-1 shrink-0">▸</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 mt-6 tracking-widest">WHEN TO USE RANDOM MODE</p>
                                <ul className="list-none space-y-2 ml-4">
                                    {[
                                        'Community engagement events where you want to add excitement',
                                        'Red-packet / lucky-draw style giveaways',
                                        'When you want to reward participation but with a fun twist',
                                        'Gamified campaigns where variability drives engagement',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-neon-magenta mt-1 shrink-0">▸</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 mt-6 tracking-widest">WHAT CLAIMERS SEE</p>
                                <p>
                                    Claimers see the amount range (min–max) on the claim page, but they <strong className="text-white">don&apos;t know their exact amount until after they claim</strong>. It&apos;s like opening a red packet — the surprise is part of the experience.
                                </p>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 mt-6 tracking-widest">FIRST COME, FIRST SERVED</p>
                                <p>
                                    Like Fixed mode, Random mode processes claims <strong className="text-white">immediately</strong>. Tokens are sent as soon as someone claims. The Daget closes when all winner slots are filled.
                                </p>
                            </section>

                            {/* ══════════════════════════════════════════════════ */}
                            {/* 06 — RAFFLE MODE */}
                            {/* ══════════════════════════════════════════════════ */}
                            <section id="section-06">
                                <h2 className="font-arcade text-xs text-amber-400 mb-6 flex items-center gap-3">
                                    <span className="text-text-muted">06.</span> RAFFLE MODE
                                </h2>

                                <div className="arcade-border-amber bg-card-dark p-6 mb-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="material-symbols-outlined text-amber-400 text-2xl">emoji_events</span>
                                        <div>
                                            <p className="font-arcade text-[10px] text-amber-400">RAFFLE MODE</p>
                                            <p className="text-text-muted text-[11px] font-mono mt-0.5">Enter to win — winners drawn after deadline</p>
                                        </div>
                                    </div>

                                    <p className="text-[14px] leading-relaxed">
                                        Raffle mode works differently from Fixed and Random. Instead of first-come-first-served, <strong className="text-white">everyone enters the raffle during an entry period</strong>, and winners are randomly selected after the deadline passes. This gives everyone an equal chance regardless of when they enter.
                                    </p>
                                </div>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 tracking-widest">HOW IT WORKS — STEP BY STEP</p>
                                <div className="space-y-3 mb-6">
                                    <FlowStep number="01" label="Creator sets up the raffle" description="Choose the token, total pool, number of winners, eligible roles, and most importantly — the entry deadline. The deadline can be anywhere from 5 minutes to 30 days in the future." accent="amber" />
                                    <FlowStep number="02" label="Entry period opens" description="Eligible Discord members visit the claim page and enter the raffle. They provide their Solana wallet address but no tokens are sent yet. Everyone who enters during this period has an equal shot." accent="amber" />
                                    <FlowStep number="03" label="Deadline passes" description="When the entry deadline arrives, the raffle closes to new entries. The system prepares to draw winners." accent="amber" />
                                    <FlowStep number="04" label="Winners are drawn" description="The system uses verifiable randomness (from drand, a public randomness beacon) to select winners from all entries. This means the draw is provably fair — no one, not even us, can influence who wins." accent="amber" />
                                    <FlowStep number="05" label="Tokens are distributed" description="Winners receive their tokens automatically. Each winner gets an equal share of the pool (pool ÷ number of winners). Winners are notified that their prize is on the way." accent="amber" />
                                </div>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 tracking-widest">PROVABLY FAIR DRAWS</p>
                                <div className="bg-card-dark border border-amber-400/20 border-l-4 border-l-amber-400 p-6">
                                    <p className="text-[14px] leading-relaxed mb-3">
                                        Raffle draws use <strong className="text-white">drand</strong> — a distributed, public randomness beacon operated by a network of independent organizations around the world. Here&apos;s why this matters:
                                    </p>
                                    <ul className="list-none space-y-2 ml-4 text-[14px]">
                                        {[
                                            'The randomness is generated after the entry period closes, so no one can predict or manipulate it beforehand',
                                            'Anyone can verify the random value used for the draw by checking the drand public record',
                                            'Neither the creator nor Daget.fun can influence which entries are selected',
                                            'The drand round number and randomness value are stored with the raffle for permanent auditability',
                                        ].map((item, i) => (
                                            <li key={i} className="flex items-start gap-3">
                                                <span className="text-amber-400 shrink-0">▸</span>
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 mt-6 tracking-widest">EXAMPLE</p>
                                <div className="bg-card-dark border border-amber-400/20 p-5">
                                    <p className="text-[14px] leading-relaxed mb-3">
                                        You create a raffle with <strong className="text-white">500 USDC</strong>, <strong className="text-white">5 winners</strong>, and a <strong className="text-amber-400">48-hour entry period</strong>.
                                    </p>
                                    <p className="text-[14px] leading-relaxed mb-3">
                                        Over the 48 hours, 200 eligible community members enter. When the deadline passes, the system uses drand randomness to pick 5 winners from the 200 entries. Each winner receives <strong className="text-white">100 USDC</strong> (500 ÷ 5).
                                    </p>
                                    <p className="text-[14px] leading-relaxed">
                                        No tokens leave anyone&apos;s wallet for entering — there&apos;s no cost to participate.
                                    </p>
                                </div>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 mt-6 tracking-widest">WHEN TO USE RAFFLE MODE</p>
                                <ul className="list-none space-y-2 ml-4">
                                    {[
                                        'Large community events where you want to give bigger prizes to fewer people',
                                        'When you want equal opportunity regardless of timezone or availability',
                                        'Contests and special campaigns with defined entry periods',
                                        'When the excitement of "will I win?" drives more engagement than guaranteed small amounts',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-amber-400 mt-1 shrink-0">▸</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 mt-6 tracking-widest">WHAT CLAIMERS SEE</p>
                                <p>
                                    During the entry period, claimers see a countdown timer and the total prize pool. After the draw, winners are notified and see their token transfer confirmation.
                                </p>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 mt-6 tracking-widest">DISCORD INTEGRATION</p>
                                <p>
                                    Raffle mode optionally integrates with Discord. If the Daget.fun bot is installed in your server, you can have the raffle automatically posted to a Discord channel, making it easy for members to discover and enter.
                                </p>
                            </section>

                            {/* ══════════════════════════════════════════════════ */}
                            {/* 07 — SUPPORTED TOKENS */}
                            {/* ══════════════════════════════════════════════════ */}
                            <section id="section-07">
                                <h2 className="font-arcade text-xs text-primary mb-6 flex items-center gap-3">
                                    <span className="text-text-muted">07.</span> SUPPORTED TOKENS
                                </h2>

                                <p className="mb-6">
                                    Daget.fun currently supports three tokens on the Solana blockchain:
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        {
                                            symbol: 'USDC',
                                            name: 'USD Coin',
                                            desc: 'A stablecoin pegged to the US Dollar. 1 USDC = $1 USD. The most widely used stablecoin for payments and rewards.',
                                            color: 'text-blue-400',
                                            borderColor: 'border-blue-400/20',
                                            bgColor: 'bg-blue-400/5',
                                        },
                                        {
                                            symbol: 'USDT',
                                            name: 'Tether',
                                            desc: 'Another US Dollar stablecoin. 1 USDT = $1 USD. Widely used across the crypto ecosystem.',
                                            color: 'text-emerald-400',
                                            borderColor: 'border-emerald-400/20',
                                            bgColor: 'bg-emerald-400/5',
                                        },
                                        {
                                            symbol: 'SOL',
                                            name: 'Solana',
                                            desc: 'The native token of the Solana blockchain. Its value fluctuates with the market, unlike stablecoins.',
                                            color: 'text-violet-400',
                                            borderColor: 'border-violet-400/20',
                                            bgColor: 'bg-violet-400/5',
                                        },
                                    ].map((token) => (
                                        <div key={token.symbol} className={`${token.bgColor} border ${token.borderColor} p-5`}>
                                            <p className={`font-arcade text-sm ${token.color} mb-1`}>{token.symbol}</p>
                                            <p className="text-white text-[13px] font-mono mb-2">{token.name}</p>
                                            <p className="text-text-secondary text-[13px] leading-relaxed">{token.desc}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-card-dark border border-border-dark/40 border-l-4 border-l-primary p-5 mt-6">
                                    <p className="font-arcade text-[10px] text-primary mb-2 tracking-widest">A NOTE ON STABLECOINS VS SOL</p>
                                    <p className="text-[14px] leading-relaxed">
                                        <strong className="text-white">Stablecoins (USDC, USDT)</strong> maintain a steady value — if you send 10 USDC, the recipient gets the equivalent of $10. <strong className="text-white">SOL</strong>, on the other hand, has a market price that changes constantly. If you create a Daget with 1 SOL when SOL is $150, recipients get 1 SOL — but its dollar value might be higher or lower by the time they receive it.
                                    </p>
                                </div>
                            </section>

                            {/* ══════════════════════════════════════════════════ */}
                            {/* 08 — FOR CREATORS */}
                            {/* ══════════════════════════════════════════════════ */}
                            <section id="section-08">
                                <h2 className="font-arcade text-xs text-primary mb-6 flex items-center gap-3">
                                    <span className="text-text-muted">08.</span> FOR CREATORS
                                </h2>

                                <p className="mb-4">
                                    If you&apos;re a Discord community manager or project lead looking to distribute tokens, here&apos;s what you need to know:
                                </p>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 tracking-widest">MANAGED WALLET</p>
                                <p>
                                    When you sign up, the platform creates a <strong className="text-white">managed Solana wallet</strong> for you. This is where you deposit the tokens for your giveaways. Think of it as a temporary operational wallet:
                                </p>
                                <ul className="list-none space-y-2 mt-3 ml-4">
                                    {[
                                        'Deposit only what you need for the current giveaway',
                                        'Withdraw any leftover balance after the giveaway ends',
                                        'You can export your private key at any time for full self-custody',
                                        'The wallet also needs a small amount of SOL for transaction fees (fractions of a cent per transfer)',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-primary mt-1 shrink-0">▸</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 mt-6 tracking-widest">ONE ACTIVE DAGET AT A TIME</p>
                                <p>
                                    You can only have <strong className="text-white">one active Daget at a time</strong> (for instant modes — Fixed and Random). You need to stop or wait for your current Daget to complete before creating a new one. Raffles have their own separate slot, so you can run one raffle alongside one instant giveaway.
                                </p>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 mt-6 tracking-widest">ROLE GATING</p>
                                <p>
                                    When creating a Daget, you select which <strong className="text-white">Discord roles</strong> are eligible to claim. Only members who hold at least one of the selected roles at the moment they click &quot;Claim&quot; will be allowed to proceed. Roles are verified in real-time against Discord&apos;s API, so there&apos;s no way to fake eligibility.
                                </p>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 mt-6 tracking-widest">STOPPING A DAGET</p>
                                <p>
                                    You can stop an active Daget at any time. This immediately prevents new claims. Any claims already submitted will still be processed. Unclaimed tokens remain in your managed wallet.
                                </p>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 mt-6 tracking-widest">FEES</p>
                                <p>
                                    Daget.fun currently charges <strong className="text-white">no platform fees</strong>. The only cost is Solana network gas fees for each token transfer — typically fractions of a cent per transaction. These are paid from your managed wallet&apos;s SOL balance.
                                </p>
                            </section>

                            {/* ══════════════════════════════════════════════════ */}
                            {/* 09 — FOR CLAIMERS */}
                            {/* ══════════════════════════════════════════════════ */}
                            <section id="section-09">
                                <h2 className="font-arcade text-xs text-primary mb-6 flex items-center gap-3">
                                    <span className="text-text-muted">09.</span> FOR CLAIMERS
                                </h2>

                                <p className="mb-4">
                                    If you&apos;re a community member looking to claim tokens from a Daget, here&apos;s what to know:
                                </p>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 tracking-widest">WHAT YOU NEED</p>
                                <ul className="list-none space-y-2 ml-4">
                                    {[
                                        'A Discord account that\'s a member of the server running the giveaway',
                                        'The required Discord role(s) for the specific Daget',
                                        'A Solana wallet address to receive tokens (any Solana wallet works — Phantom, Solflare, Backpack, etc.)',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-primary mt-1 shrink-0">▸</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 mt-6 tracking-widest">NO WALLET CONNECTION NEEDED</p>
                                <p>
                                    Unlike many crypto platforms, Daget.fun <strong className="text-white">never asks you to connect your wallet</strong>. You simply paste your Solana address into a text field. This means:
                                </p>
                                <ul className="list-none space-y-2 mt-3 ml-4">
                                    {[
                                        'No browser extensions required',
                                        'No transaction signing prompts',
                                        'No approval risks',
                                        'Works on any device — desktop, phone, tablet',
                                        'You can use a hardware wallet address without connecting the device',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-primary mt-1 shrink-0">▸</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 mt-6 tracking-widest">ONE CLAIM PER PERSON</p>
                                <p>
                                    Each Discord account can claim <strong className="text-white">once per Daget</strong>. This is enforced at the system level — there&apos;s no way around it, even if you try multiple times or from different devices.
                                </p>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 mt-6 tracking-widest">DOUBLE-CHECK YOUR ADDRESS</p>
                                <div className="bg-card-dark border border-border-dark/40 border-l-2 border-l-neon-magenta p-5 mt-2">
                                    <p className="text-[14px] leading-relaxed">
                                        <strong className="text-white">This is important:</strong> make sure your Solana wallet address is correct before claiming. Blockchain transactions are <strong className="text-neon-magenta">irreversible</strong>. If you provide the wrong address, the tokens are gone — nobody can recover them. Copy and paste your address directly from your wallet app.
                                    </p>
                                </div>

                                <p className="font-arcade text-[10px] text-text-muted mb-3 mt-6 tracking-widest">AFTER CLAIMING</p>
                                <p>
                                    Once you claim, the system queues your token transfer. Most transfers confirm within seconds. You&apos;ll see a transaction link that lets you verify the transfer on a Solana block explorer. Your tokens will appear in your wallet shortly after confirmation.
                                </p>
                            </section>

                            {/* ══════════════════════════════════════════════════ */}
                            {/* 10 — COMMON QUESTIONS */}
                            {/* ══════════════════════════════════════════════════ */}
                            <section id="section-10">
                                <h2 className="font-arcade text-xs text-primary mb-6 flex items-center gap-3">
                                    <span className="text-text-muted">10.</span> COMMON QUESTIONS
                                </h2>

                                <div className="space-y-6">
                                    {[
                                        {
                                            q: 'Is Daget.fun free to use?',
                                            a: 'Yes. There are no platform fees. The only cost is Solana network gas fees for each token transfer, which are typically fractions of a cent. These are paid from the creator\'s managed wallet.',
                                        },
                                        {
                                            q: 'Do I need to install anything to claim tokens?',
                                            a: 'No. You just need a web browser, a Discord account, and a Solana wallet address. No browser extensions, no wallet connections, no app downloads.',
                                        },
                                        {
                                            q: 'What happens if I enter the wrong wallet address?',
                                            a: 'Blockchain transactions are irreversible. If you provide an incorrect Solana address, the tokens cannot be recovered. Always copy and paste your address directly from your wallet app.',
                                        },
                                        {
                                            q: 'How long does it take to receive tokens?',
                                            a: 'Most transfers confirm within a few seconds. In rare cases of Solana network congestion, it might take a bit longer, but the system automatically retries if needed.',
                                        },
                                        {
                                            q: 'Can I claim the same Daget twice?',
                                            a: 'No. Each Discord account can claim once per Daget. This is enforced at the system level and cannot be bypassed.',
                                        },
                                        {
                                            q: 'What if I don\'t have the required Discord role?',
                                            a: 'You won\'t be able to claim. Roles are verified in real-time against Discord\'s API at the moment you attempt to claim. Contact the server admin if you believe you should have the role.',
                                        },
                                        {
                                            q: 'Can I create multiple Dagets at the same time?',
                                            a: 'You can have one active instant giveaway (Fixed or Random) and one active raffle running simultaneously. You need to stop or complete the current one before creating another of the same type.',
                                        },
                                        {
                                            q: 'Is the raffle draw really fair?',
                                            a: 'Yes. Raffle draws use drand, a distributed public randomness beacon. The randomness is generated by a network of independent organizations and is publicly verifiable. Neither Daget.fun nor the creator can influence the outcome.',
                                        },
                                        {
                                            q: 'What tokens does Daget.fun support?',
                                            a: 'Currently USDC, USDT (both stablecoins pegged to the US Dollar), and SOL (Solana\'s native token). All on the Solana blockchain.',
                                        },
                                        {
                                            q: 'Where can I learn more about the legal terms?',
                                            a: 'Check our Terms of Use and Privacy Policy, both accessible from the footer of any page.',
                                        },
                                    ].map((faq, i) => (
                                        <div key={i} className="bg-card-dark border border-border-dark/40 p-5">
                                            <p className="text-white font-mono text-[14px] font-bold mb-2 flex items-start gap-3">
                                                <span className="text-primary shrink-0">Q.</span>
                                                {faq.q}
                                            </p>
                                            <p className="text-text-secondary text-[14px] leading-relaxed ml-7">
                                                {faq.a}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 text-center">
                                    <p className="text-text-muted text-[13px]">
                                        Still have questions? Reach out through our{' '}
                                        <a href="https://x.com/dagetdotfun" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 transition-colors">
                                            Twitter
                                        </a>
                                        {' '}or email us at{' '}
                                        <span className="text-primary">support@daget.fun</span>.
                                    </p>
                                </div>
                            </section>

                        </div>
                    </div>
                </div>
            </main>

            {/* ─── FOOTER ─── */}
            <footer className="py-16 border-t-4 border-border-dark">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-12">
                        <div className="flex items-center gap-4">
                            <img src="/images/dagetfun_logo.png" alt="Daget.fun" className="w-10 h-10 rounded" />
                        </div>
                        <div className="flex flex-wrap justify-center gap-8 font-mono text-[10px] tracking-widest uppercase items-center">
                            <Link className="text-white hover:text-primary transition-colors px-3 py-1 arcade-border-cyan bg-background-dark" href="/terms">TERMS OF USE</Link>
                            <Link className="text-white hover:text-neon-magenta transition-colors px-3 py-1 arcade-border-magenta bg-background-dark" href="/privacy">PRIVACY POLICY</Link>
                            <span className="text-primary px-3 py-1 arcade-border-cyan bg-background-dark">DOCS</span>
                            <a className="text-text-muted hover:text-primary transition-colors" href="https://x.com/dagetdotfun" target="_blank" rel="noopener noreferrer">[ TWITTER ]</a>
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
