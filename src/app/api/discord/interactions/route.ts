import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/db';
import { users, claims, dagets } from '@/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import {
    verifyInteractionSignature,
    editInteractionResponse,
    getGuildMemberRoles,
    updateRaffleEmbed,
    buildRaffleEmbedData,
    InteractionType,
    InteractionResponseType,
    MessageFlags,
} from '@/lib/discord-bot';

/**
 * POST /api/discord/interactions
 * Discord HTTP Interactions endpoint. Handles all webhook callbacks:
 * - PING (health check)
 * - Button clicks (Enter Raffle, Change Address)
 * - Modal submits (Solana address entry)
 */
export async function POST(request: NextRequest) {
    // Read raw body BEFORE any JSON parsing (required for signature verification)
    const rawBody = await request.text();
    const signature = request.headers.get('X-Signature-Ed25519');
    const timestamp = request.headers.get('X-Signature-Timestamp');

    if (!signature || !timestamp) {
        return new NextResponse('Missing signature headers', { status: 401 });
    }

    let isValid = false;
    try {
        isValid = verifyInteractionSignature(rawBody, signature, timestamp);
    } catch (err) {
        console.error('[discord-interactions] Signature verification error:', err);
        return new NextResponse('Signature verification failed', { status: 401 });
    }
    if (!isValid) {
        return new NextResponse('Invalid signature', { status: 401 });
    }

    const interaction = JSON.parse(rawBody);

    // PING — Discord health check
    if (interaction.type === InteractionType.PING) {
        return NextResponse.json({ type: InteractionResponseType.PONG });
    }

    // Button click
    if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
        return handleButtonClick(interaction);
    }

    // Modal submit
    if (interaction.type === InteractionType.MODAL_SUBMIT) {
        return handleModalSubmit(interaction);
    }

    return NextResponse.json(
        { type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content: 'Unknown interaction type', flags: MessageFlags.EPHEMERAL } },
    );
}

// ─── Button Click Handler ───────────────────────────────────────────────────

async function handleButtonClick(interaction: Record<string, unknown>) {
    const data = interaction.data as { custom_id: string };
    const customId = data.custom_id;
    const discordUser = (interaction.member as { user: { id: string; username: string; avatar?: string } })?.user
        ?? interaction.user as { id: string; username: string; avatar?: string };

    // "Enter Raffle" button
    if (customId.startsWith('raffle_enter:')) {
        return handleRaffleEntry(interaction, customId, discordUser);
    }

    // "Change Address" button
    if (customId.startsWith('raffle_change:')) {
        return handleChangeAddress(interaction, customId, discordUser);
    }

    return deferredEphemeral();
}

// ─── Enter Raffle ───────────────────────────────────────────────────────────

async function handleRaffleEntry(
    interaction: Record<string, unknown>,
    customId: string,
    discordUser: { id: string; username: string; avatar?: string },
) {
    const dagetId = customId.replace('raffle_enter:', '');
    const interactionToken = interaction.token as string;

    // Quick DB lookup: does this user exist and have a prior address?
    const existingUser = await db.query.users.findFirst({
        where: eq(users.discordUserId, discordUser.id),
    });

    if (existingUser) {
        // Check if already entered this raffle
        const existingClaim = await db.query.claims.findFirst({
            where: and(
                eq(claims.dagetId, dagetId),
                eq(claims.claimantUserId, existingUser.id),
            ),
        });

        if (existingClaim && existingClaim.status !== 'released') {
            // Already entered — respond immediately
            return NextResponse.json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `You have already entered this raffle.`,
                    flags: MessageFlags.EPHEMERAL,
                },
            });
        }

        // Get most recent receiving address from any prior claim
        const lastClaim = await db.query.claims.findFirst({
            where: eq(claims.claimantUserId, existingUser.id),
            orderBy: desc(claims.createdAt),
        });

        if (lastClaim?.receivingAddress) {
            // Returning user with known address — defer and process async
            const response = NextResponse.json({
                type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
                data: { flags: MessageFlags.EPHEMERAL },
            });

            // Process entry asynchronously (don't await)
            processRaffleEntry(
                dagetId,
                existingUser,
                lastClaim.receivingAddress,
                interactionToken,
                discordUser,
                interaction.guild_id as string | undefined,
            ).catch((err) => console.error('[discord-interactions] Entry processing error:', err));

            return response;
        }
    }

    // New user or no prior address — show modal
    return NextResponse.json({
        type: InteractionResponseType.MODAL,
        data: {
            custom_id: `raffle_modal:${dagetId}`,
            title: 'Enter Raffle',
            components: [{
                type: 1, // ACTION_ROW
                components: [{
                    type: 4, // TEXT_INPUT
                    custom_id: 'solana_address',
                    label: 'Solana Wallet Address',
                    style: 1, // SHORT
                    min_length: 32,
                    max_length: 44,
                    required: true,
                    placeholder: 'Your Solana address (base58)',
                }],
            }],
        },
    });
}

