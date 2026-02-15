import { relations } from 'drizzle-orm';
import {
    users, wallets, walletExports, dagets, dagetRequirements,
    claims, notifications, idempotencyKeys, exportTokens, claimRetryAudit,
} from './schema';

/* ── User Relations ── */
export const usersRelations = relations(users, ({ many }) => ({
    wallets: many(wallets),
    dagets: many(dagets),
    claims: many(claims),
    notifications: many(notifications),
}));

/* ── Wallet Relations ── */
export const walletsRelations = relations(wallets, ({ one, many }) => ({
    user: one(users, { fields: [wallets.userId], references: [users.id] }),
    exports: many(walletExports),
    dagets: many(dagets),
}));

/* ── Wallet Export Relations ── */
export const walletExportsRelations = relations(walletExports, ({ one }) => ({
    wallet: one(wallets, { fields: [walletExports.walletId], references: [wallets.id] }),
    user: one(users, { fields: [walletExports.userId], references: [users.id] }),
}));

/* ── Daget Relations ── */
export const dagetsRelations = relations(dagets, ({ one, many }) => ({
    creator: one(users, { fields: [dagets.creatorUserId], references: [users.id] }),
    wallet: one(wallets, { fields: [dagets.creatorWalletId], references: [wallets.id] }),
    requirements: many(dagetRequirements),
    claims: many(claims),
}));

/* ── Daget Requirement Relations ── */
export const dagetRequirementsRelations = relations(dagetRequirements, ({ one }) => ({
    daget: one(dagets, { fields: [dagetRequirements.dagetId], references: [dagets.id] }),
}));

/* ── Claim Relations ── */
export const claimsRelations = relations(claims, ({ one }) => ({
    daget: one(dagets, { fields: [claims.dagetId], references: [dagets.id] }),
    claimant: one(users, { fields: [claims.claimantUserId], references: [users.id] }),
}));

/* ── Notification Relations ── */
export const notificationsRelations = relations(notifications, ({ one }) => ({
    user: one(users, { fields: [notifications.userId], references: [users.id] }),
    relatedDaget: one(dagets, { fields: [notifications.relatedDagetId], references: [dagets.id] }),
    relatedClaim: one(claims, { fields: [notifications.relatedClaimId], references: [claims.id] }),
}));
