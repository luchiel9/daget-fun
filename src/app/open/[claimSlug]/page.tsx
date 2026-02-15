import { Metadata } from 'next';
import { db } from '@/db';
import { dagets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import ClaimPageClient from './ClaimPageClient';

type Props = {
    params: Promise<{ claimSlug: string }>;
};

// Generate metadata for the page
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    // Read the params
    const { claimSlug } = await params;

    // Fetch the daget details
    const daget = await db.query.dagets.findFirst({
        where: eq(dagets.claimSlug, claimSlug),
        columns: {
            name: true,
            status: true,
        },
    });

    // Default description from user request
    const description = "Role-gated onchain giveaways for your community. Secure, transparent, and automated. Reward your Discord members with Solana tokens based on their server roles. NO CONNECT WALLET NEEDED";

    return {
        title: daget ? `${daget.name} | Daget.fun` : 'Claim Daget | Daget.fun',
        description: description,
        openGraph: {
            title: daget ? `${daget.name} | Daget.fun` : 'Claim Daget | Daget.fun',
            description: description,
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: daget ? `${daget.name} | Daget.fun` : 'Claim Daget | Daget.fun',
            description: description,
        },
    };
}

export default async function Page() {
    return <ClaimPageClient />;
}
