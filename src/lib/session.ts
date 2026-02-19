import { SignJWT, jwtVerify } from 'jose';

export type SessionPayload = {
    userId: string;
    discordUserId: string;
};

const JWT_ISSUER = 'daget.fun';
const JWT_AUDIENCE = 'daget.fun:session';

function getSecret() {
    const secret = process.env.SESSION_SECRET;
    if (!secret) throw new Error('SESSION_SECRET env var is required');
    if (secret.length < 32) {
        throw new Error('SESSION_SECRET must be at least 32 characters');
    }
    if (/^your[-_]/.test(secret)) {
        throw new Error('SESSION_SECRET appears to be a placeholder — generate one with: openssl rand -hex 32');
    }
    return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer(JWT_ISSUER)
        .setAudience(JWT_AUDIENCE)
        .setExpirationTime('7d')
        .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, getSecret(), {
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
        });
        return {
            userId: payload.userId as string,
            discordUserId: payload.discordUserId as string,
        };
    } catch {
        return null;
    }
}
