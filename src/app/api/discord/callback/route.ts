import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { createSessionToken } from '@/lib/session';

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * GET /api/discord/callback
 * Handles the Discord OAuth callback. Exchanges the code for tokens,
 * upserts the user in the DB, creates a session JWT, and redirects.
 *
 * State encodes: base64url(JSON.stringify({ returnTo, popup }))
 * - returnTo: internal path to redirect to after auth
 * - popup: if true, returns an HTML page that posts a message to the opener and closes itself
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
        ?? new URL(request.url).origin;
    const redirectUri = `${origin}/api/discord/callback`;

    let returnTo = '/';
    let isPopup = false;
    let nonce: string | undefined;
    if (state) {
        try {
            const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
            if (typeof decoded.returnTo === 'string' && decoded.returnTo.startsWith('/')) {
                returnTo = decoded.returnTo;
            }
            isPopup = decoded.popup === true;
            nonce = decoded.nonce;
        } catch { /* ignore */ }
    }

    // CSRF check — nonce in state must match the cookie set on /api/discord/auth
    const cookieNonce = request.cookies.get('discord_oauth_nonce')?.value;
    if (!nonce || !cookieNonce || nonce !== cookieNonce) {
        console.warn('Discord OAuth CSRF check failed');
        return isPopup ? popupError() : NextResponse.redirect(`${origin}/`);
    }

    if (!code) {
        return isPopup ? popupError() : NextResponse.redirect(`${origin}${returnTo}`);
    }

    // Exchange code for Discord tokens
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: DISCORD_CLIENT_ID,
            client_secret: DISCORD_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
        }),
    });

    if (!tokenRes.ok) {
        console.error('Discord token exchange failed:', await tokenRes.text());
        return isPopup ? popupError() : NextResponse.redirect(`${origin}${returnTo}`);
    }

    const { access_token, expires_in } = await tokenRes.json();

    // Get Discord user profile
    const profileRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileRes.ok) {
        return isPopup ? popupError() : NextResponse.redirect(`${origin}${returnTo}`);
    }

    const profile = await profileRes.json();
    const discordUserId: string = profile.id;
    const avatarUrl = profile.avatar
        ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
        : null;

    // Upsert user in DB
    const [dbUser] = await db
        .insert(users)
        .values({
            discordUserId,
            discordUsername: profile.global_name || profile.username,
            discordAvatarUrl: avatarUrl,
            lastLoginAt: new Date(),
        })
        .onConflictDoUpdate({
            target: users.discordUserId,
            set: {
                discordUsername: profile.global_name || profile.username,
                discordAvatarUrl: avatarUrl,
                lastLoginAt: new Date(),
                updatedAt: new Date(),
            },
        })
        .returning();

    // Create session JWT
    const sessionToken = await createSessionToken({
        userId: dbUser.id,
        discordUserId,
    });

    const cookieOpts = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
    };

    if (isPopup) {
        const html = new NextResponse(
            `<!DOCTYPE html><html><head><script>
                window.opener && window.opener.postMessage({ type: 'DISCORD_LOGIN_SUCCESS' }, window.location.origin);
                window.close();
            </script></head><body>Authentication successful.</body></html>`,
            { headers: { 'Content-Type': 'text/html' } },
        );
        html.cookies.set('session_token', sessionToken, { ...cookieOpts, maxAge: SESSION_MAX_AGE });
        html.cookies.set('discord_access_token', access_token, { ...cookieOpts, maxAge: expires_in ?? 604800 });
        html.cookies.delete('discord_oauth_nonce');
        return html;
    }

    const response = NextResponse.redirect(`${origin}${returnTo}`);
    response.cookies.set('session_token', sessionToken, { ...cookieOpts, maxAge: SESSION_MAX_AGE });
    response.cookies.set('discord_access_token', access_token, { ...cookieOpts, maxAge: expires_in ?? 604800 });
    response.cookies.delete('discord_oauth_nonce');
    return response;
}

function popupError() {
    return new NextResponse(
        `<!DOCTYPE html><html><head><script>
            window.opener && window.opener.postMessage({ type: 'DISCORD_LOGIN_ERROR' }, window.location.origin);
            window.close();
        </script></head><body>Authentication failed.</body></html>`,
        { headers: { 'Content-Type': 'text/html' } },
    );
}
