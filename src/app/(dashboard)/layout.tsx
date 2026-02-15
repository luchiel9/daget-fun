import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/sidebar';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getAuthenticatedUser();
    if (!user) redirect('/');

    return <AppShell user={user}>{children}</AppShell>;
}
