import { describe, it, expect } from 'vitest';
import { sanitizeTxError } from '../processor';

describe('sanitizeTxError', () => {
    it('extracts InstructionError code from Solana error object', () => {
        const solanaErr = { InstructionError: [0, { Custom: 1 }] };
        const result = sanitizeTxError(JSON.stringify(solanaErr));
        expect(result).toBe('tx_error: InstructionError');
        expect(result.length).toBeLessThan(200);
    });

    it('preserves simple string errors', () => {
        expect(sanitizeTxError('submitted_timeout')).toBe('submitted_timeout');
    });

    it('truncates very long error messages', () => {
        const longError = 'x'.repeat(500);
        expect(sanitizeTxError(longError).length).toBeLessThanOrEqual(256);
    });

    it('strips JSON structure from complex error objects', () => {
        const complexErr = JSON.stringify({
            InstructionError: [2, { Custom: 6001 }],
            accounts: ['secret-account-data'],
        });
        const result = sanitizeTxError(complexErr);
        expect(result).not.toContain('secret-account-data');
    });

    it('handles non-JSON prefixed errors', () => {
        const err = 'Transaction failed: {"InstructionError":[0,"InvalidAccountData"]}';
        const result = sanitizeTxError(err);
        expect(result).toBe('tx_error: InstructionError');
    });
});
