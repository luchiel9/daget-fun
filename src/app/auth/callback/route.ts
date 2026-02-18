import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    // Prefer the auth_next cookie (set before OAuth redirect) over the query param,
    // since Supabase may strip query params from redirectTo if not whitelisted
    const cookieStore = await cookies();
    const next = cookieStore.get('auth_next')?.value
        || searchParams.get('next')
        || '/dashboard';

    // Prefer environment variable for origin to ensure correct redirect in production
    // docker/proxy setups often report localhost as the request origin
    const origin = process.env.NEXT_PUBLIC_APP_URL
        ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
        : new URL(request.url).origin;

    if (code) {
        const supabase = await createSupabaseServerClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            const response = NextResponse.redirect(`${origin}${next}`);
            response.cookies.delete('auth_next');
            return response;
        }
    }

    // Auth error — redirect to home with error
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
}
