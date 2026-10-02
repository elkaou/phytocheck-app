import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

import type { EmergencyAuthorization } from "./emergency-authorizations";

// URL de base GitHub Pages — source de vérité pour les données réglementaires.
const GITHUB_PAGES_BASE = "https://elkaou.github.io/phytocheck-data";

// Clés AsyncStorage (métadonnées légères uniquement)
const CACHE_KEYS = {
  LAST_UPDATE: "@phytocheck/last_remote_update",
  REMOTE_VERSION: "@phytocheck/remote_version",
  EMERGENCY_VERSION: "@phytocheck/emergency_authorizations_version",
};

// Chemins fichiers locaux (FileSystem — pour les gros fichiers JSON)
const FILE_PATHS = {
  PRODUCTS: (FileSystem.documentDirectory ?? "") + "phytocheck_products.json",
  RISK_PHRASES: (FileSystem.documentDirectory ?? "") + "phytocheck_risk_phrases.json",
  USAGES: (FileSystem.documentDirectory ?? "") + "phytocheck_usages.json",
  EMERGENCY_AUTHORIZATIONS: (FileSystem.documentDirectory ?? "") + "phytocheck_emergency_authorizations.json",
};

// Intervalle minimum entre deux vérifications (1 h en ms)
const CHECK_INTERVAL_MS = 1 * 60 * 60 * 1000;

export interface EmergencyAuthorizationsManifest {
  updated_at: string;
  count: number;
  active_source_count?: number;
  source_url?: string;
}

export interface DataManifest {
  version: string;
  updated_at: string;
  products_count: number;
  risks_count: number;
  usages_count?: number;
  emergency_authorizations?: EmergencyAuthorizationsManifest;
}

interface UpdatePlan {
  manifest: DataManifest;
  updateEphy: boolean;
  updateEmergencyAuthorizations: boolean;
}

