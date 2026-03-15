import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    encryptPrivateKey,
    decryptPrivateKey,
    zeroize,
    generateKeypairBytes,
} from '../crypto';

const TEST_KEY_V1 = 'a'.repeat(64); // 32 bytes in hex
const TEST_KEY_V2 = 'b'.repeat(64); // different 32-byte key

describe('crypto', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
    });

    describe('encryptPrivateKey + decryptPrivateKey round-trip', () => {
        beforeEach(() => {
            vi.stubEnv('WALLET_ENC_KEY_V1', TEST_KEY_V1);
        });

        it('encrypts and decrypts arbitrary bytes back to the original', async () => {
            const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
            const encrypted = await encryptPrivateKey(original);
            const decrypted = await decryptPrivateKey(encrypted.ciphertext);

            expect(decrypted).toEqual(original);
        });

        it('encrypts and decrypts a 64-byte secret key (Solana keypair size)', async () => {
            const original = new Uint8Array(64);
            for (let i = 0; i < 64; i++) original[i] = i;

            const encrypted = await encryptPrivateKey(original);
            const decrypted = await decryptPrivateKey(encrypted.ciphertext);

            expect(decrypted).toEqual(original);
        });

        it('encrypts and decrypts an empty buffer', async () => {
            const original = new Uint8Array(0);
            const encrypted = await encryptPrivateKey(original);
            const decrypted = await decryptPrivateKey(encrypted.ciphertext);

            expect(decrypted).toEqual(original);
        });

        it('returns correct metadata from encryptPrivateKey', async () => {
            const original = new Uint8Array([10, 20, 30]);
            const result = await encryptPrivateKey(original);

            expect(result.scheme).toBe('env-secretbox');
            expect(result.keyRef).toBe('WALLET_ENC_KEY_V1');
            expect(result.version).toBe(1);
            expect(typeof result.ciphertext).toBe('string');
            // Ciphertext should be valid base64
            expect(() => Buffer.from(result.ciphertext, 'base64')).not.toThrow();
        });

        it('produces different ciphertexts for the same plaintext (random nonce)', async () => {
            const original = new Uint8Array([42, 43, 44]);
            const encrypted1 = await encryptPrivateKey(original);
            const encrypted2 = await encryptPrivateKey(original);

            expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);

            // Both should decrypt to the same value
            const decrypted1 = await decryptPrivateKey(encrypted1.ciphertext);
            const decrypted2 = await decryptPrivateKey(encrypted2.ciphertext);
            expect(decrypted1).toEqual(original);
            expect(decrypted2).toEqual(original);
        });
    });

    describe('generateKeypairBytes', () => {
        it('returns a publicKey of 32 bytes', async () => {
            const keypair = await generateKeypairBytes();
            expect(keypair.publicKey).toBeInstanceOf(Uint8Array);
            expect(keypair.publicKey.length).toBe(32);
        });

        it('returns a secretKey of 64 bytes', async () => {
            const keypair = await generateKeypairBytes();
            expect(keypair.secretKey).toBeInstanceOf(Uint8Array);
            expect(keypair.secretKey.length).toBe(64);
        });

        it('generates different keypairs on each call', async () => {
            const kp1 = await generateKeypairBytes();
            const kp2 = await generateKeypairBytes();

            expect(kp1.publicKey).not.toEqual(kp2.publicKey);
            expect(kp1.secretKey).not.toEqual(kp2.secretKey);
        });

        it('the last 32 bytes of secretKey match publicKey (Ed25519 convention)', async () => {
            const keypair = await generateKeypairBytes();
            const pubFromSecret = keypair.secretKey.slice(32);
            expect(pubFromSecret).toEqual(keypair.publicKey);
        });
    });

    describe('zeroize', () => {
        it('fills buffer with zeros', () => {
            const buf = new Uint8Array([1, 2, 3, 4, 5]);
            zeroize(buf);
            expect(buf).toEqual(new Uint8Array(5));
        });

        it('handles an already-zeroed buffer', () => {
            const buf = new Uint8Array(10);
            zeroize(buf);
            expect(buf).toEqual(new Uint8Array(10));
        });

        it('handles an empty buffer', () => {
            const buf = new Uint8Array(0);
            zeroize(buf);
            expect(buf).toEqual(new Uint8Array(0));
        });
    });

    describe('getEncryptionKey errors', () => {
        it('throws when WALLET_ENC_KEY_V1 is not set', async () => {
            vi.stubEnv('WALLET_ENC_KEY_V1', '');
            // Trigger via encryptPrivateKey which calls getEncryptionKey internally
            // Empty string is falsy so it triggers the "not set" error
            delete process.env.WALLET_ENC_KEY_V1;

            await expect(
                encryptPrivateKey(new Uint8Array([1, 2, 3]))
            ).rejects.toThrow('WALLET_ENC_KEY_V1 not set');
        });

        it('throws when WALLET_ENC_KEY_V2 is not set and version 2 requested', async () => {
            vi.stubEnv('WALLET_ENC_KEY_V1', TEST_KEY_V1);
            delete process.env.WALLET_ENC_KEY_V2;

            await expect(
                encryptPrivateKey(new Uint8Array([1, 2, 3]), 2)
            ).rejects.toThrow('WALLET_ENC_KEY_V2 not set');
        });

        it('throws when key is wrong length (too short)', async () => {
            vi.stubEnv('WALLET_ENC_KEY_V1', 'abcd'); // only 2 bytes

            await expect(
                encryptPrivateKey(new Uint8Array([1, 2, 3]))
            ).rejects.toThrow('must be 32 bytes (64 hex chars)');
        });

        it('throws when key is wrong length (too long)', async () => {
            vi.stubEnv('WALLET_ENC_KEY_V1', 'a'.repeat(128)); // 64 bytes

            await expect(
                encryptPrivateKey(new Uint8Array([1, 2, 3]))
            ).rejects.toThrow('must be 32 bytes (64 hex chars)');
        });

        it('throws for decryptPrivateKey when env var is missing', async () => {
            delete process.env.WALLET_ENC_KEY_V1;

            await expect(
                decryptPrivateKey('dummybase64==')
            ).rejects.toThrow('WALLET_ENC_KEY_V1 not set');
        });
    });

    describe('tampered ciphertext', () => {
        beforeEach(() => {
            vi.stubEnv('WALLET_ENC_KEY_V1', TEST_KEY_V1);
        });

        it('throws when ciphertext bytes are modified', async () => {
            const original = new Uint8Array([10, 20, 30, 40, 50]);
            const encrypted = await encryptPrivateKey(original);

            // Decode, tamper, re-encode
            const raw = Buffer.from(encrypted.ciphertext, 'base64');
            // Flip a byte in the ciphertext portion (after the 24-byte nonce)
            raw[raw.length - 1] ^= 0xff;
            const tampered = raw.toString('base64');

            await expect(decryptPrivateKey(tampered)).rejects.toThrow();
        });

        it('throws when nonce bytes are modified', async () => {
            const original = new Uint8Array([10, 20, 30]);
            const encrypted = await encryptPrivateKey(original);

            const raw = Buffer.from(encrypted.ciphertext, 'base64');
            // Flip a byte in the nonce (first 24 bytes)
            raw[0] ^= 0xff;
            const tampered = raw.toString('base64');

            await expect(decryptPrivateKey(tampered)).rejects.toThrow();
        });

        it('throws when ciphertext is truncated', async () => {
            const original = new Uint8Array([10, 20, 30]);
            const encrypted = await encryptPrivateKey(original);

            const raw = Buffer.from(encrypted.ciphertext, 'base64');
            // Truncate to just the nonce
            const truncated = raw.subarray(0, 24).toString('base64');

            await expect(decryptPrivateKey(truncated)).rejects.toThrow();
        });

        it('throws when decrypting with the wrong key', async () => {
            const original = new Uint8Array([10, 20, 30]);
            const encrypted = await encryptPrivateKey(original);

            // Change to a different key for decryption
            vi.stubEnv('WALLET_ENC_KEY_V1', 'c'.repeat(64));

            await expect(
                decryptPrivateKey(encrypted.ciphertext)
            ).rejects.toThrow();
        });
    });

    describe('key version selection', () => {
        beforeEach(() => {
            vi.stubEnv('WALLET_ENC_KEY_V1', TEST_KEY_V1);
            vi.stubEnv('WALLET_ENC_KEY_V2', TEST_KEY_V2);
        });

        it('encrypts with V1 by default', async () => {
            const original = new Uint8Array([1, 2, 3]);
            const result = await encryptPrivateKey(original);

            expect(result.keyRef).toBe('WALLET_ENC_KEY_V1');
            expect(result.version).toBe(1);
        });

        it('encrypts with V2 when specified', async () => {
            const original = new Uint8Array([1, 2, 3]);
            const result = await encryptPrivateKey(original, 2);

            expect(result.keyRef).toBe('WALLET_ENC_KEY_V2');
            expect(result.version).toBe(2);
        });

        it('V1-encrypted data cannot be decrypted with V2 key', async () => {
            const original = new Uint8Array([1, 2, 3]);
            const encrypted = await encryptPrivateKey(original, 1);

            await expect(
                decryptPrivateKey(encrypted.ciphertext, 2)
            ).rejects.toThrow();
        });

        it('V2-encrypted data cannot be decrypted with V1 key', async () => {
            const original = new Uint8Array([1, 2, 3]);
            const encrypted = await encryptPrivateKey(original, 2);

            await expect(
                decryptPrivateKey(encrypted.ciphertext, 1)
            ).rejects.toThrow();
        });

        it('V1 round-trip works independently of V2', async () => {
            const original = new Uint8Array([11, 22, 33]);
            const encrypted = await encryptPrivateKey(original, 1);
            const decrypted = await decryptPrivateKey(encrypted.ciphertext, 1);

            expect(decrypted).toEqual(original);
        });

        it('V2 round-trip works independently of V1', async () => {
            const original = new Uint8Array([44, 55, 66]);
            const encrypted = await encryptPrivateKey(original, 2);
            const decrypted = await decryptPrivateKey(encrypted.ciphertext, 2);

            expect(decrypted).toEqual(original);
        });
    });
});
