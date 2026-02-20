/**
 * Contexte IAP (In-App Purchase) pour PhytoCheck
 * Fournit un hook useIAPContext pour accéder aux fonctionnalités d'abonnement
 * Compatible iOS, Android et web (mode dégradé sur web)
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Platform, Alert } from "react-native";
import {
  IAP_PRODUCTS,
  IAP_BASE_PRODUCT,
  savePremiumStatus,
  loadPremiumStatus,
  isPlatformSupported,
  type SubscriptionType,
} from "./iap-service";

// Types
interface IAPProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  subscriptionType: SubscriptionType;
}

interface IAPContextType {
  /** Connexion IAP établie */
  connected: boolean;
  /** Produits disponibles à l'achat */
  products: IAPProduct[];
  /** Achat en cours */
  purchasing: boolean;
  /** Statut premium de l'utilisateur */
  isPremium: boolean;
  /** Type d'abonnement actif */
  subscriptionType: SubscriptionType;
  /** Lancer l'achat d'un abonnement */
  purchaseSubscription: (type: SubscriptionType) => Promise<void>;
  /** Restaurer les achats */
  restorePurchases: () => Promise<void>;
  /** Prix de l'abonnement mensuel */
  monthlyPrice: string;
  /** Prix de l'abonnement annuel */
  yearlyPrice: string;
  /** Plateforme supportée */
  platformSupported: boolean;
}

const IAPContext = createContext<IAPContextType>({
  connected: false,
  products: [],
  purchasing: false,
  isPremium: false,
  subscriptionType: null,
  purchaseSubscription: async () => {},
  restorePurchases: async () => {},
  monthlyPrice: "9,99 €",
  yearlyPrice: "19,99 €",
  platformSupported: false,
});

export function useIAPContext() {
  return useContext(IAPContext);
}

interface IAPProviderProps {
  children: React.ReactNode;
  onPremiumChange?: (isPremium: boolean) => void;
}

