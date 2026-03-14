/**
 * Discord bot API helpers for raffle features.
 * Handles embeds, announcements, role checking via bot token,
 * and interaction signature verification.
 *
 * Uses the same Redis cache as discord-verify.ts for role lookups
 * (key format: discord:roles:{userId}:{guildId}, 5-min TTL).
 */

import { verify as cryptoVerify } from 'node:crypto';
import { getRedis, isRedisReady } from '@/lib/redis';

const DISCORD_API = 'https://discord.com/api/v10';
const DISCORD_ROLE_CACHE_TTL = 30; // 30s — short enough to detect newly assigned roles

/** Discord permission bit flags (using BigInt() for ES2017 compat) */
export const DiscordPermissions = {
    SEND_MESSAGES: BigInt(1) << BigInt(11),
    EMBED_LINKS: BigInt(1) << BigInt(14),
    READ_MESSAGE_HISTORY: BigInt(1) << BigInt(16),
    VIEW_CHANNEL: BigInt(1) << BigInt(10),
} as const;

/** Discord interaction types */
export const InteractionType = {
    PING: 1,
    APPLICATION_COMMAND: 2,
    MESSAGE_COMPONENT: 3,
    APPLICATION_COMMAND_AUTOCOMPLETE: 4,
    MODAL_SUBMIT: 5,
} as const;

/** Discord interaction response types */
export const InteractionResponseType = {
    PONG: 1,
    CHANNEL_MESSAGE_WITH_SOURCE: 4,
    DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
    DEFERRED_UPDATE_MESSAGE: 6,
    UPDATE_MESSAGE: 7,
    APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
    MODAL: 9,
} as const;

/** Discord message flags */
export const MessageFlags = {
    EPHEMERAL: 1 << 6,
} as const;

function getBotToken(): string {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) throw new Error('DISCORD_BOT_TOKEN is not set');
    return token;
}

function getPublicKey(): string {
    const key = process.env.DISCORD_PUBLIC_KEY;
    if (!key) throw new Error('DISCORD_PUBLIC_KEY is not set');
    return key;
}

function getAppId(): string {
    const id = process.env.DISCORD_CLIENT_ID;
    if (!id) throw new Error('DISCORD_CLIENT_ID is not set');
    return id;
}

/**
 * Rate-limit aware Discord API fetch. Respects Retry-After headers.
 */
