import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

import { EmergencyAuthorization } from "@/lib/emergency-authorizations";
import { Product, RiskPhrase } from "@/lib/product-service";
import {
  checkAndUpdateInBackground,
  loadCachedData,
  loadCachedEmergencyAuthorizations,
  DataManifest,
} from "@/lib/data-update-service";

// Données embarquées — toujours disponibles hors ligne.
import bundleProducts from "@/assets/data/products.json";
import bundleRiskPhrases from "@/assets/data/risk-phrases.json";
import bundleUsages from "@/assets/data/usages.json";
import bundleEmergencyAuthorizations from "@/assets/data/emergency-authorizations.json";

// Mis à jour automatiquement par le script E-Phy lors d'une actualisation de la base.
const BUNDLE_MANIFEST = {
  version: "1.0",
  updated_at: "02/10/2026",
  products_count: 17221,
  risks_count: 2541,
};

// Instantané Article 53 inclus dans le build pour la consultation hors ligne.
const BUNDLE_EMERGENCY_MANIFEST = {
  updated_at: "02/10/2026",
};

export interface ProductUsage {
  usage?: string;
  culture: string;
  application?: string;
  cible?: string;
  etat?: string;
  dose?: string;
  unite?: string;
  dar?: string;
  nb_max_appli?: string;
  znt_aqua?: string;
  condition?: string;
}

export type DataSource = "bundle" | "cache" | "remote";

interface DataContextValue {
  products: Product[];
  riskPhrases: Record<string, RiskPhrase[]>;
  usages: Record<string, ProductUsage[]>;
  emergencyAuthorizations: EmergencyAuthorization[];
  updateDate: string;
  emergencyAuthorizationsUpdateDate: string;
  dataSource: DataSource;
  isUpdating: boolean;
  lastRemoteUpdate: string | null;
}

const DataContext = createContext<DataContextValue>({
  products: bundleProducts as Product[],
  riskPhrases: bundleRiskPhrases as Record<string, RiskPhrase[]>,
  usages: bundleUsages as Record<string, ProductUsage[]>,
  emergencyAuthorizations: bundleEmergencyAuthorizations as EmergencyAuthorization[],
  updateDate: BUNDLE_MANIFEST.updated_at,
  emergencyAuthorizationsUpdateDate: BUNDLE_EMERGENCY_MANIFEST.updated_at,
  dataSource: "bundle",
  isUpdating: false,
  lastRemoteUpdate: null,
});

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(bundleProducts as Product[]);
  const [riskPhrases, setRiskPhrases] = useState<Record<string, RiskPhrase[]>>(
    bundleRiskPhrases as Record<string, RiskPhrase[]>,
  );
  const [usages, setUsages] = useState<Record<string, ProductUsage[]>>(
    bundleUsages as Record<string, ProductUsage[]>,
  );
  const [emergencyAuthorizations, setEmergencyAuthorizations] = useState<EmergencyAuthorization[]>(
    bundleEmergencyAuthorizations as EmergencyAuthorization[],
  );
  const [updateDate, setUpdateDate] = useState(BUNDLE_MANIFEST.updated_at);
  const [emergencyAuthorizationsUpdateDate, setEmergencyAuthorizationsUpdateDate] = useState(
    BUNDLE_EMERGENCY_MANIFEST.updated_at,
  );
  const [dataSource, setDataSource] = useState<DataSource>("bundle");
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastRemoteUpdate, setLastRemoteUpdate] = useState<string | null>(null);

  const applyRemoteData = useCallback((_manifest: DataManifest) => {
    void Promise.all([loadCachedData(), loadCachedEmergencyAuthorizations()]).then(
      ([cachedEphy, cachedEmergency]) => {
        if (cachedEphy) {
          setProducts(cachedEphy.products as Product[]);
          setRiskPhrases(cachedEphy.riskPhrases as Record<string, RiskPhrase[]>);
          setUsages(cachedEphy.usages as Record<string, ProductUsage[]>);
          setUpdateDate(cachedEphy.updatedAt);
          setDataSource("remote");
          setLastRemoteUpdate(cachedEphy.updatedAt);
        }
        if (cachedEmergency) {
          setEmergencyAuthorizations(cachedEmergency.authorizations);
          setEmergencyAuthorizationsUpdateDate(cachedEmergency.updatedAt);
        }
        setIsUpdating(false);
      },
    );
  }, []);

  useEffect(() => {
    // Le cache se charge immédiatement, sans attendre la vérification distante.
    void Promise.all([loadCachedData(), loadCachedEmergencyAuthorizations()]).then(
      ([cachedEphy, cachedEmergency]) => {
        if (cachedEphy) {
          setProducts(cachedEphy.products as Product[]);
          setRiskPhrases(cachedEphy.riskPhrases as Record<string, RiskPhrase[]>);
          setUsages(cachedEphy.usages as Record<string, ProductUsage[]>);
          setUpdateDate(cachedEphy.updatedAt);
          setDataSource("cache");
          setLastRemoteUpdate(cachedEphy.updatedAt);
        }
        if (cachedEmergency) {
          setEmergencyAuthorizations(cachedEmergency.authorizations);
          setEmergencyAuthorizationsUpdateDate(cachedEmergency.updatedAt);
        }
      },
    );

    setIsUpdating(true);
    checkAndUpdateInBackground(
      applyRemoteData,
      BUNDLE_MANIFEST.updated_at,
      BUNDLE_EMERGENCY_MANIFEST.updated_at,
    );

    const timeout = setTimeout(() => setIsUpdating(false), 10000);
    return () => clearTimeout(timeout);
  }, [applyRemoteData]);

  return (
    <DataContext.Provider
      value={{
        products,
        riskPhrases,
        usages,
        emergencyAuthorizations,
        updateDate,
        emergencyAuthorizationsUpdateDate,
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
