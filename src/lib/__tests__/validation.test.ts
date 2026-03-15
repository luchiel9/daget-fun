import { describe, it, expect } from 'vitest';
import { createDagetSchema, updateDagetSchema } from '../validation';

describe('image_url validation', () => {
  describe('createDagetSchema', () => {
    // Minimal valid base for create schema
    const validBase = {
      name: 'Test',
      discord_guild_id: '12345678901234567',
      token_symbol: 'SOL' as const,
      amount_display: '1.0',
      total_winners: 1,
      daget_type: 'fixed' as const,
    };

    it('accepts HTTPS image URLs', () => {
      const result = createDagetSchema.safeParse({
        ...validBase,
        image_url: 'https://example.com/image.png',
      });
      expect(result.success).toBe(true);
    });

    it('rejects HTTP image URLs', () => {
      const result = createDagetSchema.safeParse({
        ...validBase,
        image_url: 'http://example.com/image.png',
      });
      expect(result.success).toBe(false);
    });

    it('rejects data: URIs', () => {
      const result = createDagetSchema.safeParse({
        ...validBase,
        image_url: 'data:image/png;base64,iVBOR',
      });
      expect(result.success).toBe(false);
    });

    it('accepts null image_url', () => {
      const result = createDagetSchema.safeParse({
        ...validBase,
        image_url: null,
      });
      expect(result.success).toBe(true);
    });

    it('accepts omitted image_url', () => {
      const result = createDagetSchema.safeParse(validBase);
      expect(result.success).toBe(true);
    });
  });

  describe('updateDagetSchema', () => {
    it('accepts HTTPS image URLs', () => {
      const result = updateDagetSchema.safeParse({
        image_url: 'https://cdn.example.com/nft.jpg',
      });
      expect(result.success).toBe(true);
    });

    it('rejects HTTP image URLs', () => {
      const result = updateDagetSchema.safeParse({
        image_url: 'http://cdn.example.com/nft.jpg',
      });
      expect(result.success).toBe(false);
    });

    it('accepts null to clear image', () => {
      const result = updateDagetSchema.safeParse({
        image_url: null,
      });
      expect(result.success).toBe(true);
    });
  });
});
