import { type NextRequest, NextResponse } from 'next/server';

// Middleware passthrough — auth is enforced per-route via requireAuth() / layout.tsx.
export async function proxy(request: NextRequest) {
    return NextResponse.next({ request });
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
