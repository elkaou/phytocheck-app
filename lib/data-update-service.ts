import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

// URL de base GitHub Pages - source de vérité pour les données E-Phy
const GITHUB_PAGES_BASE = "https://elkaou.github.io/phytocheck-data";

// Clés AsyncStorage (métadonnées légères uniquement)
const CACHE_KEYS = {
  LAST_UPDATE: "@phytocheck/last_remote_update",
  REMOTE_VERSION: "@phytocheck/remote_version",
};

// Chemins fichiers locaux (FileSystem - pour les gros fichiers JSON)
const FILE_PATHS = {
  PRODUCTS: (FileSystem.documentDirectory ?? "") + "phytocheck_products.json",
  RISK_PHRASES: (FileSystem.documentDirectory ?? "") + "phytocheck_risk_phrases.json",
};

// Intervalle minimum entre deux vérifications (1h en ms)
const CHECK_INTERVAL_MS = 1 * 60 * 60 * 1000;

export interface DataManifest {
  version: string;
  updated_at: string;
  products_count: number;
  risks_count: number;
}

export interface RemoteDataState {
  products: unknown[] | null;
  riskPhrases: Record<string, unknown[]> | null;
  updatedAt: string | null;
  source: "bundle" | "cache" | "remote";
}

/**
 * Ajoute un paramètre cache-buster à une URL pour contourner le cache CDN.
 */
