import { cookies } from 'next/headers';
import { verifySessionToken } from './session';
import { db } from '@/db';
import { users, wallets } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export type AuthUser = {
    id: string;
    discordUserId: string;
    discordUsername: string | null;
    discordAvatarUrl: string | null;
    receivingAddress: string | null;
    hasWallet: boolean;
};

export async function getAuthenticatedUser(): Promise<AuthUser | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return null;

    const session = await verifySessionToken(token);
    if (!session) return null;

    const dbUser = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
    });
    if (!dbUser) return null;

    const wallet = await db.query.wallets.findFirst({
        where: and(eq(wallets.userId, dbUser.id), eq(wallets.isActive, true)),
    });

    return {
        id: dbUser.id,
        discordUserId: dbUser.discordUserId,
        discordUsername: dbUser.discordUsername,
        discordAvatarUrl: dbUser.discordAvatarUrl,
        receivingAddress: dbUser.receivingAddress,
        hasWallet: !!wallet,
    };
}

export async function requireAuth(): Promise<AuthUser> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('AUTH_REQUIRED');
    return user;
}

export async function getDiscordAccessToken(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get('discord_access_token')?.value ?? null;
}
