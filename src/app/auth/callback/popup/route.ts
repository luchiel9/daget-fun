import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (code) {
        const supabase = await createSupabaseServerClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            return new NextResponse(`
                <html>
                    <head>
                        <script>
                            window.opener.postMessage({ type: 'DISCORD_LOGIN_SUCCESS' }, window.location.origin);
                            window.close();
                        </script>
                    </head>
                    <body>
                        <p>Authentication successful. You can close this window now.</p>
                    </body>
                </html>
            `, {
                headers: { 'Content-Type': 'text/html' },
            });
        }
    }

    return new NextResponse(`
        <html>
            <head>
                <script>
                    window.opener.postMessage({ type: 'DISCORD_LOGIN_ERROR' }, window.location.origin);
                    window.close();
                </script>
            </head>
            <body>
                <p>Authentication failed. Please try again.</p>
            </body>
        </html>
    `, {
        headers: { 'Content-Type': 'text/html' },
    });
}
