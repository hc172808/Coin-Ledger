import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  pin: text("pin").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  isFrozen: boolean("is_frozen").default(false).notNull(),
  profileUpdatedAt: timestamp("profile_updated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wallets = pgTable("wallets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  gydBalance: numeric("gyd_balance", { precision: 20, scale: 8 }).default("0").notNull(),
  gydsBalance: numeric("gyds_balance", { precision: 20, scale: 8 }).default("0").notNull(),
  internetFundsBalance: numeric("internet_funds_balance", { precision: 20, scale: 2 }).default("0").notNull(),
  address: text("address").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").references(() => users.id).notNull(),
  toUserId: varchar("to_user_id").references(() => users.id),
  toAddress: text("to_address"),
  type: text("type").notNull(),
  fundType: text("fund_type").notNull(),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  fee: numeric("fee", { precision: 20, scale: 8 }).default("0").notNull(),
  status: text("status").default("pending").notNull(),
  description: text("description"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cards = pgTable("cards", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  cardNumber: text("card_number").notNull(),
  lastFourDigits: text("last_four_digits").notNull(),
  expiryDate: text("expiry_date").notNull(),
  cardType: text("card_type").default("virtual").notNull(),
  status: text("status").default("active").notNull(),
  pin: text("pin").notNull(),
  dailyLimit: numeric("daily_limit", { precision: 20, scale: 2 }).default("5000").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentRequests = pgTable("payment_requests", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").references(() => users.id).notNull(),
  toUserId: varchar("to_user_id").references(() => users.id).notNull(),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  fundType: text("fund_type").notNull(),
  status: text("status").default("pending").notNull(),
  description: text("description"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  pin: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertCardSchema = createInsertSchema(cards).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type PaymentRequest = typeof paymentRequests.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
