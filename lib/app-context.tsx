import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  getStock,
  addToStock,
  removeFromStock,
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

interface AppContextType {
  stock: StockItem[];
  stockStats: StockStats;
  searchCount: number;
  isPremium: boolean;
  remainingSearches: number;
  stockLimit: number;
  addProductToStock: (product: ClassifiedProduct) => Promise<boolean>;
  removeProductFromStock: (amm: string) => Promise<boolean>;
  isProductInStock: (amm: string) => boolean;
  performSearch: () => Promise<boolean>;
  setPremium: (value: boolean) => Promise<void>;
  refreshStock: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

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

  const remainingSearches = isPremium
    ? Infinity
    : Math.max(0, FREE_SEARCH_LIMIT - searchCount);
  const stockLimit = isPremium ? Infinity : FREE_STOCK_LIMIT;

  // Load initial data
  useEffect(() => {
    (async () => {
      const [s, sc, ip] = await Promise.all([
        getStock(),
        getSearchCount(),
        getIsPremium(),
      ]);
      setStock(s);
      setSearchCount(sc);
      setIsPremiumState(ip);
      const stats = await getStockStats();
      setStockStats(stats);
    })();
  }, []);

  const refreshStock = useCallback(async () => {
    const s = await getStock();
    setStock(s);
    const stats = await getStockStats();
    setStockStats(stats);
  }, []);

  const addProductToStock = useCallback(
    async (product: ClassifiedProduct): Promise<boolean> => {
      const success = await addToStock(product);
      if (success) {
        await refreshStock();
      }
      return success;
    },
    [refreshStock]
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

  const performSearch = useCallback(async (): Promise<boolean> => {
    if (!isPremium && searchCount >= FREE_SEARCH_LIMIT) {
      return false;
    }
    const newCount = await incrementSearchCount();
    setSearchCount(newCount);
    return true;
  }, [isPremium, searchCount]);

  const setPremium = useCallback(async (value: boolean) => {
    await setIsPremiumStorage(value);
    setIsPremiumState(value);
  }, []);

  return (
    <AppContext.Provider
      value={{
        stock,
        stockStats,
        searchCount,
        isPremium,
        remainingSearches,
        stockLimit,
        addProductToStock,
        removeProductFromStock,
        isProductInStock,
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