// ─── Change Address ─────────────────────────────────────────────────────────

async function handleChangeAddress(
    _interaction: Record<string, unknown>,
    customId: string,
    discordUser: { id: string; username: string; avatar?: string },
) {
    const dagetId = customId.replace('raffle_change:', '');

    // Check raffle is still active and draw hasn't started
    const existingUser = await db.query.users.findFirst({
        where: eq(users.discordUserId, discordUser.id),
    });

    if (existingUser) {
        const existingClaim = await db.query.claims.findFirst({
            where: and(
                eq(claims.dagetId, dagetId),
                eq(claims.claimantUserId, existingUser.id),
            ),
        });

        // Block if draw has happened (is_raffle_winner is not null)
        if (existingClaim && existingClaim.isRaffleWinner !== null) {
            return NextResponse.json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: 'This raffle has already been drawn. You cannot change your address.',
                    flags: MessageFlags.EPHEMERAL,
                },
            });
        }
    }

    // Check raffle status
    const daget = await db.query.dagets.findFirst({
        where: eq(dagets.id, dagetId),
    });

    if (!daget || daget.status !== 'active') {
        return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: daget?.status === 'drawing'
                    ? 'Raffle draw is in progress. You cannot change your address.'
                    : 'This raffle is no longer active.',
                flags: MessageFlags.EPHEMERAL,
            },
        });
    }

    return NextResponse.json({
        type: InteractionResponseType.MODAL,
        data: {
            custom_id: `raffle_change_modal:${dagetId}`,
            title: 'Change Wallet Address',
            components: [{
                type: 1,
                components: [{
                    type: 4,
                    custom_id: 'solana_address',
                    label: 'New Solana Wallet Address',
                    style: 1,
                    min_length: 32,
                    max_length: 44,
                    required: true,
                    placeholder: 'Your Solana address (base58)',
                }],
            }],
        },
    });
}

// ─── Modal Submit Handler ───────────────────────────────────────────────────

async function handleModalSubmit(interaction: Record<string, unknown>) {
    const data = interaction.data as {
        custom_id: string;
        components: Array<{ components: Array<{ custom_id: string; value: string }> }>;
    };
    const customId = data.custom_id;
    const interactionToken = interaction.token as string;
    const discordUser = (interaction.member as { user: { id: string; username: string; avatar?: string } })?.user
        ?? interaction.user as { id: string; username: string; avatar?: string };
    const guildId = interaction.guild_id as string | undefined;

    const solanaAddress = data.components?.[0]?.components?.[0]?.value?.trim();

    if (!solanaAddress || solanaAddress.length < 32 || solanaAddress.length > 44) {
        return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: 'Invalid Solana address. Must be 32-44 characters.',
                flags: MessageFlags.EPHEMERAL,
            },
        });
    }

    // Validate base58 (Solana addresses are base58-encoded)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(solanaAddress)) {
        return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: 'Invalid Solana address format.',
                flags: MessageFlags.EPHEMERAL,
            },
        });
    }

    // Defer — heavy operations follow (user creation, role check, claim insert)
    const response = NextResponse.json({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
        data: { flags: MessageFlags.EPHEMERAL },
    });

    if (customId.startsWith('raffle_modal:')) {
        const dagetId = customId.replace('raffle_modal:', '');

        // Find or create user, then create entry
        processModalEntry(
            dagetId,
            solanaAddress,
            discordUser,
            interactionToken,
            guildId,
        ).catch((err) => console.error('[discord-interactions] Modal entry error:', err));
    } else if (customId.startsWith('raffle_change_modal:')) {
        const dagetId = customId.replace('raffle_change_modal:', '');

        processAddressChange(
            dagetId,
            solanaAddress,
            discordUser,
            interactionToken,
        ).catch((err) => console.error('[discord-interactions] Address change error:', err));
    }

    return response;
}

// ─── Async Processing Functions ─────────────────────────────────────────────

