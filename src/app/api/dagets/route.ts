import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Errors, ErrorCodes } from '@/lib/errors';
import { db } from '@/db';
import { dagets, dagetRequirements, wallets } from '@/db/schema';
import { eq, and, desc, lt } from 'drizzle-orm';
import { createDagetSchema, listDagetsSchema } from '@/lib/validation';
import { checkIdempotency, storeIdempotency } from '@/lib/idempotency';
import { checkRateLimit, rateLimiters } from '@/lib/rate-limit';
import { getTokenConfig, displayToBaseUnits } from '@/lib/tokens';
import { encodeCursor, decodeCursor } from '@/lib/cursor';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import DOMPurify from 'isomorphic-dompurify';

const MESSAGE_SANITIZE_OPTS = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'img', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'width', 'height'],
    FORBID_ATTR: ['style', 'class', 'onerror', 'onload'],
    ALLOW_DATA_ATTR: false,
};

/**
 * POST /api/dagets — Create a new Daget.
 */
export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth();

        // Rate limit
        const limit = await checkRateLimit(rateLimiters.dagetsPerUser, user.id);
        if (!limit.success) return Errors.rateLimited();

        const body = await request.json();

        // Idempotency check
        const idempotencyKey = request.headers.get('Idempotency-Key');
        if (!idempotencyKey) {
            return Errors.validation('Idempotency-Key header is required');
        }
        const replay = await checkIdempotency(idempotencyKey, user.id, 'POST /api/dagets', body);
        if (replay) return replay;

        // Validate input
        const parsed = createDagetSchema.safeParse(body);
        if (!parsed.success) {
            return Errors.validation('Invalid input', { errors: parsed.error.flatten() });
        }
        const input = parsed.data;

        // Get active wallet
        const wallet = await db.query.wallets.findFirst({
            where: and(eq(wallets.userId, user.id), eq(wallets.isActive, true)),
        });
        if (!wallet) {
            return Errors.validation('No active wallet. Please generate a wallet first.');
        }

        // Check for existing active Daget
        const activeDaget = await db.query.dagets.findFirst({
            where: and(eq(dagets.creatorUserId, user.id), eq(dagets.status, 'active')),
        });
        if (activeDaget) {
            return Errors.conflict(ErrorCodes.DAGET_ACTIVE_EXISTS, 'You already have an active Daget. Stop or wait for it to complete.');
        }

        // Derive token config
        const tokenConfig = getTokenConfig(input.token_symbol);
        const totalAmountBaseUnits = displayToBaseUnits(input.amount_display, tokenConfig.decimals);

        // Generate unguessable claim slug (CSPRNG, 128+ bits, base62)
        const claimSlug = nanoid(22);

        // Convert random percentages to bps
        const randomMinBps = input.random_min_percent != null
            ? Math.round(input.random_min_percent * 100)
            : null;
        const randomMaxBps = input.random_max_percent != null
            ? Math.round(input.random_max_percent * 100)
            : null;

        // Create Daget
        const [newDaget] = await db.insert(dagets).values({
            claimSlug,
            creatorUserId: user.id,
            creatorWalletId: wallet.id,
            name: input.name,
            messageHtml: input.message_html
                ? DOMPurify.sanitize(input.message_html, MESSAGE_SANITIZE_OPTS)
                : null,
            tokenSymbol: input.token_symbol,
            tokenMint: tokenConfig.mint,
            tokenDecimals: tokenConfig.decimals,
            totalAmountBaseUnits,
            totalWinners: input.total_winners,
            dagetType: input.daget_type,
            randomMinBps,
            randomMaxBps,
            status: 'active',
            discordGuildName: input.discord_guild_name,
            discordGuildIcon: input.discord_guild_icon,
        }).returning();

        // Insert requirements
        // Handle both structured roles and legacy string IDs
        const rolesToInsert = [];
        if (input.required_roles && input.required_roles.length > 0) {
            rolesToInsert.push(...input.required_roles.map(r => ({ id: r.id, name: r.name, color: r.color })));
        } else if (input.required_role_ids && input.required_role_ids.length > 0) {
            rolesToInsert.push(...input.required_role_ids.map(id => ({ id, name: null, color: null })));
        }

        if (rolesToInsert.length > 0) {
            await db.insert(dagetRequirements).values(
                rolesToInsert.map((role) => ({
                    dagetId: newDaget.id,
                    discordGuildId: input.discord_guild_id,
                    discordRoleId: role.id,
                    discordRoleNameSnapshot: role.name,
                    discordRoleColor: role.color,
                })),
            );
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://daget.fun';
        const responseBody = {
            daget_id: newDaget.id,
            claim_slug: claimSlug,
            status: 'active',
            claim_url: `${appUrl}/open/${claimSlug}`,
        };

        // Store idempotency
        await storeIdempotency(idempotencyKey, user.id, 'POST /api/dagets', body, 201, responseBody);

        return NextResponse.json(responseBody, { status: 201 });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        console.error('Create daget error:', error);
        return Errors.internal();
    }
}

/**
 * GET /api/dagets — List creator's Dagets with cursor pagination.
 */
export async function GET(request: NextRequest) {
    try {
        const user = await requireAuth();

        const { searchParams } = new URL(request.url);
        const parsed = listDagetsSchema.safeParse({
            cursor: searchParams.get('cursor') || undefined,
            limit: searchParams.get('limit') || 20,
            status: searchParams.get('status') || undefined,
        });

        if (!parsed.success) {
            return Errors.validation('Invalid query parameters');
        }
        const { cursor, limit, status } = parsed.data;

        // Build query conditions
        const conditions: any[] = [eq(dagets.creatorUserId, user.id)];
        if (status) {
            conditions.push(eq(dagets.status, status));
        }

        // Cursor-based pagination
        if (cursor) {
            const decoded = decodeCursor(cursor);
            if (!decoded) return Errors.validation('Invalid cursor');
            conditions.push(lt(dagets.createdAt, new Date(decoded.v)));
        }

        const results = await db.query.dagets.findMany({
            where: and(...conditions),
            orderBy: [desc(dagets.createdAt)],
            limit: limit + 1,
        });

        const hasMore = results.length > limit;
        const items = results.slice(0, limit);
        const nextCursor = hasMore && items.length > 0
            ? encodeCursor(items[items.length - 1].createdAt.toISOString(), items[items.length - 1].id)
            : null;

        return NextResponse.json({
            items: items.map((d) => ({
                daget_id: d.id,
                name: d.name,
                status: d.status,
                token_symbol: d.tokenSymbol,
                total_winners: d.totalWinners,
                claimed_count: d.claimedCount,
                created_at: d.createdAt.toISOString(),
                claim_slug: d.claimSlug,
            })),
            next_cursor: nextCursor,
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        console.error('List dagets error:', error);
        return Errors.internal();
    }
}
