import AsyncStorage from "@react-native-async-storage/async-storage";

// URL de base GitHub Pages - source de vérité pour les données E-Phy
const GITHUB_PAGES_BASE = "https://elkaou.github.io/phytocheck-data";
const MANIFEST_URL = `${GITHUB_PAGES_BASE}/manifest.json`;
const PRODUCTS_URL = `${GITHUB_PAGES_BASE}/products.json`;
const RISK_PHRASES_URL = `${GITHUB_PAGES_BASE}/risk-phrases.json`;

// Clés AsyncStorage
const CACHE_KEYS = {
  PRODUCTS: "@phytocheck/remote_products",
  RISK_PHRASES: "@phytocheck/remote_risk_phrases",
  LAST_UPDATE: "@phytocheck/last_remote_update",
  REMOTE_VERSION: "@phytocheck/remote_version",
};

// Intervalle minimum entre deux vérifications (24h en ms)
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

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
 * Vérifie si une mise à jour est disponible sur GitHub Pages.
 * Retourne le manifest si une mise à jour est disponible, null sinon.
 */
async function checkForUpdate(): Promise<DataManifest | null> {
  try {
    // Vérifier si on a déjà vérifié récemment
    const lastCheck = await AsyncStorage.getItem(CACHE_KEYS.LAST_UPDATE);
    if (lastCheck) {
      const elapsed = Date.now() - parseInt(lastCheck, 10);
      if (elapsed < CHECK_INTERVAL_MS) {
        return null; // Pas besoin de revérifier
      }
    }

    const response = await fetch(MANIFEST_URL, {
      headers: { "Cache-Control": "no-cache" },
    });
    if (!response.ok) return null;

    const manifest: DataManifest = await response.json();

    // Comparer avec la version en cache
    const cachedVersion = await AsyncStorage.getItem(CACHE_KEYS.REMOTE_VERSION);
    if (cachedVersion === manifest.updated_at) {
      // Même version, mettre à jour le timestamp de vérification
      await AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATE, Date.now().toString());
      return null;
    }

    return manifest;
  } catch {
    return null; // Pas de connexion ou erreur réseau
  }
}

/**
 * Télécharge et met en cache les données depuis GitHub Pages.
 * Retourne true si la mise à jour a réussi.
 */
async function downloadAndCache(manifest: DataManifest): Promise<boolean> {
  try {
    const [productsRes, riskRes] = await Promise.all([
      fetch(PRODUCTS_URL),
      fetch(RISK_PHRASES_URL),
    ]);

    if (!productsRes.ok || !riskRes.ok) return false;

    const [products, riskPhrases] = await Promise.all([
      productsRes.json(),
      riskRes.json(),
    ]);

    // Sauvegarder en cache local
    await Promise.all([
      AsyncStorage.setItem(CACHE_KEYS.PRODUCTS, JSON.stringify(products)),
      AsyncStorage.setItem(CACHE_KEYS.RISK_PHRASES, JSON.stringify(riskPhrases)),
      AsyncStorage.setItem(CACHE_KEYS.REMOTE_VERSION, manifest.updated_at),
      AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATE, Date.now().toString()),
    ]);

    return true;
  } catch {
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

    if (!productsStr || !riskStr || !updatedAt) return null;

    return {
      products: JSON.parse(productsStr),
      riskPhrases: JSON.parse(riskStr),
      updatedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Lance la vérification et mise à jour en arrière-plan.
 * Ne bloque jamais l'interface utilisateur.
 * Appelle onUpdate si de nouvelles données ont été téléchargées.
 */
export function checkAndUpdateInBackground(
  onUpdate?: (manifest: DataManifest) => void
): void {
  // Exécution asynchrone sans await pour ne pas bloquer
  (async () => {
    try {
      const manifest = await checkForUpdate();
      if (!manifest) return;

      const success = await downloadAndCache(manifest);
      if (success && onUpdate) {
        onUpdate(manifest);
      }
    } catch {
      // Silencieux - pas de connexion ou erreur réseau
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
}
