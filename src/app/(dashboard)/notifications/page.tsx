'use client';

import { useEffect, useState } from 'react';
import { GlassCard, EmptyState } from '@/components/ui';
import DOMPurify from 'isomorphic-dompurify';

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'claims' | 'system'>('all');

    useEffect(() => {
        fetch('/api/notifications')
            .then((r) => r.json())
            .then((data) => {
                setNotifications(data.items || []);
                // Mark all as read when visiting the page (clears badge for all notifications, including old ones)
                fetch('/api/notifications/mark-all-read', { method: 'POST' })
                    .then(() => {
                        window.dispatchEvent(new Event('notifications-updated'));
                    });
            })
            .finally(() => setLoading(false));
    }, []);

    const markRead = async (id: string) => {
        await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        window.dispatchEvent(new Event('notifications-updated'));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    const typeIcons: Record<string, string> = {
        claim_confirmed: 'check_circle',
        claim_failed: 'error',
        claim_released: 'undo',
        daget_stopped: 'stop_circle',
        daget_closed: 'task_alt',
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'all') return true;
        if (filter === 'claims') return n.type.startsWith('claim_');
        if (filter === 'system') return n.type.startsWith('daget_');
        return true;
    });

    const unreadNotifications = filteredNotifications.filter(n => !n.is_read);
    const readNotifications = filteredNotifications.filter(n => n.is_read);

    const NotificationCard = ({ n }: { n: any }) => (
        <GlassCard
            className={`rounded-xl p-4 flex items-start gap-4 cursor-pointer transition-all duration-200 ${!n.is_read ? 'border-l-[3px] border-l-primary bg-primary/5' : 'border-l-[3px] border-l-transparent hover:bg-white/5'}`}
            hover={false}
        >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden ${n.icon_url ? '' : (n.type === 'claim_confirmed' ? 'bg-green-500/10' : n.type === 'claim_failed' ? 'bg-red-500/10' : 'bg-primary/10')}`}>
                {n.icon_url ? (
                    <img src={n.icon_url} alt="User Avatar" className="w-full h-full object-cover" />
                ) : (
                    <span className={`material-icons text-[20px] ${n.type === 'claim_confirmed' ? 'text-green-400' : n.type === 'claim_failed' ? 'text-red-400' : 'text-primary'}`}>
                        {typeIcons[n.type] || 'notifications'}
                    </span>
                )}
            </div>
            <div className="flex-1 min-w-0" onClick={() => !n.is_read && markRead(n.id)}>
                <div
                    className="text-sm text-text-primary mb-0.5"
                    dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(n.body || n.title, { ALLOWED_TAGS: ['b', 'i', 'strong', 'em', 'span'], ALLOWED_ATTR: ['class'] })
                    }}
                />
                <span className="text-[10px] text-text-muted flex-shrink-0 mt-1 block">{new Date(n.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        </GlassCard>
    );

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                        <button onClick={() => setFilter('all')} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 active:scale-[0.95] ${filter === 'all' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-text-secondary hover:text-primary hover:bg-primary/5 border border-transparent'}`}>All</button>
                        <button onClick={() => setFilter('claims')} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 active:scale-[0.95] ${filter === 'claims' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-text-secondary hover:text-primary hover:bg-primary/5 border border-transparent'}`}>Claims</button>
                        <button onClick={() => setFilter('system')} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 active:scale-[0.95] ${filter === 'system' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-text-secondary hover:text-primary hover:bg-primary/5 border border-transparent'}`}>System</button>
                    </div>

                    {notifications.length === 0 ? (
                        <GlassCard className="p-6">
                            <EmptyState icon="notifications" title="No notifications" description="You're all caught up!" />
                        </GlassCard>
                    ) : (
                        <div className="space-y-4">
                            {unreadNotifications.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">New</h3>
                                    {unreadNotifications.map((n) => (
                                        <NotificationCard key={n.id} n={n} />
                                    ))}
                                </div>
                            )}

                            {unreadNotifications.length > 0 && readNotifications.length > 0 && (
                                <hr className="border-t border-border-light/10 my-4" />
                            )}

                            {readNotifications.length > 0 && (
                                <div className="space-y-2">
                                    {unreadNotifications.length > 0 && (
                                        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Earlier</h3>
                                    )}
                                    {readNotifications.map((n) => (
                                        <NotificationCard key={n.id} n={n} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
