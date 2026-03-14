import { boolean, integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const roleEnum = pgEnum("role", ["user", "admin"]);

export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Table devices : suivi des appareils et compteurs de recherche côté serveur.
 * Permet de contrôler les limites Freemium même si l'utilisateur efface les données locales.
 */
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  /** Identifiant unique de l'appareil (androidId ou idfv iOS) */
  deviceId: varchar("deviceId", { length: 255 }).notNull().unique(),
  /** Nombre total de recherches effectuées sur cet appareil */
  searchCount: integer("searchCount").default(0).notNull(),
  /** L'appareil a-t-il un abonnement Premium actif ? */
  isPremium: boolean("isPremium").default(false).notNull(),
  /** Première utilisation de l'app sur cet appareil */
  firstSeen: timestamp("firstSeen").defaultNow().notNull(),
  /** Dernière synchronisation avec le serveur */
  lastSeen: timestamp("lastSeen").defaultNow().notNull(),
});

export type Device = typeof devices.$inferSelect;
export type InsertDevice = typeof devices.$inferInsert;
