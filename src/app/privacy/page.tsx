'use client';

import Link from 'next/link';

const sections = [
    { id: '01', title: 'WHO WE ARE' },
    { id: '02', title: 'WHAT WE COLLECT' },
    { id: '03', title: 'HOW WE USE YOUR DATA' },
    { id: '04', title: 'DISCORD & OAUTH' },
    { id: '05', title: 'BLOCKCHAIN DATA' },
    { id: '06', title: 'MANAGED WALLETS' },
    { id: '07', title: 'DATA SHARING' },
    { id: '08', title: 'DATA RETENTION' },
    { id: '09', title: 'SECURITY' },
    { id: '10', title: 'COOKIES' },
    { id: '11', title: 'YOUR RIGHTS' },
    { id: '12', title: 'CHILDREN' },
    { id: '13', title: 'POLICY CHANGES' },
    { id: '14', title: 'CONTACT US' },
];

export default function PrivacyPolicyPage() {
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
                        <div className="inline-block px-4 py-1 mb-6 arcade-border-magenta bg-background-dark">
                            <span className="font-arcade text-[10px] text-neon-magenta">LEGAL_DOC // v1.0</span>
                        </div>
                        <h1 className="font-arcade text-2xl md:text-4xl text-white mb-4">PRIVACY POLICY</h1>
                        <p className="font-mono text-sm text-text-muted uppercase tracking-tighter">
                            Last Updated: February 18, 2026
                        </p>
                        <p className="font-mono text-xs text-text-muted mt-2 max-w-xl mx-auto leading-relaxed">
                            We keep this short and honest. Here&apos;s exactly what we collect, why we collect it, and what we do with it.
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
                                            className="flex items-center gap-2 text-[10px] font-mono text-text-muted hover:text-neon-magenta transition-colors py-1 border-l-2 border-transparent hover:border-neon-magenta pl-2"
                                        >
                                            <span className="text-border-dark">{s.id}.</span>
                                            {s.title}
                                        </a>
                                    ))}
                                </nav>
                            </div>
                        </aside>

                        {/* ─── CONTENT ─── */}
                        <div className="flex-1 space-y-12 text-[15px] leading-[1.9] text-text-secondary">

                            {/* 01 */}
                            <section id="section-01">
                                <h2 className="font-arcade text-xs text-neon-magenta mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">01.</span> WHO WE ARE
                                </h2>
                                <p>
                                    Daget.fun is a web platform that enables Discord community managers to run role-gated token giveaways on the Solana blockchain. When we say &quot;we,&quot; &quot;us,&quot; or &quot;our,&quot; we mean the operators of Daget.fun.
                                </p>
                                <p className="mt-3">
                                    This Privacy Policy explains what personal information we collect when you use our Platform, why we collect it, how we use it, and what rights you have over it. It applies to all users — creators and claimers alike.
                                </p>
                            </section>

                            {/* 02 */}
                            <section id="section-02">
                                <h2 className="font-arcade text-xs text-neon-magenta mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">02.</span> WHAT WE COLLECT
                                </h2>
                                <p>We collect only what we actually need to run the Platform. Here&apos;s the full picture:</p>

                                <div className="mt-4 space-y-4">
                                    <div className="bg-card-dark border border-border-dark/40 border-l-2 border-l-primary p-5">
                                        <p className="font-arcade text-[10px] text-primary mb-3">FROM DISCORD (WHEN YOU SIGN IN)</p>
                                        <ul className="list-none space-y-2">
                                            {[
                                                'Your Discord user ID, username, and avatar URL.',
                                                'A list of Discord servers (guilds) you belong to.',
                                                'Your membership roles within those servers.',
                                                'A login token from Discord, used only to verify your roles when you claim a Daget. It is not stored permanently.',
                                            ].map((item, i) => (
                                                <li key={i} className="flex items-start gap-3 text-[14px]">
                                                    <span className="text-primary mt-1 shrink-0">▸</span>
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="bg-card-dark border border-border-dark/40 border-l-2 border-l-neon-magenta p-5">
                                        <p className="font-arcade text-[10px] text-neon-magenta mb-3">FROM CREATORS (WHEN YOU CREATE A DAGET)</p>
                                        <ul className="list-none space-y-2">
                                            {[
                                                'Giveaway configuration data: token type, pool amount, winner count, distribution mode, eligible roles.',
                                                'Your managed wallet\'s public address.',
                                                'The encrypted private key of your managed wallet (stored securely in our database).',
                                            ].map((item, i) => (
                                                <li key={i} className="flex items-start gap-3 text-[14px]">
                                                    <span className="text-neon-magenta mt-1 shrink-0">▸</span>
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="bg-card-dark border border-border-dark/40 border-l-2 border-l-primary p-5">
                                        <p className="font-arcade text-[10px] text-primary mb-3">FROM CLAIMERS (WHEN YOU CLAIM A DAGET)</p>
                                        <ul className="list-none space-y-2">
                                            {[
                                                'Your Discord user ID (used to make sure each person can only claim once per Daget).',
                                                'Your Solana wallet address (the address you provide to receive tokens). This address is saved to your profile as a convenience so you don\'t have to re-enter it on future claims.',
                                                'The Solana transaction signature of your claim (public, onchain record).',
                                                'The timestamp and amount of your claim.',
                                            ].map((item, i) => (
                                                <li key={i} className="flex items-start gap-3 text-[14px]">
                                                    <span className="text-primary mt-1 shrink-0">▸</span>
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="bg-card-dark border border-border-dark/40 border-l-2 border-l-primary p-5">
                                        <p className="font-arcade text-[10px] text-primary mb-3">AUTOMATICALLY (TECHNICAL DATA)</p>
                                        <ul className="list-none space-y-2">
                                            {[
                                                'IP address and browser/device type (for security and abuse prevention).',
                                                'Session data and authentication tokens.',
                                                'Basic usage logs (page visits, API requests) for debugging and performance monitoring.',
                                            ].map((item, i) => (
                                                <li key={i} className="flex items-start gap-3 text-[14px]">
                                                    <span className="text-primary mt-1 shrink-0">▸</span>
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <p className="mt-4">
                                    We do <strong className="text-white">not</strong> collect: your real name, email address (unless you contact us directly), payment card information, or any data from your Discord messages or DMs.
                                </p>
                            </section>

                            {/* 03 */}
                            <section id="section-03">
                                <h2 className="font-arcade text-xs text-neon-magenta mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">03.</span> HOW WE USE YOUR DATA
                                </h2>
                                <p>We use the data we collect for these specific purposes — nothing else:</p>
                                <ul className="list-none space-y-2 mt-3 ml-4">
                                    {[
                                        { purpose: 'Authenticating you', detail: 'Your Discord identity is your login. We verify it on every session.' },
                                        { purpose: 'Verifying eligibility', detail: 'We check your Discord roles in real-time when you attempt to claim a Daget.' },
                                        { purpose: 'Processing claims', detail: 'We use your Solana address to send tokens and record the transaction.' },
                                        { purpose: 'Preventing abuse', detail: 'We use your Discord ID to enforce one-claim-per-person per Daget.' },
                                        { purpose: 'Operating managed wallets', detail: 'We store your encrypted private key to facilitate automated token distributions.' },
                                        { purpose: 'Security and debugging', detail: 'Technical logs help us identify and fix issues, detect fraud, and keep the Platform stable.' },
                                        { purpose: 'Legal compliance', detail: 'We may process data as required by applicable law or to respond to valid legal requests.' },
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-neon-magenta mt-1 shrink-0">▸</span>
                                            <span>
                                                <strong className="text-white">{item.purpose}:</strong> {item.detail}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-3">
                                    We do not sell your data. We do not use your data for advertising. We do not build profiles on you beyond what is necessary to run the Platform.
                                </p>
                            </section>

                            {/* 04 */}
                            <section id="section-04">
                                <h2 className="font-arcade text-xs text-neon-magenta mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">04.</span> DISCORD & OAUTH
                                </h2>
                                <p>
                                    Our authentication is built on Discord&apos;s OAuth2 system. When you click &quot;Login with Discord,&quot; you&apos;re redirected to Discord&apos;s own authorization page, where you decide what permissions to grant us.
                                </p>
                                <p className="mt-3">
                                    The permissions we request are: <strong className="text-white">identify</strong> (your user ID, username, avatar), <strong className="text-white">guilds</strong> (list of servers you&apos;re in), and <strong className="text-white">guilds.members.read</strong> (your roles in those servers). We request the minimum permissions needed to do our job.
                                </p>
                                <p className="mt-3">
                                    We store your Discord user ID and username in our database. Your OAuth access token is used to make API calls to Discord on your behalf (specifically to verify your roles at claim time) and is not stored permanently — it&apos;s tied to your session.
                                </p>
                                <p className="mt-3">
                                    You can revoke our access to your Discord account at any time through Discord&apos;s{' '}
                                    <a
                                        href="https://discord.com/settings/authorized-apps"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-neon-magenta underline hover:text-neon-magenta/80 transition-colors"
                                    >
                                        Authorized Apps settings
                                    </a>
                                    . Revoking access will prevent you from using the Platform until you re-authenticate.
                                </p>
                            </section>

                            {/* 05 */}
                            <section id="section-05">
                                <h2 className="font-arcade text-xs text-neon-magenta mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">05.</span> BLOCKCHAIN DATA
                                </h2>
                                <div className="bg-card-dark border border-border-dark/40 border-l-2 border-l-neon-magenta p-6">
                                    <p className="font-arcade text-[10px] text-neon-magenta mb-3 tracking-widest">⚠ IMPORTANT — BLOCKCHAIN IS PUBLIC</p>
                                    <p>
                                        Every token transfer processed through Daget.fun is recorded as a transaction on the Solana blockchain. This means the following information is <strong className="text-white">permanently public and visible to anyone</strong>:
                                    </p>
                                    <ul className="list-none space-y-2 mt-3 ml-4">
                                        {[
                                            'The sender\'s wallet address (the managed wallet).',
                                            'The recipient\'s wallet address (your Solana address).',
                                            'The token type and amount transferred.',
                                            'The transaction timestamp.',
                                            'The transaction signature (which can be looked up on any Solana explorer).',
                                        ].map((item, i) => (
                                            <li key={i} className="flex items-start gap-3 text-[14px]">
                                                <span className="text-neon-magenta mt-1 shrink-0">!</span>
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="mt-3 text-[14px]">
                                        We have no ability to delete or modify blockchain records. If you provide a Solana wallet address to claim tokens, that address and the associated transaction will be permanently visible on the public ledger. Use a wallet address you are comfortable making public.
                                    </p>
                                </div>
                            </section>

                            {/* 06 */}
                            <section id="section-06">
                                <h2 className="font-arcade text-xs text-neon-magenta mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">06.</span> MANAGED WALLETS & KEY STORAGE
                                </h2>
                                <p>
                                    For giveaway creators, we generate a Solana keypair (a public address and a private key) on your behalf. Here&apos;s exactly how the key is handled:
                                </p>
                                <ul className="list-none space-y-2 mt-3 ml-4">
                                    {[
                                        'The private key is encrypted immediately upon generation before it is ever stored.',
                                        'The encrypted key is stored in our database. The key needed to decrypt it is kept separately and is never stored alongside it.',
                                        'The private key is only ever decrypted for a split second when a valid claim is being processed — just long enough to sign the outgoing transaction. It is not logged or retained in that form.',
                                        'No member of our team can access your key in plaintext through normal operational tooling.',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-neon-magenta mt-1 shrink-0">▸</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-3">
                                    We want to be honest about the trade-off: this architecture means you don&apos;t have to manage keys yourself to run a giveaway, but it does mean you are trusting our infrastructure. That&apos;s a reasonable trade-off for a giveaway tool — it&apos;s the same model used by exchange hot wallets, payment processors, and many other services that automate transactions on your behalf.
                                </p>
                                <p className="mt-3">
                                    You can export your private key at any time through the dashboard. We strongly recommend doing this and storing it securely offline. If you export and self-custody your key, you retain full control of the wallet independent of our Platform.
                                </p>
                                <div className="bg-card-dark border border-border-dark/40 border-l-4 border-l-primary p-5 mt-4">
                                    <p className="text-[14px]">
                                        <strong className="text-white">Our recommendation:</strong> Only keep in your managed wallet what you need for active giveaways. After a giveaway completes, withdraw any remaining balance to a wallet you fully control. The managed wallet is an operational account, not a savings account — and that&apos;s by design, not by limitation.
                                    </p>
                                </div>
                            </section>

                            {/* 07 */}
                            <section id="section-07">
                                <h2 className="font-arcade text-xs text-neon-magenta mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">07.</span> DATA SHARING
                                </h2>
                                <p>
                                    We do not sell, rent, or trade your personal information. We share data only in the following limited circumstances:
                                </p>
                                <ul className="list-none space-y-3 mt-3 ml-4">
                                    {[
                                        {
                                            title: 'Service providers',
                                            detail: 'We use Supabase for our database and authentication infrastructure. They process data on our behalf under strict data processing agreements. We do not share more data with them than is necessary.',
                                        },
                                        {
                                            title: 'Discord',
                                            detail: 'We make API calls to Discord to verify your roles. Discord\'s own privacy policy governs how they handle data on their end.',
                                        },
                                        {
                                            title: 'The Solana blockchain',
                                            detail: 'Transaction data (wallet addresses, amounts, timestamps) is broadcast to the public Solana network as part of processing claims. This is inherent to how blockchain works.',
                                        },
                                        {
                                            title: 'Legal requirements',
                                            detail: 'We may disclose data if required by law, court order, or government authority — or if we believe disclosure is necessary to protect the rights, property, or safety of Daget.fun, our users, or the public.',
                                        },
                                        {
                                            title: 'Business transfers',
                                            detail: 'If Daget.fun is acquired, merged, or its assets are transferred, your data may be part of that transfer. We will notify you before your data becomes subject to a different privacy policy.',
                                        },
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-neon-magenta mt-1 shrink-0">▸</span>
                                            <span>
                                                <strong className="text-white">{item.title}:</strong> {item.detail}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            {/* 08 */}
                            <section id="section-08">
                                <h2 className="font-arcade text-xs text-neon-magenta mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">08.</span> DATA RETENTION
                                </h2>
                                <p>
                                    We keep your data for as long as your account is active or as long as we need it to provide the Platform. Here&apos;s how that breaks down:
                                </p>
                                <ul className="list-none space-y-2 mt-3 ml-4">
                                    {[
                                        'Account data (Discord ID, username): retained while your account exists. Deleted upon verified account deletion request.',
                                        'Claim records: retained indefinitely for audit and dispute resolution purposes. Note that the underlying blockchain transaction is permanent regardless.',
                                        'Managed wallet keys: retained until you delete your account or explicitly request deletion. We recommend exporting your key before requesting deletion.',
                                        'Technical logs: retained for up to 90 days for security and debugging purposes, then deleted.',
                                        'OAuth tokens: session-scoped. Not stored permanently.',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-neon-magenta mt-1 shrink-0">▸</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            {/* 09 */}
                            <section id="section-09">
                                <h2 className="font-arcade text-xs text-neon-magenta mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">09.</span> SECURITY
                                </h2>
                                <p>
                                    We take security seriously. The measures we implement include:
                                </p>
                                <ul className="list-none space-y-2 mt-3 ml-4">
                                    {[
                                        'Encryption of managed wallet private keys at rest.',
                                        'HTTPS/TLS encryption for all data in transit.',
                                        'Access controls limiting which systems and personnel can interact with sensitive data.',
                                        'Rate limiting and abuse detection on API endpoints.',
                                        'Regular security reviews of our infrastructure.',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-neon-magenta mt-1 shrink-0">▸</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-3">
                                    That said, no system is perfectly secure. We cannot guarantee that our security measures will prevent every possible breach. If a security incident occurs that affects your data, we will notify you as required by applicable law.
                                </p>
                                <p className="mt-3">
                                    If you discover a security vulnerability, please report it to <span className="text-neon-magenta">security@daget.fun</span> before disclosing it publicly. We appreciate responsible disclosure.
                                </p>
                            </section>

                            {/* 10 */}
                            <section id="section-10">
                                <h2 className="font-arcade text-xs text-neon-magenta mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">10.</span> COOKIES & LOCAL STORAGE
                                </h2>
                                <p>
                                    We use cookies and browser local storage to keep you logged in and to maintain your session. These are strictly functional cookies — they are necessary for the Platform to work and cannot be opted out of without logging out.
                                </p>
                                <p className="mt-3">
                                    To be explicit: <strong className="text-white">we do not use Google Analytics, Meta Pixel, Hotjar, or any other third-party behavioral tracking or advertising tools.</strong> We do not track you across other websites. We do not build advertising profiles.
                                </p>
                                <p className="mt-3">
                                    Specifically, we store:
                                </p>
                                <ul className="list-none space-y-2 mt-3 ml-4">
                                    {[
                                        'A session token (via Supabase Auth) that keeps you logged in across page loads. This expires when you log out or after a period of inactivity.',
                                        'Basic UI preferences (if any) stored locally in your browser — never sent to our servers.',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-neon-magenta mt-1 shrink-0">▸</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-3">
                                    You can clear cookies and local storage through your browser settings at any time. Doing so will log you out of the Platform.
                                </p>
                            </section>

                            {/* 11 */}
                            <section id="section-11">
                                <h2 className="font-arcade text-xs text-neon-magenta mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">11.</span> YOUR RIGHTS
                                </h2>
                                <p>
                                    Depending on where you live, you may have certain rights over your personal data. We respect these rights regardless of your jurisdiction:
                                </p>
                                <ul className="list-none space-y-3 mt-3 ml-4">
                                    {[
                                        {
                                            right: 'Access',
                                            detail: 'You can request a copy of the personal data we hold about you.',
                                        },
                                        {
                                            right: 'Correction',
                                            detail: 'If any data we hold is inaccurate, you can ask us to correct it.',
                                        },
                                        {
                                            right: 'Deletion',
                                            detail: 'You can request that we delete your account and associated data. Note that blockchain records cannot be deleted — they are permanent by design.',
                                        },
                                        {
                                            right: 'Portability',
                                            detail: 'You can request your data in a machine-readable format.',
                                        },
                                        {
                                            right: 'Objection',
                                            detail: 'You can object to certain types of processing, where applicable.',
                                        },
                                        {
                                            right: 'Revocation',
                                            detail: 'You can revoke Discord OAuth access at any time through Discord\'s Authorized Apps settings.',
                                        },
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-neon-magenta mt-1 shrink-0">▸</span>
                                            <span>
                                                <strong className="text-white">{item.right}:</strong> {item.detail}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-3">
                                    To exercise any of these rights, email us at <span className="text-neon-magenta">privacy@daget.fun</span>. We will respond within 30 days. We may need to verify your identity before processing your request.
                                </p>
                            </section>

                            {/* 12 */}
                            <section id="section-12">
                                <h2 className="font-arcade text-xs text-neon-magenta mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">12.</span> CHILDREN
                                </h2>
                                <p>
                                    Daget.fun is not intended for anyone under the age of 18. We do not knowingly collect personal information from minors. If we become aware that a user is under 18, we will terminate their account and delete their data promptly.
                                </p>
                                <p className="mt-3">
                                    If you believe a minor has created an account on our Platform, please contact us at <span className="text-neon-magenta">legal@daget.fun</span>.
                                </p>
                            </section>

                            {/* 13 */}
                            <section id="section-13">
                                <h2 className="font-arcade text-xs text-neon-magenta mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">13.</span> POLICY CHANGES
                                </h2>
                                <p>
                                    We may update this Privacy Policy from time to time. When we do, the &quot;Last Updated&quot; date at the top of this page will change. For significant changes — like new types of data collection or new sharing practices — we&apos;ll make an effort to notify you through the Platform or via Discord.
                                </p>
                                <p className="mt-3">
                                    Continuing to use Daget.fun after a policy update means you accept the revised policy. If you don&apos;t agree with the changes, stop using the Platform and contact us to request data deletion.
                                </p>
                            </section>

                            {/* 14 */}
                            <section id="section-14">
                                <h2 className="font-arcade text-xs text-neon-magenta mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">14.</span> CONTACT US
                                </h2>
                                <p>
                                    Privacy questions, data requests, or concerns — we&apos;re reachable at:
                                </p>
                                <div className="bg-card-dark border border-border-dark/40 p-6 mt-4 space-y-2">
                                    <p className="flex items-center gap-3 text-[14px]">
                                        <span className="text-neon-magenta font-arcade text-[10px]">EMAIL</span>
                                        <span className="text-white">privacy@daget.fun</span>
                                    </p>
                                    <p className="flex items-center gap-3 text-[14px]">
                                        <span className="text-neon-magenta font-arcade text-[10px]">LEGAL</span>
                                        <span className="text-white">legal@daget.fun</span>
                                    </p>
                                    <p className="flex items-center gap-3 text-[14px]">
                                        <span className="text-neon-magenta font-arcade text-[10px]">SECURITY</span>
                                        <span className="text-white">security@daget.fun</span>
                                    </p>
                                </div>
                                <p className="mt-4">
                                    We aim to respond to all privacy-related inquiries within 30 days. For urgent security matters, please mark your email accordingly.
                                </p>
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
                            <span className="text-neon-magenta px-3 py-1 arcade-border-magenta bg-background-dark">PRIVACY POLICY</span>
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
