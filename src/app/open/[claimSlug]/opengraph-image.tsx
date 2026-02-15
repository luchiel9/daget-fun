
import { ImageResponse } from 'next/og';
import { db } from '@/db';
import { dagets } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Route segment config
export const runtime = 'nodejs'; // Use nodejs runtime for database access
export const revalidate = 60; // Cache for 60 seconds

// Image metadata
export const alt = 'Daget Claim Preview';
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ claimSlug: string }> }) {
    const { claimSlug } = await params;

    try {
        // Fetch Daget data
        const daget = await db.query.dagets.findFirst({
            where: eq(dagets.claimSlug, claimSlug),
            columns: {
                name: true,
                status: true,
                dagetType: true,
                tokenSymbol: true,
                totalWinners: true,
                claimedCount: true,
            },
            with: {
                creator: true
            }
        });

        if (!daget) {
            return new ImageResponse(
                (
                    <div
                        style={{
                            fontSize: 48,
                            background: '#09090b',
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                        }}
                    >
                        Daget Not Found
                    </div>
                ),
                { ...size }
            );
        }

        const { name, creator, tokenSymbol, claimedCount, totalWinners, dagetType } = daget;
        const authorName = creator?.discordUsername || 'Unknown';
        // Force PNG for Discord avatars to avoid webp issues in some environments
        const authorAvatar = creator?.discordAvatarUrl ? creator.discordAvatarUrl.replace('.webp', '.png') : null;
        const spotsLeft = Math.max(0, totalWinners - claimedCount);

        return new ImageResponse(
            (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        width: '100%',
                        height: '100%',
                        padding: '60px',
                        background: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)', // zinc-950 to zinc-900
                        color: 'white',
                        fontFamily: 'sans-serif',
                    }}
                >
                    {/* Branding Top Left */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>Daget.fun</span>
                    </div>

                    {/* Main Content */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '40px' }}>
                        <h1 style={{
                            fontSize: '70px', // Reduced from 84px
                            fontWeight: 800,
                            lineHeight: 1.1,
                            margin: 0,
                            background: 'linear-gradient(to right, #ffffff, #a1a1aa)',
                            backgroundClip: 'text',
                            color: 'transparent',
                            textShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            maxWidth: '900px',
                            overflow: 'hidden',
                            // Allow wrapping (2 lines)
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            wordBreak: 'break-word',
                        }}>
                            {name}
                        </h1>

                        {/* Creator Info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <span style={{ fontSize: '24px', color: '#a1a1aa' }}>by</span>
                            {authorAvatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={authorAvatar}
                                    alt={authorName}
                                    width="48"
                                    height="48"
                                    style={{ borderRadius: '50%', border: '2px solid #52525b' }}
                                />
                            ) : (
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '50%', background: '#27272a',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '20px', fontWeight: 'bold', color: '#a1a1aa'
                                }}>
                                    {authorName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <span style={{ fontSize: '32px', fontWeight: 600, color: '#e4e4e7' }}>{authorName}</span>
                        </div>
                    </div>

                    {/* Stats Grid at Bottom */}
                    < div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '24px',
                        marginTop: 'auto',
                        paddingTop: '40px'
                    }}>
                        {/* Token Badge */}
                        < div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            background: 'rgba(59, 130, 246, 0.15)', // blue-500/15
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            padding: '16px 24px',
                            borderRadius: '24px',
                        }
                        }>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '14px', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '1px' }}>Token</span>
                                <span style={{ fontSize: '28px', color: 'white', fontWeight: 'bold' }}>{tokenSymbol}</span>
                            </div>
                        </div >

                        {/* Mode/Type Badge */}
                        < div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            background: 'rgba(16, 185, 129, 0.15)', // emerald-500/15
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            padding: '16px 24px',
                            borderRadius: '24px',
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '14px', color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '1px' }}>Mode</span>
                                <span style={{ fontSize: '28px', color: 'white', fontWeight: 'bold' }}>{dagetType === 'fixed' ? 'Fixed' : 'Random'}</span>
                            </div>
                        </div >

                        {/* Spots Badge */}
                        < div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            padding: '16px 24px',
                            borderRadius: '24px',
                            marginLeft: 'auto' // Push to right if needed, or keep inline
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontSize: '14px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '1px' }}>Claimed</span>
                                <span style={{ fontSize: '28px', color: 'white', fontWeight: 'bold' }}>{claimedCount} / {totalWinners}</span>
                            </div>
                        </div >

                    </div >

                    {/* Subtle visual element */}
                    < div style={{
                        position: 'absolute',
                        right: '-100px',
                        top: '-100px',
                        width: '600px',
                        height: '600px',
                        background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(0,0,0,0) 70%)',
                        borderRadius: '50%',
                        filter: 'blur(60px)',
                        zIndex: -1
                    }} />
                </div >
            ),
            {
                ...size
            }
        );
    } catch (e) {
        console.error('Error generating OG image:', e);
        return new ImageResponse(
            (
                <div
                    style={{
                        fontSize: 48,
                        background: '#09090b',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                    }}
                >
                    Daget.fun
                </div>
            ),
            { ...size }
        );
    }
}
