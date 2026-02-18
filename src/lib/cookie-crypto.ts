/**
 * AES-256-GCM encryption/decryption for sensitive cookie values.
 *
 * Uses SESSION_SECRET as the root key material, derived via SHA-256
 * with a domain-specific salt to keep it independent from the JWT
 * signing key (which uses the raw secret bytes).
 *
 * Ciphertext format: base64url( iv[12] || authTag[16] || ciphertext )
 */
import {
    createCipheriv,
    createDecipheriv,
    createHash,
    randomBytes,
} from 'crypto';

const SALT = 'daget.fun:cookie-encryption:v1';

/**
 * Derive a 256-bit key from SESSION_SECRET + salt.
 * The salt ensures this key is distinct from the JWT signing key.
 */
function getDerivedKey(): Buffer {
    const secret = process.env.SESSION_SECRET;
    if (!secret) throw new Error('SESSION_SECRET env var is required');
    if (secret.length < 32) {
        throw new Error('SESSION_SECRET must be at least 32 characters');
    }
    if (/^your[-_]/.test(secret)) {
        throw new Error(
            'SESSION_SECRET appears to be a placeholder — generate one with: openssl rand -hex 32',
        );
    }
    return createHash('sha256')
        .update(`${SALT}:${secret}`)
        .digest(); // 32 bytes
}

/**
 * Encrypt a plaintext string. Returns a base64url-encoded ciphertext
 * that includes the IV and authentication tag.
 */
export function encryptCookieValue(plaintext: string): string {
    const key = getDerivedKey();
    const iv = randomBytes(12); // 96-bit IV for GCM
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag(); // 16 bytes
    // iv (12) + tag (16) + ciphertext
    return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

/**
 * Decrypt a base64url-encoded ciphertext produced by `encryptCookieValue()`.
 * Returns null if decryption fails (tampered, wrong key, etc.)
 * instead of throwing — callers should treat null as "token expired / invalid".
 */
export function decryptCookieValue(ciphertext: string): string | null {
    try {
        const key = getDerivedKey();
        const data = Buffer.from(ciphertext, 'base64url');
        if (data.length < 29) return null; // iv(12) + tag(16) + min 1 byte

        const iv = data.subarray(0, 12);
        const tag = data.subarray(12, 28);
        const encrypted = data.subarray(28);

        const decipher = createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]);
        return decrypted.toString('utf8');
    } catch {
        return null;
    }
}
