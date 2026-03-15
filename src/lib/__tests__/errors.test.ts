import { describe, it, expect } from 'vitest';
import { Errors, errorResponse, ErrorCodes } from '../errors';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function parseResponse(response: Response) {
    return {
        status: response.status,
        body: await response.json(),
    };
}

describe('Errors helpers', () => {
    it('unauthorized() returns 401 with AUTH_REQUIRED code', async () => {
        const { status, body } = await parseResponse(Errors.unauthorized());
        expect(status).toBe(401);
        expect(body.error.code).toBe('AUTH_REQUIRED');
        expect(body.error.message).toBe('Authentication required');
    });

    it('forbidden() returns 403 with FORBIDDEN code', async () => {
        const { status, body } = await parseResponse(Errors.forbidden());
        expect(status).toBe(403);
        expect(body.error.code).toBe('FORBIDDEN');
    });

    it('notFound("Daget") returns 404 with message "Daget not found"', async () => {
        const { status, body } = await parseResponse(Errors.notFound('Daget'));
        expect(status).toBe(404);
        expect(body.error.code).toBe('NOT_FOUND');
        expect(body.error.message).toBe('Daget not found');
    });

    it('validation("bad input") returns 400 with VALIDATION_ERROR code', async () => {
        const { status, body } = await parseResponse(Errors.validation('bad input'));
        expect(status).toBe(400);
        expect(body.error.code).toBe('VALIDATION_ERROR');
        expect(body.error.message).toBe('bad input');
    });

    it('rateLimited() returns 429', async () => {
        const { status, body } = await parseResponse(Errors.rateLimited());
        expect(status).toBe(429);
        expect(body.error.code).toBe('RATE_LIMITED');
    });

    it('conflict(code, msg) returns 409', async () => {
        const { status, body } = await parseResponse(
            Errors.conflict(ErrorCodes.DAGET_ACTIVE_EXISTS, 'Already exists'),
        );
        expect(status).toBe(409);
        expect(body.error.code).toBe('DAGET_ACTIVE_EXISTS');
        expect(body.error.message).toBe('Already exists');
    });

    it('internal() returns 500', async () => {
        const { status, body } = await parseResponse(Errors.internal());
        expect(status).toBe(500);
        expect(body.error.code).toBe('INTERNAL_ERROR');
        expect(body.error.message).toBe('Internal server error');
    });

    it('all responses include request_id in UUID format', async () => {
        const responses = [
            Errors.unauthorized(),
            Errors.forbidden(),
            Errors.notFound(),
            Errors.validation('test'),
            Errors.rateLimited(),
            Errors.conflict(ErrorCodes.DAGET_ACTIVE_EXISTS, 'test'),
            Errors.internal(),
        ];

        for (const response of responses) {
            const { body } = await parseResponse(response);
            expect(body.request_id).toMatch(UUID_RE);
        }
    });
});

describe('errorResponse', () => {
    it('includes details when provided', async () => {
        const details = { field: 'email', reason: 'invalid format' };
        const { body } = await parseResponse(
            errorResponse(ErrorCodes.VALIDATION_ERROR, 'Validation failed', 400, details),
        );
        expect(body.error.details).toEqual(details);
    });

    it('omits details when not provided', async () => {
        const { body } = await parseResponse(
            errorResponse(ErrorCodes.INTERNAL_ERROR, 'Something broke', 500),
        );
        expect(body.error).not.toHaveProperty('details');
    });
});
