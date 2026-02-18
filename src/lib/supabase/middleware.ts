// Supabase removed. This file is kept as a stub to avoid broken imports.
// The proxy.ts middleware no longer calls this.
import { type NextRequest, NextResponse } from 'next/server';
export async function updateSession(request: NextRequest) {
    return NextResponse.next({ request });
}
