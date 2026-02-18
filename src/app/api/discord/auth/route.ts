import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'crypto';

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const SCOPES = 'identify guilds guilds.members.read';

/**
 * GET /api/discord/auth?return_to=<path>&popup=1
 * Starts a direct Discord OAuth flow (no Supabase).
 * State encodes: base64url(JSON.stringify({ returnTo, popup, nonce }))
 * The nonce is also stored in a short-lived cookie to prevent CSRF.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const returnTo = searchParams.get('return_to') || '/';
    const isPopup = searchParams.get('popup') === '1';

    const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
        ?? new URL(request.url).origin;

    const redirectUri = `${origin}/api/discord/callback`;

    // Random nonce — stored in cookie and included in state.
    // On callback we verify they match, blocking CSRF attacks.
    const nonce = randomBytes(16).toString('hex');
    const state = Buffer.from(JSON.stringify({ returnTo, popup: isPopup, nonce })).toString('base64url');

    const params = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SCOPES,
        state,
    });

    const response = NextResponse.redirect(
        `https://discord.com/oauth2/authorize?${params.toString()}`,
    );
    response.cookies.set('discord_oauth_nonce', nonce, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 10, // 10 minutes — enough for the OAuth round-trip
        path: '/api/discord/callback',
    });
    return response;
}
