import { NextResponse } from 'next/server';

// Supabase OAuth is no longer used. Redirect any stale links to home.
export async function GET() {
    return NextResponse.redirect(
        (process.env.NEXT_PUBLIC_APP_URL ?? '') + '/',
    );
}
