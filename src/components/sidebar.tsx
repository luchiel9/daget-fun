'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState } from 'react';

import { TopNavbar } from './top-navbar';

const navItems = [
    { href: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { href: '/dagets', icon: 'redeem', label: 'My Dagets' },
    { href: '/claims', icon: 'account_balance_wallet', label: 'My Claims' },
    { href: '/notifications', icon: 'notifications', label: 'Notifications' },
];

const UserContext = React.createContext<{
    user: any;
    isMobileMenuOpen: boolean;
    toggleMobileMenu: () => void;
    discordUsername?: string | null;
    discordAvatarUrl?: string | null;
    walletPublicKey?: string | null;
    hasWallet?: boolean;
    finishedGuide?: boolean;
} | null>(null);

export const useUser = () => {
    const context = React.useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within an AppShell');
    }
    return context;
};

export function Sidebar() {
    const { user, isMobileMenuOpen, toggleMobileMenu } = useUser();
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = React.useState(0);

    React.useEffect(() => {
        const fetchUnread = () => {
            fetch('/api/notifications/unread-count')
                .then(r => r.json())
                .then(data => setUnreadCount(data.count || 0))
                .catch(() => { });
        };

        fetchUnread();
        const interval = setInterval(fetchUnread, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    // Listen for custom event to update count immediately when reading
    React.useEffect(() => {
        const handleUpdate = () => {
            fetch('/api/notifications/unread-count')
                .then(r => r.json())
                .then(data => setUnreadCount(data.count || 0));
        };
        window.addEventListener('notifications-updated', handleUpdate);
        return () => window.removeEventListener('notifications-updated', handleUpdate);
    }, []);

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
                    onClick={toggleMobileMenu}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed md:static inset-y-0 left-0 z-50
                w-64 flex-col border-r border-border-dark/60 bg-card-dark
                transform transition-transform duration-200 ease-in-out
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0 md:flex
            `}>
                <Link href="/" className="p-6 pb-2 flex items-center justify-center gap-3 hover:opacity-80 transition-opacity">
                    <img src="/images/dagetfun_logo.png" alt="Daget.fun" className="w-8 h-8 rounded-lg" />
                    <div className="inline-block px-3 py-1 bg-transparent arcade-border-magenta leading-none">
                        <h1 className="font-arcade text-sm text-neon-magenta animate-pulse tracking-widest leading-none">DAGET.FUN</h1>
                    </div>
                </Link>
                <nav className="flex-1 px-4 space-y-1 mt-4">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => isMobileMenuOpen && toggleMobileMenu()}
                                className={`nav-icon-hover flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive ? 'nav-active bg-primary/10 text-primary font-medium' : 'text-text-secondary hover:text-primary hover:bg-primary/5'}`}
                            >
                                <div className="relative flex items-center justify-center">
                                    <span className="material-icons text-[20px]">{item.icon}</span>
                                    {item.label === 'Notifications' && unreadCount > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center border border-card-dark">
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </span>
                                    )}
                                </div>
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </aside>
        </>
    );
}

export function AppShell({ children, user }: { children: React.ReactNode; user: any }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    const userContextValue = {
        user,
        isMobileMenuOpen,
        toggleMobileMenu,
        // Helper accessors for backward compatibility if needed, though clean up is better
        discordUsername: user?.discordUsername,
        discordAvatarUrl: user?.discordAvatarUrl,
        walletPublicKey: user?.walletPublicKey,
        hasWallet: !!user?.walletPublicKey,
        finishedGuide: user?.finishedGuide,
    };

    return (
        <UserContext.Provider value={userContextValue}>
            <div className="flex h-screen overflow-hidden bg-background-dark text-text-primary font-display transition-colors duration-300">
                <Sidebar />
                <main className="flex-1 flex flex-col overflow-hidden w-full relative">
                    <TopNavbar />
                    {children}
                </main>
            </div>
        </UserContext.Provider>
    );
}
