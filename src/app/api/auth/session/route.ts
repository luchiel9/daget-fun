import { NextResponse } from 'next/server';

/**
 * DELETE /api/auth/session — Clear session cookies (logout).
 */
export async function DELETE() {
    const response = NextResponse.json({ ok: true });
    response.cookies.delete('session_token');
    response.cookies.delete('discord_access_token');
    return response;
}
