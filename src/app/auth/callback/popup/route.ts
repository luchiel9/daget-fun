import { NextResponse } from 'next/server';

// Supabase OAuth popup is no longer used.
export async function GET() {
    return new NextResponse(
        `<!DOCTYPE html><html><head><script>window.close();</script></head><body></body></html>`,
        { headers: { 'Content-Type': 'text/html' } },
    );
}
