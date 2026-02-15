import {
    pgTable, pgEnum, uuid, text, boolean, integer,
    bigint, timestamp, inet, uniqueIndex, index, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/* ── Enums ── */

export const dagetTypeEnum = pgEnum('daget_type', ['fixed', 'random']);
export const dagetStatusEnum = pgEnum('daget_status', ['active', 'stopped', 'closed']);
export const claimStatusEnum = pgEnum('claim_status', [
    'created', 'submitted', 'confirmed',
    'failed_retryable', 'failed_permanent', 'released',
]);
export const notificationTypeEnum = pgEnum('notification_type', [
    'claim_confirmed', 'claim_failed', 'claim_released',
    'daget_stopped', 'daget_closed',
]);

/* ── Users ── */

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    discordUserId: text('discord_user_id').notNull().unique(),
    discordUsername: text('discord_username'),
    discordAvatarUrl: text('discord_avatar_url'),
    receivingAddress: text('receiving_address'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
});

/* ── Wallets ── */

export const wallets = pgTable('wallets', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    publicKey: text('public_key').notNull(),
    encryptedPrivateKey: text('encrypted_private_key'),
    encryptionScheme: text('encryption_scheme').notNull(),
    encryptionKeyRef: text('encryption_key_ref'),
    encryptionVersion: integer('encryption_version').notNull().default(1),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    keyForgottenAt: timestamp('key_forgotten_at', { withTimezone: true }),
    lastExportedAt: timestamp('last_exported_at', { withTimezone: true }),
}, (table) => [
    uniqueIndex('wallets_one_active_per_user').on(table.userId).where(sql`is_active = true`),
    uniqueIndex('wallets_public_key_unique').on(table.publicKey),
]);

/* ── Wallet Export Audit ── */

