'use client';

import Link from 'next/link';

const sections = [
    { id: '01', title: 'AGREEMENT TO TERMS' },
    { id: '02', title: 'WHAT DAGET.FUN IS' },
    { id: '03', title: 'ELIGIBILITY' },
    { id: '04', title: 'DISCORD AUTHENTICATION' },
    { id: '05', title: 'MANAGED WALLETS' },
    { id: '06', title: 'CREATING DAGETS' },
    { id: '07', title: 'CLAIMING TOKENS' },
    { id: '08', title: 'FEES' },
    { id: '09', title: 'PROHIBITED CONDUCT' },
    { id: '10', title: 'INTELLECTUAL PROPERTY' },
    { id: '11', title: 'THIRD-PARTY SERVICES' },
    { id: '12', title: 'DISCLAIMERS' },
    { id: '13', title: 'LIMITATION OF LIABILITY' },
    { id: '14', title: 'INDEMNIFICATION' },
    { id: '15', title: 'TERMINATION' },
    { id: '16', title: 'GOVERNING LAW' },
    { id: '17', title: 'RISK ACKNOWLEDGMENT' },
    { id: '18', title: 'SEVERABILITY' },
    { id: '19', title: 'ENTIRE AGREEMENT' },
    { id: '20', title: 'CONTACT US' },
];

