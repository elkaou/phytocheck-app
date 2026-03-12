import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Product, RiskPhrase } from "@/lib/product-service";
import {
  checkAndUpdateInBackground,
  loadCachedData,
  DataManifest,
} from "@/lib/data-update-service";

// Données bundle (embarquées dans l'app - toujours disponibles)
import bundleProducts from "@/assets/data/products.json";
import bundleRiskPhrases from "@/assets/data/risk-phrases.json";

export type DataSource = "bundle" | "cache" | "remote";

interface DataContextValue {
  products: Product[];
  riskPhrases: Record<string, RiskPhrase[]>;
  updateDate: string;
  dataSource: DataSource;
  isUpdating: boolean;
  lastRemoteUpdate: string | null;
}

const DataContext = createContext<DataContextValue>({
  products: bundleProducts as Product[],
  riskPhrases: bundleRiskPhrases as Record<string, RiskPhrase[]>,
  updateDate: "12/03/2026",
  dataSource: "bundle",
  isUpdating: false,
  lastRemoteUpdate: null,
});

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(bundleProducts as Product[]);
  const [riskPhrases, setRiskPhrases] = useState<Record<string, RiskPhrase[]>>(
    bundleRiskPhrases as Record<string, RiskPhrase[]>
  );
  const [updateDate, setUpdateDate] = useState("12/03/2026");
  const [dataSource, setDataSource] = useState<DataSource>("bundle");
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastRemoteUpdate, setLastRemoteUpdate] = useState<string | null>(null);

  const applyRemoteData = useCallback((manifest: DataManifest) => {
    // Recharger depuis le cache AsyncStorage après téléchargement
    loadCachedData().then((cached) => {
      if (cached) {
        setProducts(cached.products as Product[]);
        setRiskPhrases(cached.riskPhrases as Record<string, RiskPhrase[]>);
        setUpdateDate(cached.updatedAt);
        setDataSource("remote");
        setLastRemoteUpdate(cached.updatedAt);
        setIsUpdating(false);
      }
    });
  }, []);

  useEffect(() => {
    // Étape 1 : Charger le cache local si disponible (instantané)
    loadCachedData().then((cached) => {
      if (cached) {
        setProducts(cached.products as Product[]);
        setRiskPhrases(cached.riskPhrases as Record<string, RiskPhrase[]>);
        setUpdateDate(cached.updatedAt);
        setDataSource("cache");
        setLastRemoteUpdate(cached.updatedAt);
      }
    });

    // Étape 2 : Vérifier en arrière-plan si une mise à jour est disponible
    setIsUpdating(true);
    checkAndUpdateInBackground((manifest) => {
      applyRemoteData(manifest);
    });

    // Timeout pour arrêter le spinner si pas de connexion
    const timeout = setTimeout(() => setIsUpdating(false), 10000);
    return () => clearTimeout(timeout);
  }, [applyRemoteData]);

  return (
    <DataContext.Provider
      value={{
        products,
        riskPhrases,
        updateDate,
        dataSource,
        isUpdating,
        lastRemoteUpdate,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