/** Ajoute un paramètre cache-buster à une URL pour contourner le cache CDN. */
function cacheBust(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}_cb=${Date.now()}`;
}

/** Parse une date JJ/MM/AAAA ou un horodatage ISO vers un timestamp comparable. */
function parseVersionTimestamp(value: string | undefined): number {
  if (!value) return 0;
  const parts = value.split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Lit un fichier JSON depuis le système de fichiers local. */
async function readLocalFile(path: string): Promise<unknown | null> {
  try {
    if (Platform.OS === "web") return null;
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const content = await FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return JSON.parse(content);
  } catch (error) {
    console.log("[DataUpdate] Error reading local file:", path, error);
    return null;
  }
}

function emergencyManifestIsValid(manifest: DataManifest): boolean {
  const emergency = manifest.emergency_authorizations;
  return Boolean(
    emergency &&
      typeof emergency.updated_at === "string" &&
      typeof emergency.count === "number",
  );
}

async function ephyNeedsUpdate(manifest: DataManifest, bundleDate?: string): Promise<boolean> {
  const cachedVersion = await AsyncStorage.getItem(CACHE_KEYS.REMOTE_VERSION);
  const remoteTimestamp = parseVersionTimestamp(manifest.updated_at);
  const referenceVersion = cachedVersion ?? bundleDate ?? "01/01/2000";
  const referenceTimestamp = parseVersionTimestamp(referenceVersion);

  if (remoteTimestamp > referenceTimestamp) return true;

  // Une mise à jour peut avoir lieu le même jour : comparer le volume des produits.
  if (remoteTimestamp === referenceTimestamp && manifest.products_count !== undefined) {
    const cachedProducts = await readLocalFile(FILE_PATHS.PRODUCTS);
    if (Array.isArray(cachedProducts) && manifest.products_count !== cachedProducts.length) return true;
  }

  // Première installation après l'ajout des usages : les télécharger même avec même version.
  const usagesInfo = await FileSystem.getInfoAsync(FILE_PATHS.USAGES);
  return !usagesInfo.exists;
}

async function emergencyAuthorizationsNeedUpdate(
  manifest: DataManifest,
  bundleEmergencyDate?: string,
): Promise<boolean> {
  if (!emergencyManifestIsValid(manifest)) return false;
  const emergency = manifest.emergency_authorizations!;
  const cachedVersion = await AsyncStorage.getItem(CACHE_KEYS.EMERGENCY_VERSION);
  const remoteTimestamp = parseVersionTimestamp(emergency.updated_at);
  const referenceTimestamp = parseVersionTimestamp(cachedVersion ?? bundleEmergencyDate);

  if (remoteTimestamp > referenceTimestamp) return true;

  const cachedAuthorizations = await readLocalFile(FILE_PATHS.EMERGENCY_AUTHORIZATIONS);
  return !Array.isArray(cachedAuthorizations) || cachedAuthorizations.length !== emergency.count;
}

/** Vérifie les nouveautés E-Phy et Article 53 présentes dans le manifest distant. */
async function checkForUpdate(
  bundleDate?: string,
  bundleEmergencyDate?: string,
): Promise<UpdatePlan | null> {
  try {
    const lastCheck = await AsyncStorage.getItem(CACHE_KEYS.LAST_UPDATE);
    if (lastCheck) {
      const elapsed = Date.now() - Number(lastCheck);
      if (elapsed < CHECK_INTERVAL_MS) {
        console.log("[DataUpdate] Skipping check — last check was", Math.round(elapsed / 60000), "min ago");
        return null;
      }
    }

    const manifestUrl = cacheBust(`${GITHUB_PAGES_BASE}/manifest.json`);
    const response = await fetch(manifestUrl, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });

    if (!response.ok) {
      console.log("[DataUpdate] Manifest fetch failed:", response.status);
      await AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATE, Date.now().toString());
      return null;
    }

    const manifest = (await response.json()) as DataManifest;
    const [updateEphy, updateEmergencyAuthorizations] = await Promise.all([
      ephyNeedsUpdate(manifest, bundleDate),
      emergencyAuthorizationsNeedUpdate(manifest, bundleEmergencyDate),
    ]);

    console.log("[DataUpdate] Update plan:", JSON.stringify({
      updateEphy,
      updateEmergencyAuthorizations,
      ephyDate: manifest.updated_at,
      emergencyDate: manifest.emergency_authorizations?.updated_at,
    }));

    if (!updateEphy && !updateEmergencyAuthorizations) {
      await AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATE, Date.now().toString());
      return null;
    }

    return { manifest, updateEphy, updateEmergencyAuthorizations };
  } catch (error) {
    console.log("[DataUpdate] Error checking for update:", error);
    return null;
  }
}

async function downloadEphyData(manifest: DataManifest): Promise<boolean> {
  const productsUrl = cacheBust(`${GITHUB_PAGES_BASE}/products.json`);
  const riskUrl = cacheBust(`${GITHUB_PAGES_BASE}/risk-phrases.json`);
  const usagesUrl = cacheBust(`${GITHUB_PAGES_BASE}/usages.json`);
  const temporaryPaths = [
    FILE_PATHS.PRODUCTS + ".tmp",
    FILE_PATHS.RISK_PHRASES + ".tmp",
    FILE_PATHS.USAGES + ".tmp",
  ];

  try {
    const [productsResult, riskResult, usagesResult] = await Promise.all([
      FileSystem.downloadAsync(productsUrl, temporaryPaths[0]),
      FileSystem.downloadAsync(riskUrl, temporaryPaths[1]),
      FileSystem.downloadAsync(usagesUrl, temporaryPaths[2]),
    ]);

    if (productsResult.status !== 200 || riskResult.status !== 200) {
      console.log("[DataUpdate] E-Phy download failed:", productsResult.status, riskResult.status);
      return false;
    }

    const productsCheck = await readLocalFile(temporaryPaths[0]);
    if (!Array.isArray(productsCheck) || productsCheck.length === 0) {
      console.log("[DataUpdate] Downloaded products.json is invalid or empty");
      return false;
    }

    await Promise.all([
      FileSystem.moveAsync({ from: temporaryPaths[0], to: FILE_PATHS.PRODUCTS }),
      FileSystem.moveAsync({ from: temporaryPaths[1], to: FILE_PATHS.RISK_PHRASES }),
    ]);

    if (usagesResult.status === 200) {
      await FileSystem.moveAsync({ from: temporaryPaths[2], to: FILE_PATHS.USAGES });
    } else {
      await FileSystem.deleteAsync(temporaryPaths[2], { idempotent: true });
    }

    await AsyncStorage.setItem(CACHE_KEYS.REMOTE_VERSION, manifest.updated_at);
    console.log("[DataUpdate] E-Phy cache updated:", productsCheck.length, "products");
    return true;
  } catch (error) {
    console.log("[DataUpdate] Error downloading E-Phy data:", error);
    return false;
  } finally {
    await Promise.allSettled(temporaryPaths.map((path) => FileSystem.deleteAsync(path, { idempotent: true })));
  }
}

async function downloadEmergencyAuthorizations(manifest: DataManifest): Promise<boolean> {
  const emergency = manifest.emergency_authorizations;
  if (!emergencyManifestIsValid(manifest) || !emergency) return false;

  const temporaryPath = FILE_PATHS.EMERGENCY_AUTHORIZATIONS + ".tmp";
  try {
    const result = await FileSystem.downloadAsync(
      cacheBust(`${GITHUB_PAGES_BASE}/emergency-authorizations.json`),
      temporaryPath,
    );
    if (result.status !== 200) {
      console.log("[DataUpdate] Article 53 download failed:", result.status);
      return false;
    }

    const data = await readLocalFile(temporaryPath);
    if (!Array.isArray(data)) {
      console.log("[DataUpdate] Downloaded Article 53 data is invalid");
      return false;
    }

    await FileSystem.moveAsync({ from: temporaryPath, to: FILE_PATHS.EMERGENCY_AUTHORIZATIONS });
    await AsyncStorage.setItem(CACHE_KEYS.EMERGENCY_VERSION, emergency.updated_at);
    console.log("[DataUpdate] Article 53 cache updated:", data.length, "decisions");
    return true;
  } catch (error) {
    console.log("[DataUpdate] Error downloading Article 53 data:", error);
    return false;
  } finally {
    await FileSystem.deleteAsync(temporaryPath, { idempotent: true });
  }
}

/** Télécharge uniquement les fichiers réellement modifiés dans le manifest. */
async function downloadAndCache(plan: UpdatePlan): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      console.log("[DataUpdate] Web platform — using embedded regulatory data");
      return false;
    }

    const results = await Promise.all([
      plan.updateEphy ? downloadEphyData(plan.manifest) : Promise.resolve(false),
      plan.updateEmergencyAuthorizations
        ? downloadEmergencyAuthorizations(plan.manifest)
        : Promise.resolve(false),
    ]);

    const success = results.some(Boolean);
    if (success) await AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATE, Date.now().toString());
    return success;
  } catch (error) {
    console.log("[DataUpdate] Background download error:", error);
    return false;
  }
}

/** Charge les données E-Phy depuis le cache local. */
export async function loadCachedData(): Promise<{
  products: unknown[];
  riskPhrases: Record<string, unknown[]>;
  usages: Record<string, unknown[]>;
  updatedAt: string;
} | null> {
  try {
    if (Platform.OS === "web") return null;

    const updatedAt = await AsyncStorage.getItem(CACHE_KEYS.REMOTE_VERSION);
    if (!updatedAt) return null;

    const [products, riskPhrases, usages] = await Promise.all([
      readLocalFile(FILE_PATHS.PRODUCTS),
      readLocalFile(FILE_PATHS.RISK_PHRASES),
      readLocalFile(FILE_PATHS.USAGES),
    ]);

    if (!Array.isArray(products) || !products.length || !riskPhrases) return null;
    return {
      products,
      riskPhrases: riskPhrases as Record<string, unknown[]>,
      usages: (usages ?? {}) as Record<string, unknown[]>,
      updatedAt,
    };
  } catch (error) {
    console.log("[DataUpdate] Error loading E-Phy cache:", error);
    return null;
  }
}

/** Charge les décisions Article 53 depuis le cache local. */
export async function loadCachedEmergencyAuthorizations(): Promise<{
  authorizations: EmergencyAuthorization[];
  updatedAt: string;
} | null> {
  try {
    if (Platform.OS === "web") return null;
    const updatedAt = await AsyncStorage.getItem(CACHE_KEYS.EMERGENCY_VERSION);
    if (!updatedAt) return null;
    const authorizations = await readLocalFile(FILE_PATHS.EMERGENCY_AUTHORIZATIONS);
    if (!Array.isArray(authorizations)) return null;
    return { authorizations: authorizations as EmergencyAuthorization[], updatedAt };
  } catch (error) {
    console.log("[DataUpdate] Error loading Article 53 cache:", error);
    return null;
  }
}

/** Lance la vérification et la mise à jour réglementaire en arrière-plan. */
export function checkAndUpdateInBackground(
  onUpdate?: (manifest: DataManifest) => void,
  bundleDate?: string,
  bundleEmergencyDate?: string,
): void {
  void (async () => {
    const plan = await checkForUpdate(bundleDate, bundleEmergencyDate);
    if (!plan) return;
    const success = await downloadAndCache(plan);
    if (success && onUpdate) onUpdate(plan.manifest);
  })();
}

export async function clearDataCache(): Promise<void> {
  await Promise.allSettled([
    AsyncStorage.removeItem(CACHE_KEYS.LAST_UPDATE),
    AsyncStorage.removeItem(CACHE_KEYS.REMOTE_VERSION),
    AsyncStorage.removeItem(CACHE_KEYS.EMERGENCY_VERSION),
    FileSystem.deleteAsync(FILE_PATHS.PRODUCTS, { idempotent: true }),
    FileSystem.deleteAsync(FILE_PATHS.RISK_PHRASES, { idempotent: true }),
    FileSystem.deleteAsync(FILE_PATHS.USAGES, { idempotent: true }),
    FileSystem.deleteAsync(FILE_PATHS.EMERGENCY_AUTHORIZATIONS, { idempotent: true }),
  ]);
  console.log("[DataUpdate] Regulatory cache cleared");
}