export function IAPProvider({ children, onPremiumChange }: IAPProviderProps) {
  const [connected, setConnected] = useState(false);
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [purchasing, setPurchasing] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionType, setSubscriptionType] = useState<SubscriptionType>(null);
  const [monthlyPrice, setMonthlyPrice] = useState("9,99 €");
  const [yearlyPrice, setYearlyPrice] = useState("19,99 €");
  const platformSupported = isPlatformSupported();
  
  // Ref pour les modules expo-iap (chargés dynamiquement)
  const iapModuleRef = useRef<any>(null);

  // Charger le statut premium au démarrage
  useEffect(() => {
    loadPremiumStatus().then((status) => {
      setIsPremium(status.isPremium);
      setSubscriptionType(status.subscriptionType);
    });
  }, []);

  // Initialiser la connexion IAP sur les plateformes supportées
  useEffect(() => {
    if (!platformSupported) return;

    let purchaseUpdateSub: any;
    let purchaseErrorSub: any;

    const initIAP = async () => {
      try {
        // Import dynamique pour éviter les erreurs sur web
        const iap = await import("expo-iap");
        iapModuleRef.current = iap;

        // Initialiser la connexion
        await iap.initConnection();
        setConnected(true);

        // Configurer les listeners d'achat
        purchaseUpdateSub = iap.purchaseUpdatedListener(async (purchase: any) => {
          try {
            // Déterminer le type d'abonnement
            let subType: SubscriptionType = null;
            if (purchase.productId === IAP_PRODUCTS.PREMIUM_MONTHLY) {
              subType = "monthly";
            } else if (purchase.productId === IAP_PRODUCTS.PREMIUM_YEARLY) {
              subType = "yearly";
            }

            if (subType) {
              // Calculer la date d'expiration
              const expiresAt = new Date();
              if (subType === "monthly") {
                expiresAt.setMonth(expiresAt.getMonth() + 1);
              } else {
                expiresAt.setFullYear(expiresAt.getFullYear() + 1);
              }

              await savePremiumStatus(true, subType, expiresAt.toISOString());
              setIsPremium(true);
              setSubscriptionType(subType);
              onPremiumChange?.(true);
            }

            // Finaliser la transaction
            await iap.finishTransaction({ purchase, isConsumable: false });

            Alert.alert(
              "Abonnement activé",
              `Félicitations ! Votre abonnement ${subType === "monthly" ? "mensuel" : "annuel"} PhytoCheck Premium est actif. Profitez de toutes les fonctionnalités avancées.`,
              [{ text: "OK" }]
            );
          } catch (error) {
            console.error("Erreur finalisation achat:", error);
          } finally {
            setPurchasing(false);
          }
        });

        purchaseErrorSub = iap.purchaseErrorListener((error: any) => {
          // Ne pas afficher d'erreur si l'utilisateur a annulé
          if (error.code !== "E_USER_CANCELLED" && error.code !== "UserCancelled") {
            Alert.alert(
              "Erreur d'achat",
              "L'abonnement n'a pas pu être finalisé. Veuillez réessayer.",
              [{ text: "OK" }]
            );
          }
          setPurchasing(false);
        });

        // Charger les produits
        try {
          const fetchedProducts = await iap.fetchProducts({
            skus: [IAP_PRODUCTS.PREMIUM_MONTHLY, IAP_PRODUCTS.PREMIUM_YEARLY],
          });

          if (fetchedProducts && fetchedProducts.length > 0) {
            const mappedProducts: IAPProduct[] = fetchedProducts.map((p: any) => {
              const isMonthly = p.id === IAP_PRODUCTS.PREMIUM_MONTHLY || p.productId === IAP_PRODUCTS.PREMIUM_MONTHLY;
              return {
                id: p.id || p.productId,
                title: isMonthly ? "PhytoCheck Premium Mensuel" : "PhytoCheck Premium Annuel",
                description: isMonthly
                  ? "Abonnement mensuel - Toutes les fonctionnalités"
                  : "Abonnement annuel - Économisez 17%",
                price: Platform.OS === "ios"
                  ? (p.displayPrice || p.localizedPrice || (isMonthly ? "4,99 €" : "49,99 €"))
                  : (p.subscriptionOfferDetails?.[0]?.pricingPhases?.pricingPhaseList?.[0]?.formattedPrice || p.localizedPrice || (isMonthly ? "4,99 €" : "49,99 €")),
                currency: p.currency || "EUR",
                subscriptionType: isMonthly ? "monthly" : "yearly",
              };
            });
            setProducts(mappedProducts);

            // Mettre à jour les prix affichés
            const monthly = mappedProducts.find((p) => p.subscriptionType === "monthly");
            const yearly = mappedProducts.find((p) => p.subscriptionType === "yearly");
            if (monthly) setMonthlyPrice(monthly.price);
            if (yearly) setYearlyPrice(yearly.price);
          }
        } catch (productError) {
          console.warn("Impossible de charger les produits IAP:", productError);
        }

        // Vérifier les achats existants (restauration automatique)
        try {
          const availablePurchases = await iap.getAvailablePurchases();
          if (availablePurchases) {
            const premiumPurchase = availablePurchases.find(
              (p: any) =>
                p.productId === IAP_PRODUCTS.PREMIUM_MONTHLY ||
                p.productId === IAP_PRODUCTS.PREMIUM_YEARLY
            );
            if (premiumPurchase && !isPremium) {
              const subType: SubscriptionType =
                premiumPurchase.productId === IAP_PRODUCTS.PREMIUM_MONTHLY ? "monthly" : "yearly";
              
              // Calculer la date d'expiration
              const expiresAt = new Date();
              if (subType === "monthly") {
                expiresAt.setMonth(expiresAt.getMonth() + 1);
              } else {
                expiresAt.setFullYear(expiresAt.getFullYear() + 1);
              }

              await savePremiumStatus(true, subType, expiresAt.toISOString());
              setIsPremium(true);
              setSubscriptionType(subType);
              onPremiumChange?.(true);
            }
          }
        } catch (restoreError) {
          console.warn("Impossible de vérifier les achats existants:", restoreError);
        }
      } catch (error) {
        console.warn("Erreur initialisation IAP:", error);
        setConnected(false);
      }
    };

    initIAP();

    return () => {
      purchaseUpdateSub?.remove();
      purchaseErrorSub?.remove();
      // Fermer la connexion IAP
      iapModuleRef.current?.endConnection?.();
    };
  }, [platformSupported]);

  // Lancer l'achat d'un abonnement
  const purchaseSubscription = useCallback(
    async (type: SubscriptionType) => {
      if (!type) return;

      if (!connected || !iapModuleRef.current) {
        Alert.alert(
          "Service indisponible",
          "Le service d'abonnement n'est pas disponible. Vérifiez votre connexion internet et réessayez.",
          [{ text: "OK" }]
        );
        return;
      }

      if (isPremium) {
        Alert.alert(
          "Déjà Premium",
          `Vous bénéficiez déjà d'un abonnement ${subscriptionType === "monthly" ? "mensuel" : "annuel"}. Gérez votre abonnement depuis les paramètres de votre compte ${Platform.OS === "ios" ? "Apple" : "Google Play"}.`,
          [{ text: "OK" }]
        );
        return;
      }

      setPurchasing(true);

      const productId = type === "monthly" ? IAP_PRODUCTS.PREMIUM_MONTHLY : IAP_PRODUCTS.PREMIUM_YEARLY;

      try {
        await iapModuleRef.current.requestPurchase({
          request: {
            apple: { sku: productId },
            google: { skus: [productId] },
          },
        });
        // Le résultat sera géré par purchaseUpdatedListener
      } catch (error: any) {
        if (error.code !== "E_USER_CANCELLED" && error.code !== "UserCancelled") {
          Alert.alert(
            "Erreur",
            "Impossible de lancer l'abonnement. Veuillez réessayer.",
            [{ text: "OK" }]
          );
        }
        setPurchasing(false);
      }
    },
    [connected, isPremium, subscriptionType]
  );

  // Restaurer les achats
  const restorePurchases = useCallback(async () => {
    if (!connected || !iapModuleRef.current) {
      Alert.alert(
        "Service indisponible",
        "Le service d'abonnement n'est pas disponible. Vérifiez votre connexion internet.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      const availablePurchases = await iapModuleRef.current.getAvailablePurchases();
      if (availablePurchases) {
        const premiumPurchase = availablePurchases.find(
          (p: any) =>
            p.productId === IAP_PRODUCTS.PREMIUM_MONTHLY ||
            p.productId === IAP_PRODUCTS.PREMIUM_YEARLY
        );
        if (premiumPurchase) {
          const subType: SubscriptionType =
            premiumPurchase.productId === IAP_PRODUCTS.PREMIUM_MONTHLY ? "monthly" : "yearly";
          
          // Calculer la date d'expiration
          const expiresAt = new Date();
          if (subType === "monthly") {
            expiresAt.setMonth(expiresAt.getMonth() + 1);
          } else {
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          }

          await savePremiumStatus(true, subType, expiresAt.toISOString());
          setIsPremium(true);
          setSubscriptionType(subType);
          onPremiumChange?.(true);

          Alert.alert(
            "Abonnement restauré",
            `Votre abonnement ${subType === "monthly" ? "mensuel" : "annuel"} a été restauré avec succès.`,
            [{ text: "OK" }]
          );
        } else {
          Alert.alert(
            "Aucun abonnement",
            "Aucun abonnement actif trouvé sur ce compte.",
            [{ text: "OK" }]
          );
        }
      }
    } catch (error) {
      Alert.alert(
        "Erreur",
        "Impossible de restaurer les abonnements. Veuillez réessayer.",
        [{ text: "OK" }]
      );
    }
  }, [connected]);

  const value: IAPContextType = {
    connected,
    products,
    purchasing,
    isPremium,
    subscriptionType,
    purchaseSubscription,
    restorePurchases,
    monthlyPrice,
    yearlyPrice,
    platformSupported,
  };

  return <IAPContext.Provider value={value}>{children}</IAPContext.Provider>;
}
