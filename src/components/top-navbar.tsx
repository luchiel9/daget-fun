'use client';

import { usePathname } from 'next/navigation';
import { useUser } from './sidebar';

export function TopNavbar() {
    const { user, toggleMobileMenu } = useUser();
    const pathname = usePathname();

    const handleLogout = async () => {
        await fetch('/api/auth/session', { method: 'DELETE' });
        window.location.href = '/';
    };

    // Get page title based on pathname
    const getPageTitle = () => {
        if (pathname === '/dashboard') return 'Dashboard';
        if (pathname === '/dagets') return 'My Dagets';
        if (pathname.startsWith('/dagets/')) return 'Daget Details';
        if (pathname === '/claims') return 'My Claims';
        if (pathname === '/notifications') return 'Notifications';
        if (pathname === '/create') return 'Create Daget';
        return 'Dashboard';
    };

    const discordUsername = user?.discordUsername || 'SolanaDev.sol';
    const walletPublicKey = user?.walletPublicKey;

    function truncateAddress(addr: string, start = 4, end = 4): string {
        if (!addr || addr.length <= start + end + 3) return addr || '';
        return `${addr.slice(0, start)}...${addr.slice(-end)}`;
    }

    return (
        <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-border-dark/40 bg-card-dark/50 backdrop-blur-md flex-shrink-0">
            <div className="flex items-center gap-3">
                <button
                    onClick={toggleMobileMenu}
                    className="md:hidden p-1 -ml-2 text-text-secondary hover:text-primary transition-colors"
                >
                    <span className="material-icons">menu</span>
                </button>
                <h2 className="text-lg font-bold text-text-primary">{getPageTitle()}</h2>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-background-dark border border-border-dark/60">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                        {user?.discordAvatarUrl ? (
                            <img alt="User Profile" className="w-full h-full object-cover" src={user.discordAvatarUrl} />
                        ) : (
                            <span className="text-xs font-semibold text-primary">
                                {discordUsername.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className="min-w-0 hidden md:block">
                        <p className="text-sm font-semibold text-text-primary leading-tight">{discordUsername}</p>
                        {walletPublicKey && (
                            <p className="text-[10px] text-text-muted font-mono truncate">
                                {truncateAddress(walletPublicKey, 4, 4)}
                            </p>
                        )}
                    </div>
                    <button
                        className="material-icons text-text-muted text-sm cursor-pointer hover:text-primary transition-colors ml-2"
                        onClick={handleLogout}
                        title="Sign out"
                        type="button"
                    >
                        logout
                    </button>
                </div>
            </div>
        </header>
    );
}
