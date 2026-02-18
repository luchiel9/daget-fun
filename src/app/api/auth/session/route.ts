import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decryptCookieValue } from '@/lib/cookie-crypto';

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;

/**
 * DELETE /api/auth/session — Logout.
 *
 * 1. Revokes the Discord access token at Discord's API (best-effort).
 * 2. Clears session and Discord access token cookies.
 */
export async function DELETE() {
    const cookieStore = await cookies();
    const encryptedToken = cookieStore.get('discord_access_token')?.value;

    // Best-effort Discord token revocation
    if (encryptedToken) {
        const accessToken = decryptCookieValue(encryptedToken);
        if (accessToken) {
            try {
                await fetch('https://discord.com/api/oauth2/token/revoke', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        client_id: DISCORD_CLIENT_ID,
                        client_secret: DISCORD_CLIENT_SECRET,
                        token: accessToken,
                    }),
                });
            } catch (err) {
                // Revocation is best-effort — don't block logout if Discord is unreachable
                console.warn('Discord token revocation failed:', err);
            }
        }
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.delete('session_token');
    response.cookies.delete('discord_access_token');
    return response;
}
