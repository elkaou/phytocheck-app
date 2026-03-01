import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Platform } from "react-native";
import * as Application from "expo-application";
import {
  getStock,
  addToStock,
  removeFromStock,
  updateStockQuantity,
  getSearchCount,
  incrementSearchCount,
  getIsPremium,
  setIsPremium as setIsPremiumStorage,
  getStockStats,
  StockItem,
  StockStats,
  FREE_SEARCH_LIMIT,
  FREE_STOCK_LIMIT,
} from "./store";
import { ClassifiedProduct } from "./product-service";
import { trpc } from "./trpc";

interface AppContextType {
  stock: StockItem[];
  stockStats: StockStats;
  searchCount: number;
  isPremium: boolean;
  remainingSearches: number;
  stockLimit: number;
  deviceId: string | null;
  addProductToStock: (product: ClassifiedProduct, quantity?: number, unite?: "L" | "Kg", secondaryName?: string) => Promise<"added" | "incremented" | "limit" | "error">;
  removeProductFromStock: (amm: string) => Promise<boolean>;
  updateProductQuantity: (amm: string, quantity: number) => Promise<boolean>;
  isProductInStock: (amm: string) => boolean;
  getProductQuantity: (amm: string) => number;
  performSearch: () => Promise<boolean>;
  setPremium: (value: boolean) => Promise<void>;
  refreshStock: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

/** Récupère l'identifiant unique de l'appareil selon la plateforme */
async function getDeviceId(): Promise<string | null> {
  try {
    if (Platform.OS === "android") {
      return Application.getAndroidId();
    } else if (Platform.OS === "ios") {
      return await Application.getIosIdForVendorAsync();
    }
    // Web : pas d'identifiant fiable
    return null;
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [stockStats, setStockStats] = useState<StockStats>({
    total: 0,
    homologues: 0,
    ppnu: 0,
    cmr: 0,
    toxiques: 0,
  });
  const [searchCount, setSearchCount] = useState(0);
  const [isPremium, setIsPremiumState] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const remainingSearches = isPremium
    ? Infinity
    : Math.max(0, FREE_SEARCH_LIMIT - searchCount);
  const stockLimit = isPremium ? Infinity : FREE_STOCK_LIMIT;

  // tRPC mutations pour le tracking appareil
  const syncDeviceMutation = trpc.device.sync.useMutation();
  const incrementSearchMutation = trpc.device.incrementSearch.useMutation();

  // Load initial data + synchronisation appareil au démarrage
  useEffect(() => {
    (async () => {
      const [s, sc, ip] = await Promise.all([
        getStock(),
        getSearchCount(),
        getIsPremium(),
      ]);
      setStock(s);
      setIsPremiumState(ip);
      const stats = await getStockStats();
      setStockStats(stats);

      // Récupérer l'identifiant appareil
      const id = await getDeviceId();
      setDeviceId(id);

      if (id) {
        try {
          // Synchroniser avec le serveur pour récupérer le searchCount.
          // IMPORTANT : on envoie isPremium: false ici car le cache local (AsyncStorage)
          // peut être obsolète (ex: abonnement résilié). C'est IAPProvider qui est
          // responsable de la vérification réelle via getAvailablePurchases() et qui
          // appellera setPremium(true/false) une fois la vérification Google Play terminée.
          const result = await syncDeviceMutation.mutateAsync({ deviceId: id, isPremium: false });
          if (!result.offline) {
            // Utiliser le compteur serveur (plus fiable que le local)
            setSearchCount(result.searchCount);
          } else {
            // Mode offline : utiliser le compteur local
            setSearchCount(sc);
          }
        } catch {
          // Serveur inaccessible : utiliser le compteur local
          setSearchCount(sc);
        }
      } else {
        setSearchCount(sc);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshStock = useCallback(async () => {
    const s = await getStock();
    setStock(s);
    const stats = await getStockStats();
    setStockStats(stats);
  }, []);

  const addProductToStock = useCallback(
    async (product: ClassifiedProduct, quantity: number = 1, unite: "L" | "Kg" = "L", secondaryName?: string): Promise<"added" | "incremented" | "limit" | "error"> => {
      const result = await addToStock(product, quantity, unite, secondaryName);
      if (result === "added" || result === "incremented") {
        await refreshStock();
      }
      return result;
    },
    [refreshStock]
  );

  const updateProductQuantity = useCallback(
    async (amm: string, quantity: number): Promise<boolean> => {
      const success = await updateStockQuantity(amm, quantity);
      if (success) {
        await refreshStock();
      }
      return success;
    },
    [refreshStock]
  );

  const getProductQuantity = useCallback(
    (amm: string): number => {
      const item = stock.find((i) => i.amm === amm);
      return item?.quantite || 0;
    },
    [stock]
  );

  const removeProductFromStock = useCallback(
    async (amm: string): Promise<boolean> => {
      const success = await removeFromStock(amm);
      if (success) {
        await refreshStock();
      }
      return success;
    },
    [refreshStock]
  );

  const isProductInStock = useCallback(
    (amm: string): boolean => {
      return stock.some((item) => item.amm === amm);
    },
    [stock]
  );

  /**
   * Vérifie si une recherche est autorisée et incrémente le compteur.
   * Côté serveur : si le serveur dit "non autorisé", bloque même si le local dit oui.
   * Mode dégradé (pas de réseau) : se rabat sur le compteur local.
   */
  const performSearch = useCallback(async (): Promise<boolean> => {
    // Premium : toujours autorisé
    if (isPremium) {
      // Incrémenter quand même côté local pour cohérence
      const newCount = await incrementSearchCount();
      setSearchCount(newCount);
      return true;
    }

    // Vérification locale d'abord (réponse instantanée)
    if (searchCount >= FREE_SEARCH_LIMIT) {
      return false;
    }

    // Vérification côté serveur (source de vérité)
    if (deviceId) {
      try {
        const result = await incrementSearchMutation.mutateAsync({ deviceId, isPremium });
        if (!result.allowed) {
          // Le serveur dit non : bloquer même si le local dit oui
          setSearchCount(FREE_SEARCH_LIMIT); // Mettre à jour l'affichage local
          return false;
        }
        // Mettre à jour le compteur local avec la valeur serveur
        if (result.searchCount >= 0) {
          setSearchCount(result.searchCount);
          await incrementSearchCount(); // Synchroniser local aussi
        }
        return true;
      } catch {
        // Serveur inaccessible : utiliser la logique locale
        const newCount = await incrementSearchCount();
        setSearchCount(newCount);
        return true;
      }
    }

    // Pas de deviceId (web) : logique locale uniquement
    const newCount = await incrementSearchCount();
    setSearchCount(newCount);
    return true;
  }, [isPremium, searchCount, deviceId, incrementSearchMutation]);

  const setPremium = useCallback(async (value: boolean) => {
    await setIsPremiumStorage(value);
    setIsPremiumState(value);
    // Synchroniser le statut Premium avec le serveur
    if (deviceId) {
      try {
        await syncDeviceMutation.mutateAsync({ deviceId, isPremium: value });
      } catch {
        // Ignorer les erreurs réseau
      }
    }
  }, [deviceId, syncDeviceMutation]);

  return (
    <AppContext.Provider
      value={{
        stock,
        stockStats,
        searchCount,
        isPremium,
        remainingSearches,
        stockLimit,
        deviceId,
        addProductToStock,
        removeProductFromStock,
        updateProductQuantity,
        isProductInStock,
        getProductQuantity,
        performSearch,
        setPremium,
        refreshStock,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
