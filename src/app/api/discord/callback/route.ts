import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { createSessionToken } from '@/lib/session';
import { encryptCookieValue } from '@/lib/cookie-crypto';

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days — matches Discord token lifetime

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

/** CSP for the inline-script popup responses. */
const POPUP_CSP = "default-src 'none'; script-src 'unsafe-inline'";

/**
 * GET /api/discord/callback
 * Handles the Discord OAuth callback. Exchanges the code for tokens,
 * upserts the user in the DB, creates a session JWT, and redirects.
 *
 * Security hardening:
 *  - CSRF nonce verified from flow-scoped cookie
 *  - PKCE code_verifier sent to Discord token exchange
 *  - Discord access token encrypted before storing in cookie
 *  - Strict returnTo validation (no open redirect)
 *  - Host header injection prevented by hardcoded origin
 *  - CSP header on popup HTML responses
 *  - Flow cookies cleaned up on every exit path
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    const origin = getAppOrigin();
    const redirectUri = `${origin}/api/discord/callback`;

    let returnTo = '/';
    let isPopup = false;
    let nonce: string | undefined;
    let flowId: string | undefined;

    if (state) {
        try {
            const decoded = JSON.parse(
                Buffer.from(state, 'base64url').toString('utf-8'),
            );
            if (
                typeof decoded.returnTo === 'string' &&
                isValidReturnTo(decoded.returnTo)
            ) {
                returnTo = decoded.returnTo;
            }
            isPopup = decoded.popup === true;
            nonce = decoded.nonce;
            flowId = decoded.flowId;
        } catch {
            /* malformed state — fall through to CSRF check which will reject */
        }
    }

    // ── CSRF check ────────────────────────────────────────────────
    // Nonce in state must match the flow-specific cookie set in /api/discord/auth
    const nonceCookieName = flowId
        ? `discord_oauth_nonce_${flowId}`
        : '';
    const cookieNonce = nonceCookieName
        ? request.cookies.get(nonceCookieName)?.value
        : undefined;

    if (!nonce || !cookieNonce || nonce !== cookieNonce || !flowId) {
        console.warn('Discord OAuth CSRF check failed');
        const response = isPopup
            ? popupError()
            : NextResponse.redirect(`${origin}/`);
        if (flowId) cleanupFlowCookies(response, flowId);
        return response;
    }

    // ── Missing code (user denied consent, etc.) ──────────────────
    if (!code) {
        const response = isPopup
            ? popupError()
            : NextResponse.redirect(`${origin}${returnTo}`);
        cleanupFlowCookies(response, flowId);
        return response;
    }

    // ── Retrieve PKCE code_verifier ───────────────────────────────
    const codeVerifier = request.cookies.get(
        `discord_oauth_pkce_${flowId}`,
    )?.value;

    if (!codeVerifier) {
        console.warn('Discord OAuth PKCE verifier missing');
        const response = isPopup
            ? popupError()
            : NextResponse.redirect(`${origin}/`);
        cleanupFlowCookies(response, flowId);
        return response;
    }

    // ── Exchange code for Discord tokens (with PKCE) ─────────────
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: DISCORD_CLIENT_ID,
            client_secret: DISCORD_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
        }),
    });

    if (!tokenRes.ok) {
        console.error(
            'Discord token exchange failed:',
            await tokenRes.text(),
        );
        const response = isPopup
            ? popupError()
            : NextResponse.redirect(`${origin}${returnTo}`);
        cleanupFlowCookies(response, flowId);
        return response;
    }

    const { access_token, expires_in } = await tokenRes.json();

    if (!expires_in) {
        console.warn(
            'Discord token response missing expires_in, using 7-day fallback',
        );
    }

    // ── Get Discord user profile ─────────────────────────────────
    const profileRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileRes.ok) {
        const response = isPopup
            ? popupError()
            : NextResponse.redirect(`${origin}${returnTo}`);
        cleanupFlowCookies(response, flowId);
        return response;
    }

    const profile = await profileRes.json();
    const discordUserId: string = profile.id;
    const avatarUrl = profile.avatar
        ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
        : null;

    // ── Upsert user in DB ────────────────────────────────────────
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

    // ── Create session JWT ───────────────────────────────────────
    const sessionToken = await createSessionToken({
        userId: dbUser.id,
        discordUserId,
    });

    // ── Encrypt Discord access token before storing in cookie ────
    const encryptedAccessToken = encryptCookieValue(access_token);

    const cookieOpts = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://'),
        sameSite: 'lax' as const,
        path: '/',
    };

    // ── Respond ──────────────────────────────────────────────────
    if (isPopup) {
        const html = new NextResponse(
            `<!DOCTYPE html><html><head><script>
                window.opener && window.opener.postMessage({ type: 'DISCORD_LOGIN_SUCCESS' }, window.location.origin);
                window.close();
            </script></head><body>Authentication successful.</body></html>`,
            {
                headers: {
                    'Content-Type': 'text/html',
                    'Content-Security-Policy': POPUP_CSP,
                },
            },
        );
        html.cookies.set('session_token', sessionToken, {
            ...cookieOpts,
            maxAge: SESSION_MAX_AGE,
        });
        html.cookies.set('discord_access_token', encryptedAccessToken, {
            ...cookieOpts,
            maxAge: expires_in ?? 604800,
        });
        cleanupFlowCookies(html, flowId);
        return html;
    }

    const response = NextResponse.redirect(`${origin}${returnTo}`);
    response.cookies.set('session_token', sessionToken, {
        ...cookieOpts,
        maxAge: SESSION_MAX_AGE,
    });
    response.cookies.set('discord_access_token', encryptedAccessToken, {
        ...cookieOpts,
        maxAge: expires_in ?? 604800,
    });
    cleanupFlowCookies(response, flowId);
    return response;
}

// ── Helpers ──────────────────────────────────────────────────────

/** Delete the flow-specific nonce and PKCE cookies. */
function cleanupFlowCookies(response: NextResponse, flowId: string) {
    response.cookies.delete({
        name: `discord_oauth_nonce_${flowId}`,
        path: '/api/discord/callback',
    });
    response.cookies.delete({
        name: `discord_oauth_pkce_${flowId}`,
        path: '/api/discord/callback',
    });
}

/** Return a popup HTML page that posts DISCORD_LOGIN_ERROR to the opener. */
function popupError() {
    return new NextResponse(
        `<!DOCTYPE html><html><head><script>
            window.opener && window.opener.postMessage({ type: 'DISCORD_LOGIN_ERROR' }, window.location.origin);
            window.close();
        </script></head><body>Authentication failed.</body></html>`,
        {
            headers: {
                'Content-Type': 'text/html',
                'Content-Security-Policy': POPUP_CSP,
            },
        },
    );
}
