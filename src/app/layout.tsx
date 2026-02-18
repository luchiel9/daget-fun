import type { Metadata } from 'next';
import * as Sentry from '@sentry/nextjs';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
    return {
        metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://daget.luchiel.dev'),
        title: 'Daget.fun | Role-gated Onchain Giveaways',
        description: 'Role-gated onchain giveaways for your community. No connect wallet needed.',
    };
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
                <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
                <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
                <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
            </head>
            <body className="min-h-screen bg-background-dark text-text-primary antialiased">
                {children}
            </body>
        </html>
    );
}
