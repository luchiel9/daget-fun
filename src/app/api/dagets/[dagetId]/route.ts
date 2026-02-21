import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { Errors } from '@/lib/errors';
import { db } from '@/db';
import { dagets, claims, dagetRequirements } from '@/db/schema';
import { eq, and, desc, lt } from 'drizzle-orm';
import { paginationSchema, updateDagetSchema } from '@/lib/validation';
import { encodeCursor, decodeCursor } from '@/lib/cursor';
import { getTokenConfig, displayToBaseUnits } from '@/lib/tokens';
import DOMPurify from 'isomorphic-dompurify';

const MESSAGE_SANITIZE_OPTS = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'img', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'width', 'height'],
    FORBID_ATTR: ['style', 'class', 'onerror', 'onload'],
    ALLOW_DATA_ATTR: false,
};

/**
 * GET /api/dagets/:dagetId — Daget detail with claim list (creator only).
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ dagetId: string }> },
) {
    try {
        const user = await requireAuth();
        const { dagetId } = await params;

        // Get Daget
        const daget = await db.query.dagets.findFirst({
            where: eq(dagets.id, dagetId),
        });

        if (!daget) return Errors.notFound('Daget');
        if (daget.creatorUserId !== user.id) return Errors.forbidden('Not the creator');

        // Parse pagination for claims
        const { searchParams } = new URL(request.url);
        const parsed = paginationSchema.safeParse({
            cursor: searchParams.get('cursor') || undefined,
            limit: searchParams.get('limit') || 20,
        });
        if (!parsed.success) return Errors.validation('Invalid query');
        const { cursor, limit } = parsed.data;

        // Build claim query
        const claimConditions: any[] = [eq(claims.dagetId, dagetId)];
        if (cursor) {
            const decoded = decodeCursor(cursor);
            if (!decoded) return Errors.validation('Invalid cursor');
            claimConditions.push(lt(claims.createdAt, new Date(decoded.v)));
        }

        const claimResults = await db.query.claims.findMany({
            where: and(...claimConditions),
            orderBy: [desc(claims.createdAt)],
            limit: limit + 1,
            with: {
                claimant: true,
            },
        });

        const hasMore = claimResults.length > limit;
        const claimItems = claimResults.slice(0, limit);
        const nextCursor = hasMore && claimItems.length > 0
            ? encodeCursor(claimItems[claimItems.length - 1].createdAt.toISOString(), claimItems[claimItems.length - 1].id)
            : null;

        // Fetch requirements
        const requirements = await db.query.dagetRequirements.findMany({
            where: eq(dagetRequirements.dagetId, dagetId),
        });

        return NextResponse.json({
            daget_id: daget.id,
            name: daget.name,
            status: daget.status,
            token_symbol: daget.tokenSymbol,
            total_amount_base_units: daget.totalAmountBaseUnits,
            total_winners: daget.totalWinners,
            claimed_count: daget.claimedCount,
            daget_type: daget.dagetType,
            random_min_bps: daget.randomMinBps,
            random_max_bps: daget.randomMaxBps,
            message_html: daget.messageHtml,
            claim_slug: daget.claimSlug,
            discord_guild_id: requirements[0]?.discordGuildId,
            discord_guild_name: daget.discordGuildName,
            discord_guild_icon: daget.discordGuildIcon,
            requirements: requirements.map(r => ({
                id: r.discordRoleId,
                name: r.discordRoleNameSnapshot,
                color: r.discordRoleColor,
            })),
            created_at: daget.createdAt.toISOString(),
            claims: claimItems.map((c) => ({
                claim_id: c.id,
                claimant_discord_name: c.claimant.discordUsername || 'Unknown',
                claimant_discord_avatar: c.claimant.discordAvatarUrl,
                status: c.status,
                amount_base_units: c.amountBaseUnits,
                tx_signature: c.txSignature,
                created_at: c.createdAt.toISOString(),
            })),
            next_cursor: nextCursor,
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        console.error('Daget detail error:', error);
        return Errors.internal();
    }
}

/**
 * PATCH /api/dagets/:dagetId — Update Daget details.
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ dagetId: string }> },
) {
    try {
        const user = await requireAuth();
        const { dagetId } = await params;
        const body = await request.json();

        // Validate input
        const parsed = updateDagetSchema.safeParse(body);
        if (!parsed.success) {
            return Errors.validation('Invalid input', { errors: parsed.error.flatten() });
        }
        const input = parsed.data;

        // Get Daget
        const daget = await db.query.dagets.findFirst({
            where: eq(dagets.id, dagetId),
        });

        if (!daget) return Errors.notFound('Daget');
        if (daget.creatorUserId !== user.id) return Errors.forbidden('Not the creator');

        // Check for existing claims
        const hasClaims = daget.claimedCount > 0;

        // Prevent modification of reward pool if claims exist
        if (hasClaims) {
            if (input.token_symbol || input.amount_display || input.total_winners || input.daget_type) {
                return Errors.conflict('CANNOT_EDIT_REWARD_POOL', 'Cannot edit reward pool details after claims have started.');
            }
        }

        // Prepare updates
        const updates: any = {};
        if (input.name) updates.name = input.name;
        if (input.message_html !== undefined) {
            updates.messageHtml = input.message_html
                ? DOMPurify.sanitize(input.message_html, MESSAGE_SANITIZE_OPTS)
                : null;
        }
        if (input.discord_guild_name !== undefined) updates.discordGuildName = input.discord_guild_name;
        if (input.discord_guild_icon !== undefined) updates.discordGuildIcon = input.discord_guild_icon;

        // If no claims, allow updating everything
        if (!hasClaims) {
            if (input.token_symbol) {
                const config = getTokenConfig(input.token_symbol);
                updates.tokenSymbol = input.token_symbol;
                updates.tokenMint = config.mint;
                updates.tokenDecimals = config.decimals;
            }
            if (input.amount_display) {
                // We need token decimals to convert. Use existing or new one.
                const decimals = updates.tokenDecimals || daget.tokenDecimals;
                updates.totalAmountBaseUnits = displayToBaseUnits(input.amount_display, decimals);
            }
            if (input.total_winners) updates.totalWinners = input.total_winners;
            if (input.daget_type) updates.dagetType = input.daget_type;

            if (input.daget_type === 'random') {
                if (input.random_min_percent != null) updates.randomMinBps = Math.round(input.random_min_percent * 100);
                if (input.random_max_percent != null) updates.randomMaxBps = Math.round(input.random_max_percent * 100);
            } else if (input.daget_type === 'fixed') {
                updates.randomMinBps = null;
                updates.randomMaxBps = null;
            }
        }

        if (Object.keys(updates).length > 0) {
            await db.update(dagets)
                .set({ ...updates, updatedAt: new Date() })
                .where(eq(dagets.id, dagetId));
        }

        // Handle Requirements Update — atomic delete + insert in a transaction.
        // Without a transaction there is a window where a claim request arrives
        // after the delete but before the insert and sees no requirements (open to all).
        if (input.required_roles || input.required_role_ids) {
            const rolesToInsert: Array<{ id: string; name: string | null | undefined; color: number | null | undefined }> = [];
            if (input.required_roles && input.required_roles.length > 0) {
                rolesToInsert.push(...input.required_roles.map(r => ({ id: r.id, name: r.name, color: r.color })));
            } else if (input.required_role_ids && input.required_role_ids.length > 0) {
                rolesToInsert.push(...input.required_role_ids.map(id => ({ id, name: null, color: null })));
            }

            await db.transaction(async (tx) => {
                // Read the existing guild_id BEFORE deleting so we can fall back to it
                // if the caller doesn't provide one (prevents silent guild_id erasure).
                const existingReq = await tx.query.dagetRequirements.findFirst({
                    where: eq(dagetRequirements.dagetId, dagetId),
                });
                const guildId = input.discord_guild_id || existingReq?.discordGuildId;

                await tx.delete(dagetRequirements).where(eq(dagetRequirements.dagetId, dagetId));

                if (rolesToInsert.length > 0 && guildId) {
                    await tx.insert(dagetRequirements).values(
                        rolesToInsert.map((role) => ({
                            dagetId: dagetId,
                            discordGuildId: guildId,
                            discordRoleId: role.id,
                            discordRoleNameSnapshot: role.name ?? null,
                            discordRoleColor: role.color ?? null,
                        })),
                    );
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
            return Errors.unauthorized();
        }
        console.error('Daget update error:', error);
        return Errors.internal();
    }
}