async function discordFetch(
    path: string,
    options: RequestInit = {},
    maxRetries = 2,
): Promise<Response> {
    const url = path.startsWith('https://') ? path : `${DISCORD_API}${path}`;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const res = await fetch(url, {
            ...options,
            headers: {
                Authorization: `Bot ${getBotToken()}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
            signal: options.signal ?? AbortSignal.timeout(15_000),
        });

        if (res.status === 429) {
            const retryAfter = parseFloat(res.headers.get('Retry-After') ?? '1') || 1;
            const waitMs = Math.min(retryAfter * 1000, 10_000);
            if (attempt < maxRetries) {
                await new Promise((r) => setTimeout(r, waitMs));
                continue;
            }
        }

        return res;
    }

    // Unreachable, but TypeScript needs it
    throw new Error('Discord API rate limit exceeded after retries');
}

// ─── Signature Verification ─────────────────────────────────────────────────

/**
 * Verify Discord interaction signature using Ed25519.
 * Must use raw body before any JSON parsing.
 */
export function verifyInteractionSignature(
    rawBody: string,
    signature: string,
    timestamp: string,
): boolean {
    const publicKeyHex = getPublicKey();
    // Convert 64-char hex Ed25519 public key to DER-encoded SubjectPublicKeyInfo
    const publicKeyDer = Buffer.concat([
        Buffer.from('302a300506032b6570032100', 'hex'), // Ed25519 OID prefix
        Buffer.from(publicKeyHex, 'hex'),
    ]);
    return cryptoVerify(
        null,
        Buffer.from(timestamp + rawBody),
        { key: publicKeyDer, format: 'der', type: 'spki' },
        Buffer.from(signature, 'hex'),
    );
}

// ─── Interaction Follow-ups ─────────────────────────────────────────────────

/**
 * Edit the original deferred response via interaction webhook.
 */
export async function editInteractionResponse(
    interactionToken: string,
    content: string,
    components?: unknown[],
): Promise<void> {
    const appId = getAppId();
    const body: Record<string, unknown> = { content };
    if (components) body.components = components;

    const res = await discordFetch(
        `${DISCORD_API}/webhooks/${appId}/${interactionToken}/messages/@original`,
        { method: 'PATCH', body: JSON.stringify(body) },
    );

    if (!res.ok) {
        const text = await res.text();
        console.error(`[discord-bot] Failed to edit interaction response: ${res.status} ${text}`);
    }
}

// ─── Raffle Embeds ──────────────────────────────────────────────────────────

export interface RaffleEmbedData {
    dagetId: string;
    name: string;
    tokenSymbol: string;
    totalAmountDisplay: string;
    totalWinners: number;
    raffleEndsAt: Date | null;
    entryCount?: number;
    messageHtml?: string | null;
    claimSlug?: string;
}

function htmlToDiscordText(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<li>/gi, '• ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<em>(.*?)<\/em>/gi, '*$1*')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Post a raffle embed with "Enter Raffle" button to a Discord channel.
 * Returns the message ID on success.
 */
export async function postRaffleEmbed(
    channelId: string,
    data: RaffleEmbedData,
): Promise<string> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    const endsLine = data.raffleEndsAt
        ? `**Ends:** <t:${Math.floor(data.raffleEndsAt.getTime() / 1000)}:R>`
        : `**Ends:** No time limit`;

    const messageText = data.messageHtml ? htmlToDiscordText(data.messageHtml) : null;
    const claimUrl = data.claimSlug ? `${appUrl}/open/${data.claimSlug}` : appUrl;

    const descriptionParts = [
        `**Prize Pool:** ${data.totalAmountDisplay} ${data.tokenSymbol}`,
        `**Winners:** ${data.totalWinners}`,
        endsLine,
    ];
    if (messageText) descriptionParts.push('', messageText);

    const res = await discordFetch(`/channels/${channelId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
            embeds: [{
                title: `🎲 ${data.name}`,
                description: descriptionParts.join('\n'),
                color: 0x7C3AED, // purple
                footer: { text: 'Powered by daget.fun' },
            }],
            components: [{
                type: 1, // ACTION_ROW
                components: [
                    {
                        type: 2, // BUTTON
                        style: 1, // PRIMARY
                        label: 'Enter Raffle',
                        custom_id: `raffle_enter:${data.dagetId}`,
                    },
                    {
                        type: 2, // BUTTON
                        style: 5, // LINK
                        label: 'Enter from Daget.fun',
                        url: claimUrl,
                    },
                ],
            }],
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to post raffle embed: ${res.status} ${text}`);
    }

    const msg = await res.json();
    if (typeof msg.id !== 'string') {
        throw new Error(`Discord returned no message ID: ${JSON.stringify(msg).slice(0, 200)}`);
    }
    return msg.id;
}

/**
 * Update an existing raffle embed (e.g., entry count, status).
 */
export async function updateRaffleEmbed(
    channelId: string,
    messageId: string,
    data: RaffleEmbedData,
    status?: 'active' | 'drawing' | 'closed' | 'stopped',
): Promise<void> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    const endsAtUnix = data.raffleEndsAt ? Math.floor(data.raffleEndsAt.getTime() / 1000) : null;
    const messageText = data.messageHtml ? htmlToDiscordText(data.messageHtml) : null;
    const claimUrl = data.claimSlug ? `${appUrl}/open/${data.claimSlug}` : appUrl;

    const isClosed = status === 'closed' || status === 'stopped';
    const descriptionParts = [
        `**Prize Pool:** ${data.totalAmountDisplay} ${data.tokenSymbol}`,
        `**Winners:** ${data.totalWinners}`,
        status === 'drawing' ? '**Status:** Drawing...' :
            isClosed ? `**Status:** ${status === 'stopped' ? 'Cancelled' : 'Drawn'}` :
                endsAtUnix ? `**Ends:** <t:${endsAtUnix}:R>` : `**Ends:** No time limit`,
        data.entryCount != null ? `**Entries:** ${data.entryCount}` : '',
    ].filter(Boolean) as string[];
    if (messageText) descriptionParts.push('', messageText);

    const res = await discordFetch(`/channels/${channelId}/messages/${messageId}`, {
        method: 'PATCH',
        body: JSON.stringify({
            embeds: [{
                title: `🎲 ${data.name}`,
                description: descriptionParts.join('\n'),
                color: isClosed ? 0x6B7280 : 0x7C3AED,
                footer: { text: 'Powered by daget.fun' },
            }],
            components: isClosed ? [] : [{
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 1,
                        label: 'Enter Raffle',
                        custom_id: `raffle_enter:${data.dagetId}`,
                    },
                    {
                        type: 2,
                        style: 5, // LINK
                        label: 'Enter from Daget.fun',
                        url: claimUrl,
                    },
                ],
            }],
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        console.error(`[discord-bot] Failed to update raffle embed: ${res.status} ${text}`);
    }
}

// ─── Winner Announcements ───────────────────────────────────────────────────

export interface WinnerInfo {
    discordUserId: string;
    amountDisplay: string;
}

/**
 * Announce raffle winners in the Discord channel.
 * Paginates for >50 winners (Discord embed limit ~6000 chars).
 */
export async function announceWinners(
    channelId: string,
    raffleName: string,
    tokenSymbol: string,
    winners: WinnerInfo[],
    claimUrl: string,
): Promise<void> {
    if (winners.length <= 50) {
        const winnerLines = winners
            .map((w) => `<@${w.discordUserId}> — ${w.amountDisplay} ${tokenSymbol}`)
            .join('\n');

        await discordFetch(`/channels/${channelId}/messages`, {
            method: 'POST',
            body: JSON.stringify({
                embeds: [{
                    title: `🎉 Raffle "${raffleName}" has been drawn!`,
                    description: `**Winners:**\n${winnerLines}\n\nCongratulations! Prizes are being sent now.`,
                    color: 0x10B981, // green
                }],
            }),
        });
    } else {
        // Summary + link for large raffles
        const amountDisplay = winners[0]?.amountDisplay ?? '?';
        await discordFetch(`/channels/${channelId}/messages`, {
            method: 'POST',
            body: JSON.stringify({
                embeds: [{
                    title: `🎉 Raffle "${raffleName}" has been drawn!`,
                    description: [
                        `**${winners.length} winners** selected, each receiving **${amountDisplay} ${tokenSymbol}**.`,
                        `View full winner list: [daget.fun](${claimUrl})`,
                        '',
                        'Congratulations to all winners! Prizes are being sent now.',
                    ].join('\n'),
                    color: 0x10B981,
                }],
            }),
        });
    }
}

// ─── Role Verification (via bot token) ──────────────────────────────────────

/**
 * Get a guild member's roles using the bot token.
 * Uses the same Redis cache as discord-verify.ts for consistency.
 */
export async function getGuildMemberRoles(
    guildId: string,
    discordUserId: string,
): Promise<{ roles: string[]; inGuild: boolean }> {
    // Check cache first (same key format as discord-verify.ts)
    const cacheKey = `discord:roles:${discordUserId}:${guildId}`;

    if (isRedisReady()) {
        try {
            const cached = await getRedis().get(cacheKey);
            if (cached) {
                return { roles: JSON.parse(cached), inGuild: true };
            }
        } catch { /* cache miss, proceed to API */ }
    }

    const res = await discordFetch(`/guilds/${guildId}/members/${discordUserId}`);

    if (res.status === 404) {
        return { roles: [], inGuild: false };
    }

    if (!res.ok) {
        throw new Error(`Discord member lookup failed: ${res.status}`);
    }

    const member = await res.json();
    const roles: string[] = member.roles ?? [];

    // Cache (fire-and-forget, same TTL as discord-verify.ts)
    if (isRedisReady()) {
        getRedis().set(cacheKey, JSON.stringify(roles), 'EX', DISCORD_ROLE_CACHE_TTL).catch(() => {});
    }

    return { roles, inGuild: true };
}

// ─── Channel Permissions ────────────────────────────────────────────────────

interface ChannelOverwrite {
    id: string;
    type: number; // 0 = role, 1 = member
    allow: string;
    deny: string;
}

interface GuildChannel {
    id: string;
    name: string;
    type: number; // 0 = GUILD_TEXT
    permission_overwrites?: ChannelOverwrite[];
}

/**
 * Compute effective bot permissions for a channel.
 * Evaluates guild-level role permissions + channel-specific overwrites.
 */
function computeEffectivePermissions(
    botMemberRoleIds: string[],
    botUserId: string,
    guildId: string,
    guildPermissions: bigint,
    channel: GuildChannel,
): bigint {
    // Administrator bypasses all
    const ADMIN_BIT = BigInt(1) << BigInt(3);
    if (guildPermissions & ADMIN_BIT) return BigInt('0xFFFFFFFFFFFFFFFF');

    let permissions = guildPermissions;
    const overwrites = channel.permission_overwrites ?? [];

    // @everyone role overwrite (role ID = guild ID)
    const everyoneOverwrite = overwrites.find((o) => o.type === 0 && o.id === guildId);
    if (everyoneOverwrite) {
        permissions &= ~BigInt(everyoneOverwrite.deny);
        permissions |= BigInt(everyoneOverwrite.allow);
    }

    // Role overwrites (all roles the bot member has, excluding @everyone which was already applied)
    let roleAllow = BigInt(0);
    let roleDeny = BigInt(0);
    for (const ow of overwrites) {
        if (ow.type === 0 && ow.id !== guildId && botMemberRoleIds.includes(ow.id)) {
            roleAllow |= BigInt(ow.allow);
            roleDeny |= BigInt(ow.deny);
        }
    }
    permissions &= ~roleDeny;
    permissions |= roleAllow;

    // Member-specific overwrite
    const memberOverwrite = overwrites.find((o) => o.type === 1 && o.id === botUserId);
    if (memberOverwrite) {
        permissions &= ~BigInt(memberOverwrite.deny);
        permissions |= BigInt(memberOverwrite.allow);
    }

    return permissions;
}

/**
 * Get text channels where the bot has SEND_MESSAGES + EMBED_LINKS.
 */
export async function getPostableChannels(
    guildId: string,
): Promise<Array<{ id: string; name: string }>> {
    const appId = getAppId();

    // Get bot member info for role IDs
    const memberRes = await discordFetch(`/guilds/${guildId}/members/${appId}`);
    if (!memberRes.ok) {
        throw new Error(`Failed to get bot member: ${memberRes.status}`);
    }
    const botMember = await memberRes.json();
    const botRoleIds: string[] = botMember.roles ?? [];

    // Get guild roles to compute base permissions
    const rolesRes = await discordFetch(`/guilds/${guildId}/roles`);
    if (!rolesRes.ok) {
        throw new Error(`Failed to get guild roles: ${rolesRes.status}`);
    }
    const guildRoles = await rolesRes.json();

    // Compute base permissions from all bot roles
    let basePermissions = BigInt(0);
    for (const role of guildRoles) {
        if (botRoleIds.includes(role.id) || role.id === guildId /* @everyone */) {
            basePermissions |= BigInt(role.permissions);
        }
    }

    // Get channels
    const channelsRes = await discordFetch(`/guilds/${guildId}/channels`);
    if (!channelsRes.ok) {
        throw new Error(`Failed to get guild channels: ${channelsRes.status}`);
    }
    const channels: GuildChannel[] = await channelsRes.json();

    const required = DiscordPermissions.VIEW_CHANNEL
        | DiscordPermissions.SEND_MESSAGES
        | DiscordPermissions.EMBED_LINKS;

    return channels
        .filter((ch) => ch.type === 0 || ch.type === 5) // text + announcement channels
        .filter((ch) => {
            const perms = computeEffectivePermissions(
                [...botRoleIds, guildId],
                appId,
                guildId,
                basePermissions,
                ch,
            );
            return (perms & required) === required;
        })
        .map((ch) => ({ id: ch.id, name: ch.name }));
}

// ─── Startup Validation ─────────────────────────────────────────────────────

/**
 * Validate Discord environment variables at startup.
 * Call during app/worker initialization.
 */
export function validateDiscordEnv(): void {
    const publicKey = process.env.DISCORD_PUBLIC_KEY;
    if (publicKey && !/^[0-9a-f]{64}$/i.test(publicKey)) {
        throw new Error('DISCORD_PUBLIC_KEY must be exactly 64 hex characters');
    }
    if (!process.env.DISCORD_BOT_TOKEN) {
        throw new Error('DISCORD_BOT_TOKEN is required');
    }
    if (!process.env.DISCORD_CLIENT_ID) {
        throw new Error('DISCORD_CLIENT_ID is required');
    }
}