export const walletExports = pgTable('wallet_exports', {
    id: uuid('id').primaryKey().defaultRandom(),
    walletId: uuid('wallet_id').notNull().references(() => wallets.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    requestId: uuid('request_id').notNull().defaultRandom(),
    result: text('result').notNull().default('success'),
    failureReason: text('failure_reason'),
    exportedAt: timestamp('exported_at', { withTimezone: true }).notNull().defaultNow(),
    retentionUntil: timestamp('retention_until', { withTimezone: true }),
    ip: inet('ip'),
    userAgent: text('user_agent'),
}, (table) => [
    index('wallet_exports_wallet_id_idx').on(table.walletId),
    check('result_check', sql`result IN ('success', 'denied', 'failed')`),
]);

/* ── Dagets ── */

export const dagets = pgTable('dagets', {
    id: uuid('id').primaryKey().defaultRandom(),
    claimSlug: text('claim_slug').notNull().unique(),
    creatorUserId: uuid('creator_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    creatorWalletId: uuid('creator_wallet_id').notNull().references(() => wallets.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    messageHtml: text('message_html'),
    tokenSymbol: text('token_symbol').notNull(),
    tokenMint: text('token_mint').notNull(),
    discordGuildName: text('discord_guild_name'),
    discordGuildIcon: text('discord_guild_icon'),
    tokenDecimals: integer('token_decimals').notNull(),
    totalAmountBaseUnits: bigint('total_amount_base_units', { mode: 'number' }).notNull(),
    totalWinners: integer('total_winners').notNull(),
    dagetType: dagetTypeEnum('daget_type').notNull(),
    randomMinBps: integer('random_min_bps'),
    randomMaxBps: integer('random_max_bps'),
    status: dagetStatusEnum('status').notNull().default('active'),
    claimedCount: integer('claimed_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    stoppedAt: timestamp('stopped_at', { withTimezone: true }),
}, (table) => [
    index('dagets_creator_user_id_idx').on(table.creatorUserId),
    uniqueIndex('dagets_one_active_per_creator').on(table.creatorUserId).where(sql`status = 'active'`),
    check('token_symbol_check', sql`token_symbol IN ('USDC', 'USDT')`),
    check('total_amount_positive', sql`total_amount_base_units > 0`),
    check('total_amount_safe_int', sql`total_amount_base_units <= 9007199254740991`),
    check('total_winners_positive', sql`total_winners > 0`),
    check('claimed_count_range', sql`claimed_count >= 0 AND claimed_count <= total_winners`),
    check('random_mode_check', sql`
    (daget_type = 'fixed' AND random_min_bps IS NULL AND random_max_bps IS NULL)
    OR
    (daget_type = 'random'
      AND random_min_bps IS NOT NULL
      AND random_max_bps IS NOT NULL
      AND random_min_bps > 0
      AND random_max_bps >= random_min_bps
      AND random_max_bps <= 10000)
  `),
]);

/* ── Daget Requirements ── */

export const dagetRequirements = pgTable('daget_requirements', {
    id: uuid('id').primaryKey().defaultRandom(),
    dagetId: uuid('daget_id').notNull().references(() => dagets.id, { onDelete: 'cascade' }),
    discordGuildId: text('discord_guild_id').notNull(),
    discordRoleId: text('discord_role_id').notNull(),
    discordRoleNameSnapshot: text('discord_role_name_snapshot'),
    discordRoleColor: integer('discord_role_color'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index('daget_requirements_daget_id_idx').on(table.dagetId),
]);

/* ── Claims ── */

export const claims = pgTable('claims', {
    id: uuid('id').primaryKey().defaultRandom(),
    dagetId: uuid('daget_id').notNull().references(() => dagets.id, { onDelete: 'cascade' }),
    claimantUserId: uuid('claimant_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    idempotencyKey: text('idempotency_key').notNull(),
    receivingAddress: text('receiving_address').notNull(),
    amountBaseUnits: bigint('amount_base_units', { mode: 'number' }),
    status: claimStatusEnum('status').notNull().default('created'),
    txSignature: text('tx_signature'),
    attemptCount: integer('attempt_count').notNull().default(0),
    lastError: text('last_error'),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    releasedAt: timestamp('released_at', { withTimezone: true }),
}, (table) => [
    uniqueIndex('claims_one_per_user_per_daget').on(table.dagetId, table.claimantUserId),
    uniqueIndex('claims_tx_signature_unique').on(table.txSignature).where(sql`tx_signature IS NOT NULL`),
    index('claims_daget_id_status_idx').on(table.dagetId, table.status),
    index('claims_claimant_user_id_idx').on(table.claimantUserId),
    index('claims_next_retry_at_idx').on(table.nextRetryAt),
    index('claims_locked_until_idx').on(table.lockedUntil),
    check('amount_base_units_safe_int', sql`amount_base_units IS NULL OR amount_base_units <= 9007199254740991`),
]);

/* ── Notifications ── */

export const notifications = pgTable('notifications', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    title: text('title').notNull(),
    body: text('body'),
    relatedDagetId: uuid('related_daget_id').references(() => dagets.id, { onDelete: 'set null' }),
    relatedClaimId: uuid('related_claim_id').references(() => claims.id, { onDelete: 'set null' }),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index('notifications_user_id_idx').on(table.userId),
    index('notifications_user_unread_idx').on(table.userId).where(sql`is_read = false`),
]);

/* ── Idempotency Keys ── */

export const idempotencyKeys = pgTable('idempotency_keys', {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    requestBodyHash: text('request_body_hash').notNull(),
    responseStatus: integer('response_status').notNull(),
    responseBody: text('response_body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (table) => [
    uniqueIndex('idempotency_keys_unique').on(table.key, table.userId, table.endpoint),
]);

/* ── Export Tokens (one-time) ── */

export const exportTokens = pgTable('export_tokens', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    walletId: uuid('wallet_id').notNull().references(() => wallets.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ── Claim Retry Audit ── */

export const claimRetryAudit = pgTable('claim_retry_audit', {
    id: uuid('id').primaryKey().defaultRandom(),
    claimId: uuid('claim_id').notNull().references(() => claims.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    result: text('result').notNull(),
    ip: inet('ip'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
