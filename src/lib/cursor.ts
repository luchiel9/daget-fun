import crypto from 'crypto';

/**
 * Cursor-based pagination helpers.
 * Cursors are opaque, signed, base64url tokens.
 */

const CURSOR_SECRET = process.env.CURSOR_SECRET || 'dev-cursor-secret-key-change-me';

interface CursorPayload {
    /** The value to paginate on (typically created_at ISO string) */
    v: string;
    /** The id for tie-breaking */
    id: string;
}

/**
 * Encode a cursor from a pagination value and ID.
 */
export function encodeCursor(value: string, id: string): string {
    const payload: CursorPayload = { v: value, id };
    const json = JSON.stringify(payload);
    const data = Buffer.from(json).toString('base64url');
    const hmac = crypto.createHmac('sha256', CURSOR_SECRET).update(data).digest('base64url');
    return `${data}.${hmac}`;
}

/**
 * Decode and validate a cursor. Returns null if invalid.
 */
export function decodeCursor(cursor: string): CursorPayload | null {
    try {
        const [data, hmac] = cursor.split('.');
        if (!data || !hmac) return null;

        const expectedHmac = crypto.createHmac('sha256', CURSOR_SECRET).update(data).digest('base64url');
        if (hmac !== expectedHmac) return null;

        const json = Buffer.from(data, 'base64url').toString();
        const payload = JSON.parse(json) as CursorPayload;

        if (!payload.v || !payload.id) return null;
        return payload;
    } catch {
        return null;
    }
}