function cacheBust(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}_cb=${Date.now()}`;
}

/**
 * Parse une date au format DD/MM/YYYY en timestamp comparable.
 * Retourne 0 si le format est invalide.
 */
function parseDateDDMMYYYY(dateStr: string): number {
  if (!dateStr) return 0;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return 0;
  const [day, month, year] = parts;
  const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

/**
 * Lit un fichier JSON depuis le système de fichiers local.
 * Retourne null si le fichier n'existe pas ou est invalide.
 */
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

/**
 * Écrit un objet JSON dans un fichier local.
 */
async function writeLocalFile(path: string, data: unknown): Promise<boolean> {
  try {
    if (Platform.OS === "web") return false;
    await FileSystem.writeAsStringAsync(path, JSON.stringify(data), {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return true;
  } catch (error) {
    console.log("[DataUpdate] Error writing local file:", path, error);
    return false;
  }
}

/**
 * Vérifie si une mise à jour est disponible sur GitHub Pages.
 * Retourne le manifest si une mise à jour est disponible, null sinon.
 */
async function checkForUpdate(bundleDate?: string): Promise<DataManifest | null> {
  try {
    const lastCheck = await AsyncStorage.getItem(CACHE_KEYS.LAST_UPDATE);
    const cachedVersion = await AsyncStorage.getItem(CACHE_KEYS.REMOTE_VERSION);

    console.log("[DataUpdate] checkForUpdate - bundleDate:", bundleDate, "cachedVersion:", cachedVersion);

    // Vérifier l'intervalle uniquement si on a déjà vérifié récemment (1h)
    if (lastCheck) {
      const elapsed = Date.now() - parseInt(lastCheck, 10);
      if (elapsed < CHECK_INTERVAL_MS) {
        console.log("[DataUpdate] Skipping check - last check was", Math.round(elapsed / 60000), "min ago");
        return null;
      }
    }

    // Fetch avec cache-buster pour contourner le cache CDN
    const manifestUrl = cacheBust(`${GITHUB_PAGES_BASE}/manifest.json`);
    console.log("[DataUpdate] Fetching manifest:", manifestUrl);

    const response = await fetch(manifestUrl, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
      },
    });

    if (!response.ok) {
      console.log("[DataUpdate] Manifest fetch failed:", response.status);
      await AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATE, Date.now().toString());
      return null;
    }

    const manifest: DataManifest = await response.json();
    console.log("[DataUpdate] Remote manifest:", JSON.stringify(manifest));

    // Comparer avec la version en cache (ou le bundle si pas de cache)
    const remoteTs = parseDateDDMMYYYY(manifest.updated_at);
    const referenceVersion = cachedVersion ?? bundleDate ?? "01/01/2000";
    const referenceTs = parseDateDDMMYYYY(referenceVersion);

    console.log("[DataUpdate] Comparing - remote:", manifest.updated_at, "(", remoteTs, ") vs reference:", referenceVersion, "(", referenceTs, ")");

    if (remoteTs > referenceTs) {
      console.log("[DataUpdate] New version available!");
      await AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATE, Date.now().toString());
      return manifest;
    }

    // Même date : vérifier si le nombre de produits a changé (mise à jour le même jour)
    if (remoteTs === referenceTs && manifest.products_count !== undefined) {
      // Vérifier le nombre de produits en cache via FileSystem
      const cachedProducts = await readLocalFile(FILE_PATHS.PRODUCTS);
      if (Array.isArray(cachedProducts) && manifest.products_count !== cachedProducts.length) {
        console.log("[DataUpdate] Same date but different count:", cachedProducts.length, "→", manifest.products_count);
        await AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATE, Date.now().toString());
        return manifest;
      }
    }

    // Mettre à jour le timestamp de vérification (pas de mise à jour nécessaire)
    await AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATE, Date.now().toString());
    console.log("[DataUpdate] Already up to date");
    return null;
  } catch (error) {
    console.log("[DataUpdate] Error checking for update:", error);
    return null;
  }
}

/**
 * Télécharge et met en cache les données depuis GitHub Pages.
 * Utilise FileSystem pour les gros fichiers JSON (évite les limites d'AsyncStorage).
 * Retourne true si la mise à jour a réussi.
 */
async function downloadAndCache(manifest: DataManifest): Promise<boolean> {
  try {
    // Sur web, utiliser fetch + JSON (FileSystem non disponible)
    if (Platform.OS === "web") {
      console.log("[DataUpdate] Web platform - skipping FileSystem download");
      return false;
    }

    console.log("[DataUpdate] Downloading products and risk phrases via FileSystem...");

    const productsUrl = cacheBust(`${GITHUB_PAGES_BASE}/products.json`);
    const riskUrl = cacheBust(`${GITHUB_PAGES_BASE}/risk-phrases.json`);

    // Télécharger directement vers le système de fichiers (évite de charger tout en mémoire)
    const [productsResult, riskResult] = await Promise.all([
      FileSystem.downloadAsync(productsUrl, FILE_PATHS.PRODUCTS + ".tmp"),
      FileSystem.downloadAsync(riskUrl, FILE_PATHS.RISK_PHRASES + ".tmp"),
    ]);

    if (productsResult.status !== 200 || riskResult.status !== 200) {
      console.log("[DataUpdate] Download failed - products:", productsResult.status, "risks:", riskResult.status);
      // Nettoyer les fichiers temporaires
      await Promise.allSettled([
        FileSystem.deleteAsync(FILE_PATHS.PRODUCTS + ".tmp", { idempotent: true }),
        FileSystem.deleteAsync(FILE_PATHS.RISK_PHRASES + ".tmp", { idempotent: true }),
      ]);
      return false;
    }

    // Vérifier que les fichiers téléchargés sont valides (parseable JSON)
    const [productsCheck, riskCheck] = await Promise.all([
      readLocalFile(FILE_PATHS.PRODUCTS + ".tmp"),
      readLocalFile(FILE_PATHS.RISK_PHRASES + ".tmp"),
    ]);

    if (!Array.isArray(productsCheck) || !productsCheck.length) {
      console.log("[DataUpdate] Downloaded products.json is invalid or empty");
      await Promise.allSettled([
        FileSystem.deleteAsync(FILE_PATHS.PRODUCTS + ".tmp", { idempotent: true }),
        FileSystem.deleteAsync(FILE_PATHS.RISK_PHRASES + ".tmp", { idempotent: true }),
      ]);
      return false;
    }

    console.log("[DataUpdate] Downloaded", productsCheck.length, "products - validating...");

    // Renommer les fichiers temporaires vers les fichiers définitifs
    await Promise.all([
      FileSystem.moveAsync({ from: FILE_PATHS.PRODUCTS + ".tmp", to: FILE_PATHS.PRODUCTS }),
      FileSystem.moveAsync({ from: FILE_PATHS.RISK_PHRASES + ".tmp", to: FILE_PATHS.RISK_PHRASES }),
    ]);

    // Sauvegarder uniquement les métadonnées dans AsyncStorage
    await Promise.all([
      AsyncStorage.setItem(CACHE_KEYS.REMOTE_VERSION, manifest.updated_at),
      AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATE, Date.now().toString()),
    ]);

    console.log("[DataUpdate] Cache updated successfully via FileSystem - version:", manifest.updated_at, "products:", productsCheck.length);
    return true;
  } catch (error) {
    console.log("[DataUpdate] Error downloading data:", error);
    // Nettoyer les fichiers temporaires en cas d'erreur
    await Promise.allSettled([
      FileSystem.deleteAsync(FILE_PATHS.PRODUCTS + ".tmp", { idempotent: true }),
      FileSystem.deleteAsync(FILE_PATHS.RISK_PHRASES + ".tmp", { idempotent: true }),
    ]);
    return false;
  }
}

/**
 * Charge les données depuis le cache local (FileSystem).
 * Retourne null si aucun cache disponible.
 */
export async function loadCachedData(): Promise<{
  products: unknown[];
  riskPhrases: Record<string, unknown[]>;
  updatedAt: string;
} | null> {
  try {
    if (Platform.OS === "web") return null;

    const updatedAt = await AsyncStorage.getItem(CACHE_KEYS.REMOTE_VERSION);
    if (!updatedAt) {
      console.log("[DataUpdate] No cached version found");
      return null;
    }

    const [products, riskPhrases] = await Promise.all([
      readLocalFile(FILE_PATHS.PRODUCTS),
      readLocalFile(FILE_PATHS.RISK_PHRASES),
    ]);

    if (!Array.isArray(products) || !products.length || !riskPhrases) {
      console.log("[DataUpdate] Cached files missing or invalid");
      return null;
    }

    console.log("[DataUpdate] Loaded cache from FileSystem - version:", updatedAt, "products:", products.length);

    return {
      products,
      riskPhrases: riskPhrases as Record<string, unknown[]>,
      updatedAt,
    };
  } catch (error) {
    console.log("[DataUpdate] Error loading cache:", error);
    return null;
  }
}

/**
 * Lance la vérification et mise à jour en arrière-plan.
 * Ne bloque jamais l'interface utilisateur.
 * Appelle onUpdate si de nouvelles données ont été téléchargées.
 */
export function checkAndUpdateInBackground(
  onUpdate?: (manifest: DataManifest) => void,
  bundleDate?: string
): void {
  // Exécution asynchrone sans await pour ne pas bloquer
  (async () => {
    try {
      console.log("[DataUpdate] Starting background check...");
      const manifest = await checkForUpdate(bundleDate);
      if (!manifest) {
        console.log("[DataUpdate] No update available");
        return;
      }

      const success = await downloadAndCache(manifest);
      if (success && onUpdate) {
        console.log("[DataUpdate] Update applied, notifying UI");
        onUpdate(manifest);
      }
    } catch (error) {
      console.log("[DataUpdate] Background check error:", error);
    }
  })();
}

/**
 * Retourne la date de dernière mise à jour des données en cache.
 */
export async function getCachedUpdateDate(): Promise<string | null> {
  return AsyncStorage.getItem(CACHE_KEYS.REMOTE_VERSION);
}

/**
 * Vide le cache des données distantes (pour forcer un re-téléchargement).
 */
export async function clearDataCache(): Promise<void> {
  await Promise.allSettled([
    AsyncStorage.removeItem(CACHE_KEYS.LAST_UPDATE),
    AsyncStorage.removeItem(CACHE_KEYS.REMOTE_VERSION),
    FileSystem.deleteAsync(FILE_PATHS.PRODUCTS, { idempotent: true }),
    FileSystem.deleteAsync(FILE_PATHS.RISK_PHRASES, { idempotent: true }),
  ]);
  console.log("[DataUpdate] Cache cleared (FileSystem + AsyncStorage)");
}
