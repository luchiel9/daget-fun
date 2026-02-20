import { z } from 'zod';

/**
 * Solana base58 public key pattern (32-44 chars, base58 alphabet).
 */
const solanaAddressSchema = z.string()
    .min(32, 'Invalid Solana address')
    .max(44, 'Invalid Solana address')
    .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, 'Invalid Solana base58 address');

/**
 * POST /api/dagets — Create Daget
 */
export const createDagetSchema = z.object({
    name: z.string().min(1).max(120),
    message_html: z.string().optional(),
    discord_guild_id: z.string().min(1),
    discord_guild_name: z.string().optional(),
    discord_guild_icon: z.string().optional().nullable(),
    required_roles: z.array(z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        color: z.number().optional().nullable(),
    })).max(20).optional(),
    required_role_ids: z.array(z.string()).optional(), // Keep for backward compatibility or alternative input
    token_symbol: z.enum(['USDC', 'USDT', 'SOL']),
    amount_display: z.string().regex(
        /^\d+(\.\d{1,9})?$/,
        'Must be a positive decimal with max 9 fractional digits'
    ).refine((val) => parseFloat(val) > 0, 'Amount must be greater than 0'),
    total_winners: z.number().int().min(1).max(100000),
    daget_type: z.enum(['fixed', 'random']),
    random_min_percent: z.number().gt(0).lte(100).nullable().optional(),
    random_max_percent: z.number().gt(0).lte(100).nullable().optional(),
}).refine((data) => {
    if (data.daget_type === 'random') {
        return data.random_min_percent != null && data.random_max_percent != null
            && data.random_min_percent <= data.random_max_percent;
    }
    return data.random_min_percent == null && data.random_max_percent == null;
}, {
    message: 'Random mode requires valid min/max percentages; fixed mode must have null percentages',
});

export const updateDagetSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    message_html: z.string().optional(),
    discord_guild_id: z.string().min(1).optional(),
    discord_guild_name: z.string().optional(),
    discord_guild_icon: z.string().optional().nullable(),
    required_roles: z.array(z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        color: z.number().optional().nullable(),
    })).max(20).optional(),
    required_role_ids: z.array(z.string()).optional(),
    // Conditional fields (only allowed if no claims)
    token_symbol: z.enum(['USDC', 'USDT', 'SOL']).optional(),
    amount_display: z.string().regex(
        /^\d+(\.\d{1,9})?$/,
        'Must be a positive decimal with max 9 fractional digits'
    ).refine((val) => parseFloat(val) > 0, 'Amount must be greater than 0').optional(),
    total_winners: z.number().int().min(1).max(100000).optional(),
    daget_type: z.enum(['fixed', 'random']).optional(),
    random_min_percent: z.number().gt(0).lte(100).nullable().optional(),
    random_max_percent: z.number().gt(0).lte(100).nullable().optional(),
});

export type CreateDagetInput = z.infer<typeof createDagetSchema>;
export type UpdateDagetInput = z.infer<typeof updateDagetSchema>;

/**
 * POST /api/claims — Create Claim
 */
export const createClaimSchema = z.object({
    claim_slug: z.string().min(8).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid claim slug'),
    receiving_address: solanaAddressSchema,
});

export type CreateClaimInput = z.infer<typeof createClaimSchema>;

/**
 * Query params for paginated lists
 */
export const paginationSchema = z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * GET /api/dagets query params
 */
export const listDagetsSchema = paginationSchema.extend({
    status: z.enum(['active', 'stopped', 'closed']).optional(),
});

/**
 * Export key download
 */
export const exportKeyDownloadSchema = z.object({
    export_token: z.string().min(43).max(128),
});
