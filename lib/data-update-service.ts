import AsyncStorage from "@react-native-async-storage/async-storage";

// URL de base GitHub Pages - source de vérité pour les données E-Phy
const GITHUB_PAGES_BASE = "https://elkaou.github.io/phytocheck-data";

// Clés AsyncStorage
const CACHE_KEYS = {
  PRODUCTS: "@phytocheck/remote_products",
  RISK_PHRASES: "@phytocheck/remote_risk_phrases",
  LAST_UPDATE: "@phytocheck/last_remote_update",
  REMOTE_VERSION: "@phytocheck/remote_version",
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
 * Vérifie si une mise à jour est disponible sur GitHub Pages.
 * Retourne le manifest si une mise à jour est disponible, null sinon.
 */
async function checkForUpdate(bundleDate?: string): Promise<DataManifest | null> {
  try {
    const lastCheck = await AsyncStorage.getItem(CACHE_KEYS.LAST_UPDATE);
    const cachedVersion = await AsyncStorage.getItem(CACHE_KEYS.REMOTE_VERSION);

    console.log("[DataUpdate] checkForUpdate - bundleDate:", bundleDate, "cachedVersion:", cachedVersion);

    // Vérifier l'intervalle uniquement si le cache est au moins aussi récent que le bundle
    if (lastCheck && cachedVersion && bundleDate) {
      const cachedTs = parseDateDDMMYYYY(cachedVersion);
      const bundleTs = parseDateDDMMYYYY(bundleDate);
      
      // Le cache est à jour seulement s'il est >= au bundle
      if (cachedTs >= bundleTs && cachedTs > 0) {
        const elapsed = Date.now() - parseInt(lastCheck, 10);
        if (elapsed < CHECK_INTERVAL_MS) {
          console.log("[DataUpdate] Skipping check - last check was", Math.round(elapsed / 60000), "min ago");
          return null;
        }
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
      return null;
    }

    const manifest: DataManifest = await response.json();
    console.log("[DataUpdate] Remote manifest:", JSON.stringify(manifest));

    // Comparer les dates en tant que timestamps pour une comparaison fiable
    const remoteTs = parseDateDDMMYYYY(manifest.updated_at);
    const cachedTs = cachedVersion ? parseDateDDMMYYYY(cachedVersion) : 0;

    console.log("[DataUpdate] Comparing - remote:", manifest.updated_at, "(", remoteTs, ") vs cached:", cachedVersion, "(", cachedTs, ")");

    if (remoteTs > cachedTs) {
      console.log("[DataUpdate] New version available!");
      return manifest;
    }

    if (remoteTs === cachedTs && manifest.products_count !== undefined) {
      // Même date mais vérifier le nombre de produits (cas d'une mise à jour le même jour)
      // On ne peut pas comparer ici car on n'a pas le count en cache, donc on fait confiance à la date
      console.log("[DataUpdate] Same date, no update needed");
    }

    // Mettre à jour le timestamp de vérification
    await AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATE, Date.now().toString());
    return null;
  } catch (error) {
    console.log("[DataUpdate] Error checking for update:", error);
    return null;
  }
}

/**
 * Télécharge et met en cache les données depuis GitHub Pages.
 * Retourne true si la mise à jour a réussi.
 */
async function downloadAndCache(manifest: DataManifest): Promise<boolean> {
  try {
    console.log("[DataUpdate] Downloading products and risk phrases...");

    const [productsRes, riskRes] = await Promise.all([
      fetch(cacheBust(`${GITHUB_PAGES_BASE}/products.json`), {
        headers: { "Cache-Control": "no-cache, no-store", "Pragma": "no-cache" },
      }),
      fetch(cacheBust(`${GITHUB_PAGES_BASE}/risk-phrases.json`), {
        headers: { "Cache-Control": "no-cache, no-store", "Pragma": "no-cache" },
      }),
    ]);

    if (!productsRes.ok || !riskRes.ok) {
      console.log("[DataUpdate] Download failed - products:", productsRes.status, "risks:", riskRes.status);
      return false;
    }

    const [products, riskPhrases] = await Promise.all([
      productsRes.json(),
      riskRes.json(),
    ]);

    console.log("[DataUpdate] Downloaded", Array.isArray(products) ? products.length : "?", "products");

    // Sauvegarder en cache local
    await Promise.all([
      AsyncStorage.setItem(CACHE_KEYS.PRODUCTS, JSON.stringify(products)),
      AsyncStorage.setItem(CACHE_KEYS.RISK_PHRASES, JSON.stringify(riskPhrases)),
      AsyncStorage.setItem(CACHE_KEYS.REMOTE_VERSION, manifest.updated_at),
      AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATE, Date.now().toString()),
    ]);

    console.log("[DataUpdate] Cache updated successfully - version:", manifest.updated_at);
    return true;
  } catch (error) {
    console.log("[DataUpdate] Error downloading data:", error);
    return false;
  }
}

/**
 * Charge les données depuis le cache local AsyncStorage.
 * Retourne null si aucun cache disponible.
 */
export async function loadCachedData(): Promise<{
  products: unknown[];
  riskPhrases: Record<string, unknown[]>;
  updatedAt: string;
} | null> {
  try {
    const [productsStr, riskStr, updatedAt] = await Promise.all([
      AsyncStorage.getItem(CACHE_KEYS.PRODUCTS),
      AsyncStorage.getItem(CACHE_KEYS.RISK_PHRASES),
      AsyncStorage.getItem(CACHE_KEYS.REMOTE_VERSION),
    ]);

    if (!productsStr || !riskStr || !updatedAt) {
      console.log("[DataUpdate] No cached data found");
      return null;
    }

    const products = JSON.parse(productsStr);
    console.log("[DataUpdate] Loaded cache - version:", updatedAt, "products:", Array.isArray(products) ? products.length : "?");

    return {
      products,
      riskPhrases: JSON.parse(riskStr),
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
  await Promise.all([
    AsyncStorage.removeItem(CACHE_KEYS.PRODUCTS),
    AsyncStorage.removeItem(CACHE_KEYS.RISK_PHRASES),
    AsyncStorage.removeItem(CACHE_KEYS.LAST_UPDATE),
    AsyncStorage.removeItem(CACHE_KEYS.REMOTE_VERSION),
  ]);
  console.log("[DataUpdate] Cache cleared");
}
