'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const DISCORD_SCOPES = 'identify guilds guilds.members.read';

const DiscordIcon = () => (
    <svg aria-hidden="true" className="w-6 h-6" viewBox="0 0 127.14 96.36" fill="currentColor">
        <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83A97.68 97.68 0 0 0 49 6.83 72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.27 8.14C2.79 32.65-1.71 56.54.54 80.09A105.73 105.73 0 0 0 32.71 96a77.7 77.7 0 0 0 6.89-11.27 68.42 68.42 0 0 1-10.82-5.16c.91-.66 1.8-1.34 2.66-2.05a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2.05a68.68 68.68 0 0 1-10.84 5.17A77 77 0 0 0 94.5 96a105.25 105.25 0 0 0 32.16-15.91c2.64-27.29-4.51-50.97-18.96-72.02ZM42.45 65.69C36.18 65.69 31 59.95 31 52.87s5-12.82 11.43-12.82S53.9 45.8 53.88 52.87C53.89 59.95 48.84 65.69 42.45 65.69Zm42.24 0c-6.27 0-11.43-5.74-11.43-12.82s5-12.82 11.43-12.82 11.46 5.75 11.43 12.82c0 7.08-5.04 12.82-11.43 12.82Z" />
    </svg>
);

export function DiscordLoginButton({
    label,
    className,
}: {
    label: string;
    className: string;
}) {
    const handleLogin = useCallback(async () => {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signInWithOAuth({
            provider: 'discord',
            options: {
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`,
                scopes: DISCORD_SCOPES,
            },
        });
    }, []);

    return (
        <button onClick={handleLogin} className={className}>
            <DiscordIcon />
            {label}
        </button>
    );
}

export function DashboardLinkIfSignedIn() {
    const [hasSession, setHasSession] = useState(false);

    useEffect(() => {
        const supabase = createSupabaseBrowserClient();
        supabase.auth.getSession().then(({ data }) => {
            setHasSession(Boolean(data.session));
        });
    }, []);

    if (!hasSession) return null;

    return (
        <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-2 arcade-border-cyan text-[10px] font-arcade text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
        >
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full bg-neon-cyan opacity-75" />
                <span className="relative inline-flex h-2 w-2 bg-neon-cyan" />
            </span>
            DASHBOARD
        </Link>
    );
}