export default function TermsOfUsePage() {
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
                            <span className="font-arcade text-[10px] text-primary">LEGAL_DOC // v1.0</span>
                        </div>
                        <h1 className="font-arcade text-2xl md:text-4xl text-white mb-4">TERMS OF USE</h1>
                        <p className="font-mono text-sm text-text-muted uppercase tracking-tighter">
                            Last Updated: February 18, 2026
                        </p>
                        <p className="font-mono text-xs text-text-muted mt-2 max-w-xl mx-auto leading-relaxed">
                            Please read these Terms carefully before using the Platform, particularly the sections regarding Managed Wallets and Eligibility.
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
                        <div className="flex-1 space-y-12 text-[15px] leading-[1.9] text-text-secondary">

                            {/* 01 */}
                            <section id="section-01">
                                <h2 className="font-arcade text-xs text-primary mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">01.</span> AGREEMENT TO TERMS
                                </h2>
                                <p>
                                    By opening <strong className="text-white">daget.fun</strong> — whether you&apos;re browsing, creating a giveaway, or claiming tokens — you&apos;re agreeing to these Terms of Use. If you do not agree with any part of these Terms, you must discontinue use of the Platform immediately.
                                </p>
                                <p className="mt-3">
                                    These Terms apply to everyone: visitors, giveaway creators, and claimers. We may update them when needed. When we do, the &quot;Last Updated&quot; date at the top changes. For changes that materially affect your rights — such as new fees, changes to how managed wallet funds are handled, or changes to data rights — we will require explicit re-acknowledgment before you can continue using the Platform. For minor clarifications, continued use constitutes acceptance.
                                </p>
                                <p className="mt-3">
                                    When we say &quot;Daget.fun,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our,&quot; we mean the operators of the Daget.fun platform. For legal correspondence, the applicable contact jurisdiction is Singapore, reachable at <span className="text-primary">legal@daget.fun</span>. We will respond to formal legal notices within 14 business days.
                                </p>
                            </section>

                            {/* 02 */}
                            <section id="section-02">
                                <h2 className="font-arcade text-xs text-primary mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">02.</span> WHAT DAGET.FUN IS
                                </h2>
                                <p>
                                    Daget.fun is a web platform that lets Discord community managers distribute Solana-based stablecoins (currently USDC and USDT) to their members through role-gated giveaways called &quot;Dagets.&quot;
                                </p>
                                <p className="mt-3">
                                    The short version: a creator funds a giveaway, picks which Discord roles can participate, shares a link, and eligible members claim tokens directly to their Solana wallet. Everything happens onchain — no middlemen, no manual transfers.
                                </p>
                                <p className="mt-3">
                                    What Daget.fun is <strong className="text-white">not</strong>: we are not a bank, a money transmitter, a broker, an exchange, or an investment platform. We don&apos;t hold your money in the traditional sense, and we don&apos;t provide financial, tax, or legal advice. The Platform is a tool. What you do with it is on you.
                                </p>
                            </section>

                            {/* 03 */}
                            <section id="section-03">
                                <h2 className="font-arcade text-xs text-primary mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">03.</span> ELIGIBILITY
                                </h2>
                                <p>To use Daget.fun, you must:</p>
                                <ul className="list-none space-y-2 mt-3 ml-4">
                                    {[
                                        'Be at least 18 years old, or the legal age of majority in your jurisdiction — whichever is higher.',
                                        'Have a valid Discord account that is in good standing (not banned or restricted).',
                                        'Not be located in, or a citizen or resident of, any jurisdiction where blockchain-based token distribution is prohibited or restricted by law.',
                                        'Not appear on any governmental sanctions list or be subject to trade restrictions that would make your use of this Platform illegal.',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-primary mt-1 shrink-0">▸</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-3">
                                    By using the Platform, you&apos;re confirming that all of the above applies to you. We reserve the right to refuse access or terminate accounts that don&apos;t meet these requirements.
                                </p>
                            </section>

                            {/* 04 */}
                            <section id="section-04">
                                <h2 className="font-arcade text-xs text-primary mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">04.</span> DISCORD AUTHENTICATION
                                </h2>
                                <p>
                                    You sign in through Discord&apos;s OAuth2 system. We don&apos;t create a separate username or password for you — your Discord identity is your account on our Platform.
                                </p>
                                <p className="mt-3">
                                    When you authenticate, we request the following from Discord: your user ID, username, and avatar; a list of servers you belong to; and your membership roles within those servers. We use this data solely to verify your eligibility for role-gated giveaways. We don&apos;t read your messages, access your DMs, or do anything else with your Discord account.
                                </p>
                                <p className="mt-3">
                                    Your Discord account security is your responsibility. If someone else accesses your Discord account and uses it on our Platform, we cannot be held liable for their actions. We strongly recommend enabling two-factor authentication on your Discord account for enhanced security.
                                </p>
                            </section>

                            {/* 05 — MANAGED WALLETS — highlighted */}
                            <section id="section-05">
                                <h2 className="font-arcade text-xs text-primary mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">05.</span> MANAGED WALLETS
                                </h2>
                                <p>
                                    When you register as a giveaway creator, the Platform generates a Solana wallet on your behalf. This wallet is used to hold the tokens you deposit and to send them out when claims are processed automatically.
                                </p>
                                <p className="mt-3">
                                    Here&apos;s how it works technically: we generate a standard Solana keypair, encrypt the private key using industry-standard encryption, and store it in our database. The key is only decrypted at the moment a valid claim is processed — to sign the outgoing transaction. No human on our team accesses your key in plaintext during normal operations. The system is designed so that distributions happen only when you, the creator, have set up a Daget and a verified claimer triggers it.
                                </p>
                                <p className="mt-3">
                                    You can export your private key at any time through the dashboard and move it to a wallet you fully self-custody. We actively encourage this.
                                </p>

                                {/* Informational callout */}
                                <div className="bg-card-dark border border-border-dark/40 border-l-4 border-l-primary p-6 mt-4">
                                    <p className="font-arcade text-[10px] text-primary mb-3 tracking-widest">ℹ HOW TO USE YOUR MANAGED WALLET SAFELY</p>
                                    <p className="text-[14px] leading-relaxed">
                                        The managed wallet is designed as an <strong className="text-white">operational account</strong>, not a storage vault. The right way to use it: deposit what you need for a specific giveaway, run the giveaway, then withdraw any remaining balance back to a wallet you control.
                                    </p>
                                    <p className="mt-3 text-[14px] leading-relaxed">
                                        Think of it the same way you&apos;d think about a point-of-sale terminal at a shop — it holds today&apos;s float, not the whole business&apos;s savings. This isn&apos;t a limitation; it&apos;s the intended design. Keeping balances lean is simply good practice for any hot wallet, anywhere.
                                    </p>
                                </div>

                                <p className="mt-4">Other things you should know:</p>
                                <ul className="list-none space-y-2 mt-3 ml-4">
                                    {[
                                        'You retain full ownership of the funds you deposit. We do not commingle your funds with ours or with other users.',
                                        'Distributions only happen when a valid, verified claim is processed on a Daget you created. We cannot initiate transfers on your behalf for any other reason.',
                                        'You can export your private key at any time. Once exported, you have full self-custody and are not dependent on our Platform to access those funds.',
                                        'No system is completely immune to attack. We take reasonable precautions, but we are transparent that this is a hot wallet environment. Keep balances proportionate to your giveaway needs.',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-primary mt-1 shrink-0">▸</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            {/* 06 */}
                            <section id="section-06">
                                <h2 className="font-arcade text-xs text-primary mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">06.</span> CREATING DAGETS (GIVEAWAYS)
                                </h2>
                                <p>
                                    A &quot;Daget&quot; is a giveaway campaign you configure through the Platform. You set the token type, total pool amount, number of winners, distribution mode (fixed or random), and which Discord roles are eligible to claim.
                                </p>
                                <p className="mt-3">As a creator, you agree that:</p>
                                <ul className="list-none space-y-2 mt-3 ml-4">
                                    {[
                                        'You have the legal right to distribute the tokens you\'re giving away.',
                                        'You will not create a Daget with the intent to claim it yourself, or direct others acting on your behalf to claim it. Creators may not claim their own Dagets.',
                                        'You will ensure your managed wallet holds sufficient funds to cover the full giveaway pool before your Daget goes live. The Platform checks your wallet balance during Daget creation and will not allow you to proceed if funds are insufficient.',
                                        'You will not use the Platform to distribute proceeds of illegal activity or to get around sanctions.',
                                        'You are solely responsible for making sure your giveaway complies with the laws of your jurisdiction — including tax obligations, gambling regulations, and securities laws. We are not your lawyer.',
                                        'Once a claim is processed and a transaction is sent onchain, it is final. We cannot reverse blockchain transactions.',
                                        'You understand that network conditions, wallet balances, and other factors outside our control can affect distribution timing.',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-primary mt-1 shrink-0">▸</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-3">
                                    You can only have <strong className="text-white">one active Daget at a time</strong>. You must stop or wait for your current Daget to fully complete before creating a new one.
                                </p>
                            </section>

                            {/* 07 */}
                            <section id="section-07">
                                <h2 className="font-arcade text-xs text-primary mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">07.</span> CLAIMING TOKENS
                                </h2>
                                <p>If you&apos;re claiming tokens from a Daget, here&apos;s what you need to know:</p>
                                <ul className="list-none space-y-2 mt-3 ml-4">
                                    {[
                                        'You sign in with Discord and provide your Solana wallet address. You do not need to connect your wallet — just paste the address.',
                                        'Your Discord roles are verified in real-time against Discord\'s API at the moment of your claim. If you don\'t hold the required role at that moment, your claim will be rejected.',
                                        'Each Discord account can claim once per Daget. This is enforced at the system level — no workarounds.',
                                        'You may not claim a Daget that you created, or that was created by someone acting on your behalf.',
                                        'You are responsible for providing a correct Solana address. Tokens sent to the wrong address cannot be recovered by us or anyone else.',
                                        'Your wallet may need an Associated Token Account (ATA) for the token being distributed. This is a standard Solana requirement. If your wallet doesn\'t have one, the creator\'s wallet may cover the account creation fee.',
                                        'In "fixed mode," every claimer receives an equal share of the pool. In "random mode," each person receives a different amount — calculated by the system based on what\'s left in the pool and the variance range the creator set. In both modes, the amount is decided entirely by the system, not by the creator or the claimer.',
                                        'Each claim is processed exactly once — submitting the same claim twice will return the original result, not create a duplicate.',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-primary mt-1 shrink-0">▸</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            {/* 08 */}
                            <section id="section-08">
                                <h2 className="font-arcade text-xs text-primary mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">08.</span> FEES
                                </h2>
                                <p>
                                    Daget.fun currently charges no platform fees for creating or claiming giveaways. Every token distribution does involve a Solana network transaction, which requires a small amount of SOL for gas. These fees are paid from the creator&apos;s managed wallet and are typically fractions of a cent.
                                </p>
                                <p className="mt-3">
                                    We reserve the right to introduce platform fees in the future. If that happens, we&apos;ll give reasonable advance notice and update these Terms. Any fee changes will not apply retroactively to Dagets created before the change takes effect.
                                </p>
                            </section>

                            {/* 09 */}
                            <section id="section-09">
                                <h2 className="font-arcade text-xs text-primary mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">09.</span> PROHIBITED CONDUCT
                                </h2>
                                <p>You agree not to:</p>
                                <ul className="list-none space-y-2 mt-3 ml-4">
                                    {[
                                        'Use the Platform for money laundering, terrorism financing, fraud, or any other illegal activity.',
                                        'Create a Daget with no genuine intent to distribute tokens to real, eligible community members — including creating fake giveaways to harvest Discord identity data.',
                                        'Claim your own Daget, or coordinate with others to claim a Daget you created or funded.',
                                        'Attempt to manipulate or abuse the claim system — including using multiple Discord accounts, bots, or automated scripts to claim more than once.',
                                        'Interfere with, disrupt, or attempt to gain unauthorized access to the Platform\'s servers, databases, or infrastructure.',
                                        'Distribute tokens that represent securities, regulated financial instruments, or proceeds of criminal activity.',
                                        'Impersonate another person, misrepresent your identity, or create misleading or deceptive giveaways.',
                                        'Use the Platform in any way that violates Discord\'s Terms of Service or Solana\'s network policies.',
                                        'Reverse-engineer, decompile, or disassemble any part of the Platform\'s software.',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-neon-magenta mt-1 shrink-0">✕</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-3">
                                    Violations may result in immediate account suspension or termination, without prior notice. We may also report illegal activity to the appropriate authorities.
                                </p>
                            </section>

                            {/* 10 */}
                            <section id="section-10">
                                <h2 className="font-arcade text-xs text-primary mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">10.</span> INTELLECTUAL PROPERTY
                                </h2>
                                <p>
                                    Everything on Daget.fun — the name, logo, design, code, graphics, and text — belongs to Daget.fun or its licensors and is protected by applicable intellectual property laws.
                                </p>
                                <p className="mt-3">
                                    You get a limited, non-exclusive, non-transferable license to use the Platform for its intended purpose. You may not copy, modify, distribute, sell, or lease any part of the Platform without our prior written consent.
                                </p>
                                <p className="mt-3">
                                    Content you create on the Platform (like Daget titles and descriptions) remains yours. By posting it, you grant us a non-exclusive, royalty-free, worldwide license to display and use that content solely in connection with operating the Platform.
                                </p>
                            </section>

                            {/* 11 */}
                            <section id="section-11">
                                <h2 className="font-arcade text-xs text-primary mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">11.</span> THIRD-PARTY SERVICES
                                </h2>
                                <p>The Platform depends on third-party services, including:</p>
                                <ul className="list-none space-y-2 mt-3 ml-4">
                                    {[
                                        { name: 'Discord', desc: 'for authentication and role verification.' },
                                        { name: 'Solana blockchain', desc: 'for token transfers and onchain record-keeping.' },
                                        { name: 'Supabase', desc: 'for database and authentication infrastructure.' },
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-primary mt-1 shrink-0">▸</span>
                                            <span><strong className="text-white">{item.name}</strong> — {item.desc}</span>
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-3">
                                    We are not responsible for the availability, performance, or policies of these services. Outages, rate limits, or policy changes from Discord or the Solana network may affect your experience, and we are not liable for disruptions caused by third parties.
                                </p>
                            </section>

                            {/* 12 */}
                            <section id="section-12">
                                <h2 className="font-arcade text-xs text-primary mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">12.</span> DISCLAIMERS
                                </h2>
                                <div className="bg-card-dark border border-border-dark/40 border-l-2 border-l-neon-magenta p-6 mt-2">
                                    <p>
                                        <strong className="text-white">The Platform is provided &quot;as is&quot; and &quot;as available,&quot; without warranties of any kind — express or implied.</strong>
                                    </p>
                                    <p className="mt-3">
                                        We don&apos;t warrant that the Platform will be uninterrupted, error-free, or secure. We don&apos;t guarantee that token transfers will complete within any specific timeframe, because Solana network conditions are outside our control.
                                    </p>
                                    <p className="mt-3">
                                        We disclaim all implied warranties, including merchantability, fitness for a particular purpose, and non-infringement. Your use of the Platform is at your own risk.
                                    </p>
                                    <p className="mt-3">
                                        Daget.fun does not endorse, verify, or take responsibility for the legitimacy of any giveaway created by any user. We provide the infrastructure — creators are responsible for how they use it.
                                    </p>
                                </div>
                            </section>

                            {/* 13 */}
                            <section id="section-13">
                                <h2 className="font-arcade text-xs text-primary mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">13.</span> LIMITATION OF LIABILITY
                                </h2>
                                <p>
                                    To the maximum extent permitted by applicable law, Daget.fun, its operators, affiliates, directors, employees, and agents will not be liable for any indirect, incidental, special, consequential, or punitive damages, including:
                                </p>
                                <ul className="list-none space-y-2 mt-3 ml-4">
                                    {[
                                        'Loss of tokens, funds, or digital assets due to user error, incorrect wallet addresses, or smart contract failures.',
                                        'Loss resulting from unauthorized access to your Discord account or managed wallet.',
                                        'Damages from Solana network congestion, downtime, or failed transactions.',
                                        'Losses due to changes in the value of digital assets.',
                                        'Any interruption, suspension, or termination of the Platform.',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-primary mt-1 shrink-0">▸</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-3">
                                    In no event shall our total liability to you exceed the greater of: (a) the platform fees you&apos;ve paid us in the twelve months before the event giving rise to the claim, or (b) fifty US dollars ($50).
                                </p>
                                <p className="mt-3 text-[13px] text-text-muted">
                                    To be clear about why this cap exists: Daget.fun is currently a free platform. We charge no fees. A liability cap proportional to fees paid is standard practice for free-to-use software services — it reflects the economic reality that we cannot insure against losses that are orders of magnitude larger than our revenue. This is not a signal that we take security lightly; it&apos;s a standard clause that any free web service would include. The best protection against loss is following the managed wallet guidance in Section 05: keep balances minimal.
                                </p>
                            </section>

                            {/* 14 */}
                            <section id="section-14">
                                <h2 className="font-arcade text-xs text-primary mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">14.</span> INDEMNIFICATION
                                </h2>
                                <p>
                                    You agree to indemnify, defend, and hold harmless Daget.fun, its operators, affiliates, and their respective officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising from:
                                </p>
                                <ul className="list-none space-y-2 mt-3 ml-4">
                                    {[
                                        'Your use of the Platform or violation of these Terms.',
                                        'Any Daget you create, including claims that your giveaway violates any law or third-party rights.',
                                        'Your failure to comply with applicable laws or regulations.',
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-primary mt-1 shrink-0">▸</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            {/* 15 */}
                            <section id="section-15">
                                <h2 className="font-arcade text-xs text-primary mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">15.</span> TERMINATION
                                </h2>
                                <p>
                                    We may suspend or terminate your access to the Platform at any time, with or without cause. Reasons may include violations of these Terms, suspected fraudulent activity, or legal requirements.
                                </p>
                                <p className="mt-3">
                                    <strong className="text-white">Your wallet is always accessible before termination.</strong> The Platform provides a key export function in the dashboard at all times. When exporting or changing your managed wallet, the Platform displays a clear warning about the consequences of losing or sharing your private key. You are in full control of this process. We strongly recommend exporting your key proactively — do not wait until your account is at risk.
                                </p>
                                <p className="mt-3">
                                    When your access is terminated, your right to use the Platform stops immediately. Any tokens already distributed through completed claims remain onchain and are not affected. If you have exported your private key, you retain full access to any remaining wallet funds independent of our Platform.
                                </p>
                                <p className="mt-3">
                                    The following sections survive termination: Disclaimers, Limitation of Liability, Indemnification, and Governing Law.
                                </p>
                            </section>

                            {/* 16 */}
                            <section id="section-16">
                                <h2 className="font-arcade text-xs text-primary mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">16.</span> GOVERNING LAW & DISPUTE RESOLUTION
                                </h2>
                                <p>
                                    These Terms are governed by the laws of the Republic of Singapore, without regard to its conflict-of-law principles. We chose Singapore because it has a well-developed, internationally respected legal framework for technology and digital asset businesses, and because the Singapore International Arbitration Centre (SIAC) is recognized globally as a neutral, efficient forum for resolving disputes.
                                </p>
                                <p className="mt-3">
                                    Any dispute arising from these Terms or your use of the Platform shall be resolved through binding arbitration under the SIAC rules. Arbitration takes place in Singapore, conducted in English. Arbitration is generally faster and less expensive than court litigation — it&apos;s not designed to disadvantage you; it&apos;s designed to resolve things efficiently.
                                </p>
                                <p className="mt-3">
                                    You agree to bring any claims in your individual capacity only — not as part of a class action or representative proceeding. The arbitrator may not consolidate claims or preside over any class action.
                                </p>
                            </section>

                            {/* 17 */}
                            <section id="section-17">
                                <h2 className="font-arcade text-xs text-primary mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">17.</span> RISK ACKNOWLEDGMENT
                                </h2>
                                <div className="bg-card-dark border border-border-dark/40 border-l-2 border-l-neon-magenta p-6 mt-2">
                                    <p>By using Daget.fun, you expressly acknowledge and accept these risks:</p>
                                    <ul className="list-none space-y-2 mt-3 ml-4">
                                        {[
                                            'Blockchain transactions are irreversible. Tokens sent to the wrong address are gone.',
                                            'The Solana network may experience outages, congestion, or technical issues that delay or prevent transfers.',
                                            'Digital assets carry inherent risks: price volatility, regulatory uncertainty, and technological vulnerabilities.',
                                            'Regulatory changes in your jurisdiction may affect your ability to use the Platform or receive tokens.',
                                            'No system is immune to security breaches. While we implement industry-standard protections, you use the Platform at your own risk.',
                                            'Managed wallets are hot wallets. Do not store more in them than you need for active giveaways.',
                                        ].map((item, i) => (
                                            <li key={i} className="flex items-start gap-3">
                                                <span className="text-neon-magenta mt-1 shrink-0">!</span>
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </section>

                            {/* 18 */}
                            <section id="section-18">
                                <h2 className="font-arcade text-xs text-primary mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">18.</span> SEVERABILITY
                                </h2>
                                <p>
                                    If any part of these Terms is found to be invalid or unenforceable, that part will be modified to the minimum extent necessary to make it enforceable. The rest of the Terms remain in full force and effect.
                                </p>
                            </section>

                            {/* 19 */}
                            <section id="section-19">
                                <h2 className="font-arcade text-xs text-primary mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">19.</span> ENTIRE AGREEMENT
                                </h2>
                                <p>
                                    These Terms, together with our{' '}
                                    <Link href="/privacy" className="text-primary underline hover:text-primary/80 transition-colors">
                                        Privacy Policy
                                    </Link>
                                    , form the complete agreement between you and Daget.fun regarding your use of the Platform. They replace any prior agreements, conversations, or understandings — written or verbal.
                                </p>
                            </section>

                            {/* 20 */}
                            <section id="section-20">
                                <h2 className="font-arcade text-xs text-primary mb-4 flex items-center gap-3">
                                    <span className="text-text-muted">20.</span> CONTACT US
                                </h2>
                                <p>
                                    Questions about these Terms? Reach out through our Discord community or email us at{' '}
                                    <span className="text-primary">legal@daget.fun</span>.
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
                            <span className="text-primary px-3 py-1 arcade-border-cyan bg-background-dark">TERMS OF USE</span>
                            <Link className="text-white hover:text-neon-magenta transition-colors px-3 py-1 arcade-border-magenta bg-background-dark" href="/privacy">PRIVACY POLICY</Link>
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
