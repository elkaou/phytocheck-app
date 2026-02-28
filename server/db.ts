import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, devices, Device } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Device tracking (Freemium counter) ──────────────────────────────────────

/**
 * Synchronise un appareil avec le serveur.
 * Crée l'entrée si absente, met à jour isPremium et lastSeen si présente.
 * Retourne l'état actuel de l'appareil (searchCount, isPremium).
 */
export async function syncDevice(deviceId: string, isPremium: boolean): Promise<Device | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    await db
      .insert(devices)
      .values({ deviceId, isPremium, searchCount: 0 })
      .onDuplicateKeyUpdate({ set: { isPremium, lastSeen: new Date() } });
    const result = await db.select().from(devices).where(eq(devices.deviceId, deviceId)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] syncDevice error:", error);
    return null;
  }
}

/**
 * Incrémente le compteur de recherche pour un appareil.
 * Retourne { allowed, searchCount }.
 * En mode dégradé (pas de DB), retourne allowed: true pour ne pas bloquer l'utilisateur.
 */
export async function incrementDeviceSearch(
  deviceId: string,
  limit: number
): Promise<{ allowed: boolean; searchCount: number }> {
  const db = await getDb();
  if (!db) return { allowed: true, searchCount: 0 }; // mode offline : autorisé

  try {
    const result = await db.select().from(devices).where(eq(devices.deviceId, deviceId)).limit(1);

    if (result.length === 0) {
      // Appareil inconnu : créer et autoriser
      await db.insert(devices).values({ deviceId, searchCount: 1, isPremium: false });
      return { allowed: true, searchCount: 1 };
    }

    const device = result[0];

    // Si Premium côté serveur, toujours autorisé
    if (device.isPremium) {
      await db.update(devices).set({ searchCount: device.searchCount + 1 }).where(eq(devices.deviceId, deviceId));
      return { allowed: true, searchCount: device.searchCount + 1 };
    }

    // Vérifier la limite
    if (device.searchCount >= limit) {
      return { allowed: false, searchCount: device.searchCount };
    }

    const newCount = device.searchCount + 1;
    await db.update(devices).set({ searchCount: newCount }).where(eq(devices.deviceId, deviceId));
    return { allowed: true, searchCount: newCount };
  } catch (error) {
    console.error("[Database] incrementDeviceSearch error:", error);
    return { allowed: true, searchCount: 0 }; // mode dégradé : autorisé
  }
}
