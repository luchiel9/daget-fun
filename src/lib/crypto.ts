// Use CJS require to avoid Turbopack's broken ESM resolution for libsodium-wrappers
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _sodium = require('libsodium-wrappers') as typeof import('libsodium-wrappers');

let sodiumReady = false;

async function ensureSodium() {
    if (!sodiumReady) {
        await _sodium.ready;
        sodiumReady = true;
    }
    return _sodium;
}

/**
 * Get the encryption key from environment variable.
 * Key is stored as hex string, converted to Uint8Array.
 */
function getEncryptionKey(version: number = 1): Uint8Array {
    const envKey = version === 1
        ? process.env.WALLET_ENC_KEY_V1
        : process.env.WALLET_ENC_KEY_V2;

    if (!envKey) {
        throw new Error(`WALLET_ENC_KEY_V${version} not set`);
    }

    const keyBytes = Buffer.from(envKey, 'hex');
    if (keyBytes.length !== 32) {
        throw new Error(`WALLET_ENC_KEY_V${version} must be 32 bytes (64 hex chars)`);
    }

    return new Uint8Array(keyBytes);
}

/**
 * Encrypt a private key using libsodium secretbox (XSalsa20-Poly1305).
 * Returns base64-encoded ciphertext with nonce prepended.
 */
export async function encryptPrivateKey(
    privateKeyBytes: Uint8Array,
    keyVersion: number = 1,
): Promise<{ ciphertext: string; scheme: string; keyRef: string; version: number }> {
    const sodium = await ensureSodium();
    const encKey = getEncryptionKey(keyVersion);

    // Generate random nonce
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);

    // Encrypt
    const ciphertext = sodium.crypto_secretbox_easy(privateKeyBytes, nonce, encKey);

    // Prepend nonce to ciphertext
    const combined = new Uint8Array(nonce.length + ciphertext.length);
    combined.set(nonce);
    combined.set(ciphertext, nonce.length);

    // Base64 encode
    const encoded = Buffer.from(combined).toString('base64');

    // Best-effort zeroize
    encKey.fill(0);

    return {
        ciphertext: encoded,
        scheme: 'env-secretbox',
        keyRef: `WALLET_ENC_KEY_V${keyVersion}`,
        version: keyVersion,
    };
}

/**
 * Decrypt a private key from base64-encoded ciphertext (nonce prepended).
 * Returns raw private key bytes.
 *
 * IMPORTANT: Caller must zeroize the returned buffer after use.
 */
export async function decryptPrivateKey(
    encodedCiphertext: string,
    keyVersion: number = 1,
): Promise<Uint8Array> {
    const sodium = await ensureSodium();
    const encKey = getEncryptionKey(keyVersion);

    const combined = new Uint8Array(Buffer.from(encodedCiphertext, 'base64'));
    const nonceLength = sodium.crypto_secretbox_NONCEBYTES;

    const nonce = combined.slice(0, nonceLength);
    const ciphertext = combined.slice(nonceLength);

    const plaintext = sodium.crypto_secretbox_open_easy(ciphertext, nonce, encKey);

    // Best-effort zeroize encryption key
    encKey.fill(0);

    return plaintext;
}

/**
 * Best-effort zeroize a buffer.
 */
export function zeroize(buf: Uint8Array) {
    buf.fill(0);
}

/**
 * Generate a Solana keypair (64-byte secret key contains 32-byte private + 32-byte public).
 * Uses libsodium for CSPRNG.
 */
export async function generateKeypairBytes(): Promise<{
    publicKey: Uint8Array;
    secretKey: Uint8Array;
}> {
    const sodium = await ensureSodium();
    const keypair = sodium.crypto_sign_keypair();
    return {
        publicKey: keypair.publicKey,
        secretKey: keypair.privateKey,
    };
}
