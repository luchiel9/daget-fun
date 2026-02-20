import type { Metadata } from 'next';

import { Inter, Space_Mono, Press_Start_2P } from 'next/font/google';
import './globals.css';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

const spaceMono = Space_Mono({
    weight: ['400', '700'],
    subsets: ['latin'],
    variable: '--font-space-mono',
    display: 'swap',
});

const pressStart2P = Press_Start_2P({
    weight: '400',
    subsets: ['latin'],
    variable: '--font-press-start-2p',
    display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
    return {
        metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://daget.fun'),
        title: 'Daget.fun | Role-gated Onchain Giveaways',
        description: 'Role-gated onchain giveaways for your community. No connect wallet needed.',
        openGraph: {
            title: 'Daget.fun | Role-gated Onchain Giveaways',
            description: 'Role-gated onchain giveaways for your community. No connect wallet needed.',
            type: 'website',
            images: ['/images/hero.png'],
        },
        twitter: {
            card: 'summary_large_image',
            title: 'Daget.fun | Role-gated Onchain Giveaways',
            description: 'Role-gated onchain giveaways for your community. No connect wallet needed.',
            images: ['/images/hero.png'],
        },
    };
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={`dark ${inter.variable} ${spaceMono.variable} ${pressStart2P.variable}`}>
            <head>
                <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
                <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
            </head>
            <body className="min-h-screen bg-background-dark text-text-primary antialiased">
                {children}
            </body>
        </html>
    );
}
