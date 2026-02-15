import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users, wallets } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export type AuthUser = {
    id: string;          // Our internal user UUID
    discordUserId: string;
    discordUsername: string | null;
    discordAvatarUrl: string | null;
    receivingAddress: string | null;
    hasWallet: boolean;
};

/**
 * Get the authenticated user from the session.
 * Returns null if not authenticated.
 */
export async function getAuthenticatedUser(): Promise<AuthUser | null> {
    const supabase = await createSupabaseServerClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (!supabaseUser) return null;

    // Get Discord identity
    const discordUserId = supabaseUser.user_metadata?.provider_id
        || supabaseUser.user_metadata?.sub
        || supabaseUser.identities?.[0]?.id;

    if (!discordUserId) return null;

    // Find or sync user in our database
    let dbUser = await db.query.users.findFirst({
        where: eq(users.discordUserId, discordUserId),
    });

    if (!dbUser) {
        // Create user on first login
        const [newUser] = await db.insert(users).values({
            discordUserId,
            discordUsername: supabaseUser.user_metadata?.full_name
                || supabaseUser.user_metadata?.name
                || supabaseUser.user_metadata?.preferred_username
                || null,
            discordAvatarUrl: supabaseUser.user_metadata?.avatar_url || null,
            lastLoginAt: new Date(),
        }).returning();
        dbUser = newUser;
    } else {
        // Update login time and profile info
        await db.update(users)
            .set({
                lastLoginAt: new Date(),
                discordUsername: supabaseUser.user_metadata?.full_name
                    || supabaseUser.user_metadata?.name
                    || dbUser.discordUsername,
                discordAvatarUrl: supabaseUser.user_metadata?.avatar_url
                    || dbUser.discordAvatarUrl,
                updatedAt: new Date(),
            })
            .where(eq(users.id, dbUser.id));
    }

    // Check for active wallet
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

/**
 * Require authentication. Used in API routes.
 * Throws if not authenticated.
 */
export async function requireAuth(): Promise<AuthUser> {
    const user = await getAuthenticatedUser();
    if (!user) {
        throw new Error('AUTH_REQUIRED');
    }
    return user;
}

/**
 * Get the Discord Provider Token from the session.
 * This is needed to make API calls to Discord on behalf of the user.
 */
export async function getDiscordAccessToken(): Promise<string | null> {
    const supabase = await createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();

    return session?.provider_token || null;
}
