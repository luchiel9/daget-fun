import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes, createHash } from 'crypto';

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const SCOPES = 'identify guilds guilds.members.read';

/**
 * Strictly use NEXT_PUBLIC_APP_URL — never fall back to request.url.origin
 * to prevent Host Header Injection via reverse-proxy misconfiguration.
 */
function getAppOrigin(): string {
    const url = process.env.NEXT_PUBLIC_APP_URL;
    if (!url) {
        throw new Error('NEXT_PUBLIC_APP_URL env var is required');
    }
    return url.replace(/\/$/, '');
}

/**
 * Validate returnTo against a strict allowlist pattern.
 * Blocks protocol-relative URLs (//evil.com), data: URIs, etc.
 */
function isValidReturnTo(path: string): boolean {
    return /^\/(?!\/)[a-zA-Z0-9\-_\/\?&=%.#@~:;,+!*()'[\]]*$/.test(path);
}

/**
 * GET /api/discord/auth?return_to=<path>&popup=1
 * Starts a Discord OAuth flow with PKCE (S256) and CSRF nonce.
 *
 * Security hardening:
 *  - PKCE (code_challenge / code_verifier) per OAuth 2.0 BCP
 *  - Nonce-in-state + cookie for CSRF protection
 *  - Flow ID suffix on cookies to support concurrent login tabs
 *  - Strict returnTo validation (no open redirect)
 *  - Host header injection prevented by hardcoded origin
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const rawReturnTo = searchParams.get('return_to') || '/';
    const returnTo = isValidReturnTo(rawReturnTo) ? rawReturnTo : '/';
    const isPopup = searchParams.get('popup') === '1';

    const origin = getAppOrigin();
    const redirectUri = `${origin}/api/discord/callback`;

    // PKCE: generate code_verifier and S256 code_challenge
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

    // Random nonce for CSRF + flow ID for concurrent login support
    const nonce = randomBytes(16).toString('hex');
    const flowId = randomBytes(4).toString('hex');

    const state = Buffer.from(
        JSON.stringify({ returnTo, popup: isPopup, nonce, flowId }),
    ).toString('base64url');

    const params = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SCOPES,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    });

    const response = NextResponse.redirect(
        `https://discord.com/oauth2/authorize?${params.toString()}`,
    );

    const cookieBase = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 60 * 10, // 10 minutes — enough for the OAuth round-trip
        path: '/api/discord/callback',
    };

    // Scoped nonce cookie — flowId suffix prevents concurrent tabs from clobbering each other
    response.cookies.set(`discord_oauth_nonce_${flowId}`, nonce, cookieBase);

    // Store PKCE verifier in a separate flow-scoped cookie
    response.cookies.set(`discord_oauth_pkce_${flowId}`, codeVerifier, cookieBase);

    return response;
}