async function processRaffleEntry(
    dagetId: string,
    user: { id: string; discordUserId: string },
    receivingAddress: string,
    interactionToken: string,
    discordUser: { id: string; username: string; avatar?: string },
    guildId?: string,
) {
    try {
        const daget = await db.query.dagets.findFirst({
            where: eq(dagets.id, dagetId),
            with: { requirements: true },
        });

        if (!daget) {
            await editInteractionResponse(interactionToken, 'Raffle not found.');
            return;
        }

        if (daget.status !== 'active') {
            const msg = daget.status === 'drawing'
                ? 'Raffle draw is in progress.'
                : 'This raffle is no longer active.';
            await editInteractionResponse(interactionToken, msg);
            return;
        }

        if (daget.dagetType !== 'raffle') {
            await editInteractionResponse(interactionToken, 'This is not a raffle.');
            return;
        }

        if (daget.raffleEndsAt && new Date() >= daget.raffleEndsAt) {
            await editInteractionResponse(interactionToken, 'This raffle has ended.');
            return;
        }

        // Discord role verification (if role-gated)
        if (daget.requirements && daget.requirements.length > 0 && !guildId) {
            await editInteractionResponse(interactionToken, 'Role verification requires a server context. Please enter from the server channel.');
            return;
        }
        if (daget.requirements && daget.requirements.length > 0 && guildId) {
            const requiredRoleIds = daget.requirements.map((r) => r.discordRoleId);
            const { roles, inGuild } = await getGuildMemberRoles(guildId, discordUser.id);

            if (!inGuild) {
                await editInteractionResponse(interactionToken, 'You are not a member of this server.');
                return;
            }

            const hasRole = requiredRoleIds.some((rid) => roles.includes(rid));
            if (!hasRole) {
                await editInteractionResponse(interactionToken, 'You do not have the required role to enter this raffle.');
                return;
            }
        }

        // Insert claim (atomic)
        await db.transaction(async (tx) => {
            // Lock daget row
            const result = await tx.execute(
                sql`SELECT id, status, claimed_count FROM dagets WHERE id = ${dagetId} AND status = 'active' FOR UPDATE`,
            );
            const locked = result[0];
            if (!locked) throw new Error('RAFFLE_NOT_ACTIVE');

            // Check for existing entry (idempotent)
            const existing = await tx.query.claims.findFirst({
                where: and(
                    eq(claims.dagetId, dagetId),
                    eq(claims.claimantUserId, user.id),
                ),
            });

            if (existing && existing.status !== 'released') {
                throw new Error('ALREADY_ENTERED');
            }

            // Check wallet reuse (sybil protection)
            const walletUsed = await tx.query.claims.findFirst({
                where: and(
                    eq(claims.dagetId, dagetId),
                    eq(claims.receivingAddress, receivingAddress),
                ),
            });
            if (walletUsed && walletUsed.claimantUserId !== user.id) {
                throw new Error('WALLET_ALREADY_USED');
            }

            if (existing && existing.status === 'released') {
                // Re-enter with released claim
                await tx.execute(sql`
                    UPDATE claims SET
                        status = 'created',
                        receiving_address = ${receivingAddress},
                        amount_base_units = NULL,
                        is_raffle_winner = NULL,
                        released_at = NULL,
                        updated_at = now()
                    WHERE id = ${existing.id}
                `);
            } else {
                await tx.insert(claims).values({
                    dagetId,
                    claimantUserId: user.id,
                    receivingAddress,
                    idempotencyKey: `discord:${discordUser.id}:${dagetId}`,
                    status: 'created',
                    amountBaseUnits: null,
                    isRaffleWinner: null,
                });
            }

            // Increment entry count
            await tx.execute(sql`
                UPDATE dagets SET claimed_count = claimed_count + 1, updated_at = now()
                WHERE id = ${dagetId}
            `);
        });

        await editInteractionResponse(
            interactionToken,
            `You have entered **${daget.name}** with following wallet:\n\`${receivingAddress}\``,
            [{
                type: 1,
                components: [{
                    type: 2,
                    style: 2, // SECONDARY
                    label: 'Change Address',
                    custom_id: `raffle_change:${dagetId}`,
                }],
            }],
        );

        // Update Discord embed entry count (best-effort)
        if (daget.discordChannelId && daget.discordMessageId) {
            (async () => {
                const [refreshed, creator] = await Promise.all([
                    db.query.dagets.findFirst({ where: eq(dagets.id, dagetId) }),
                    db.query.users.findFirst({ where: eq(users.id, daget.creatorUserId) }),
                ]);
                if (refreshed?.discordChannelId && refreshed.discordMessageId) {
                    await updateRaffleEmbed(
                        refreshed.discordChannelId,
                        refreshed.discordMessageId,
                        buildRaffleEmbedData(refreshed, creator?.discordUserId ?? null),
                    );
                }
            })().catch((err) => console.error('[discord-interactions] embed update error:', err));
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';

        if (message === 'ALREADY_ENTERED') {
            await editInteractionResponse(interactionToken, 'You have already entered this raffle.');
        } else if (message === 'WALLET_ALREADY_USED') {
            await editInteractionResponse(interactionToken, 'This wallet address is already used by another entry.');
        } else if (message === 'RAFFLE_NOT_ACTIVE') {
            await editInteractionResponse(interactionToken, 'This raffle is no longer active.');
        } else {
            console.error('[discord-interactions] processRaffleEntry error:', err);
            await editInteractionResponse(interactionToken, 'Something went wrong. Please try again.');
        }
    }
}

async function processModalEntry(
    dagetId: string,
    solanaAddress: string,
    discordUser: { id: string; username: string; avatar?: string },
    interactionToken: string,
    guildId?: string,
) {
    try {
        // Find or create user
        let user = await db.query.users.findFirst({
            where: eq(users.discordUserId, discordUser.id),
        });

        if (!user) {
            // Use onConflictDoNothing + re-fetch to handle race conditions
            const inserted = await db.insert(users).values({
                discordUserId: discordUser.id,
                discordUsername: discordUser.username,
                discordAvatarUrl: discordUser.avatar
                    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
                    : null,
                receivingAddress: solanaAddress,
            }).onConflictDoNothing({ target: users.discordUserId }).returning();

            user = inserted[0] ?? await db.query.users.findFirst({
                where: eq(users.discordUserId, discordUser.id),
            });

            if (!user) {
                await editInteractionResponse(interactionToken, 'Failed to create user. Please try again.');
                return;
            }
        }

        // Delegate to the shared entry logic
        await processRaffleEntry(
            dagetId,
            user,
            solanaAddress,
            interactionToken,
            discordUser,
            guildId,
        );
    } catch (err) {
        console.error('[discord-interactions] processModalEntry error:', err);
        await editInteractionResponse(interactionToken, 'Something went wrong. Please try again.');
    }
}

async function processAddressChange(
    dagetId: string,
    newAddress: string,
    discordUser: { id: string; username: string; avatar?: string },
    interactionToken: string,
) {
    try {
        const user = await db.query.users.findFirst({
            where: eq(users.discordUserId, discordUser.id),
        });

        if (!user) {
            await editInteractionResponse(interactionToken, 'You have not entered this raffle.');
            return;
        }

        const existingClaim = await db.query.claims.findFirst({
            where: and(
                eq(claims.dagetId, dagetId),
                eq(claims.claimantUserId, user.id),
            ),
        });

        if (!existingClaim || existingClaim.status === 'released') {
            await editInteractionResponse(interactionToken, 'You have not entered this raffle.');
            return;
        }

        // Block if draw happened
        if (existingClaim.isRaffleWinner !== null) {
            await editInteractionResponse(interactionToken, 'This raffle has already been drawn. You cannot change your address.');
            return;
        }

        // Atomic wallet-reuse check + update (prevents sybil race condition)
        await db.transaction(async (tx) => {
            // Lock the claim row
            const lockResult = await tx.execute(
                sql`SELECT id FROM claims WHERE id = ${existingClaim.id} AND is_raffle_winner IS NULL FOR UPDATE`,
            );
            if (!lockResult[0]) throw new Error('DRAW_STARTED');

            // Check wallet reuse
            const walletUsed = await tx.query.claims.findFirst({
                where: and(
                    eq(claims.dagetId, dagetId),
                    eq(claims.receivingAddress, newAddress),
                ),
            });
            if (walletUsed && walletUsed.claimantUserId !== user.id) {
                throw new Error('WALLET_ALREADY_USED');
            }

            await tx.execute(sql`
                UPDATE claims SET receiving_address = ${newAddress}
                WHERE id = ${existingClaim.id} AND is_raffle_winner IS NULL
            `);
        });

        const daget = await db.query.dagets.findFirst({
            where: eq(dagets.id, dagetId),
        });

        await editInteractionResponse(
            interactionToken,
            `Address updated for **${daget?.name ?? 'raffle'}**.\nNew wallet: \`${newAddress}\``,
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (message === 'DRAW_STARTED') {
            await editInteractionResponse(interactionToken, 'This raffle has already been drawn. You cannot change your address.');
        } else if (message === 'WALLET_ALREADY_USED') {
            await editInteractionResponse(interactionToken, 'This wallet address is already used by another entry.');
        } else {
            console.error('[discord-interactions] processAddressChange error:', err);
            await editInteractionResponse(interactionToken, 'Something went wrong. Please try again.');
        }
    }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function deferredEphemeral() {
    return NextResponse.json({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
        data: { flags: MessageFlags.EPHEMERAL },
    });
}
