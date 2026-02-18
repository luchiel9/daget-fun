import { SignJWT, jwtVerify } from 'jose';

export type SessionPayload = {
    userId: string;
    discordUserId: string;
};

function getSecret() {
    const secret = process.env.SESSION_SECRET;
    if (!secret) throw new Error('SESSION_SECRET env var is required');
    return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, getSecret());
        return {
            userId: payload.userId as string,
            discordUserId: payload.discordUserId as string,
        };
    } catch {
        return null;
    }
}
