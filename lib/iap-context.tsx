/**
 * Contexte IAP (In-App Purchase) pour PhytoCheck
 * Fournit un hook useIAPContext pour accéder aux fonctionnalités d'achat
 * Compatible iOS, Android et web (mode dégradé sur web)
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Platform, Alert } from "react-native";
import { IAP_PRODUCTS, savePremiumStatus, loadPremiumStatus, isPlatformSupported } from "./iap-service";

// Types
interface IAPProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  currency: string;
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
  /** Lancer l'achat premium */
  purchasePremium: () => Promise<void>;
  /** Restaurer les achats */
  restorePurchases: () => Promise<void>;
  /** Prix affiché du premium */
  premiumPrice: string;
  /** Plateforme supportée */
  platformSupported: boolean;
}

const IAPContext = createContext<IAPContextType>({
  connected: false,
  products: [],
  purchasing: false,
  isPremium: false,
  purchasePremium: async () => {},
  restorePurchases: async () => {},
  premiumPrice: "4,99 €",
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
  const [premiumPrice, setPremiumPrice] = useState("4,99 €");
  const platformSupported = isPlatformSupported();
  
  // Ref pour les modules expo-iap (chargés dynamiquement)
  const iapModuleRef = useRef<any>(null);

  // Charger le statut premium au démarrage
  useEffect(() => {
    loadPremiumStatus().then((status) => {
      setIsPremium(status);
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
            // Achat réussi - activer premium
            if (purchase.productId === IAP_PRODUCTS.PREMIUM) {
              await savePremiumStatus(true);
              setIsPremium(true);
              onPremiumChange?.(true);
            }

            // Finaliser la transaction (non-consumable)
            await iap.finishTransaction({ purchase, isConsumable: false });

            Alert.alert(
              "Achat réussi",
              "Félicitations ! Vous êtes maintenant PhytoCheck Premium. Profitez de toutes les fonctionnalités avancées.",
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
              "L'achat n'a pas pu être finalisé. Veuillez réessayer.",
              [{ text: "OK" }]
            );
          }
          setPurchasing(false);
        });

        // Charger les produits
        try {
          const fetchedProducts = await iap.fetchProducts({
            skus: [IAP_PRODUCTS.PREMIUM],
          });

          if (fetchedProducts && fetchedProducts.length > 0) {
            const mappedProducts: IAPProduct[] = fetchedProducts.map((p: any) => ({
              id: p.id || p.productId,
              title: p.title || "PhytoCheck Premium",
              description: p.description || "Débloquez toutes les fonctionnalités",
              price: Platform.OS === "ios"
                ? (p.displayPrice || p.localizedPrice || "4,99 €")
                : (p.oneTimePurchaseOfferDetails?.formattedPrice || p.localizedPrice || "4,99 €"),
              currency: p.currency || "EUR",
            }));
            setProducts(mappedProducts);

            // Mettre à jour le prix affiché
            if (mappedProducts.length > 0) {
              setPremiumPrice(mappedProducts[0].price);
            }
          }
        } catch (productError) {
          console.warn("Impossible de charger les produits IAP:", productError);
        }

        // Vérifier les achats existants (restauration automatique)
        try {
          const availablePurchases = await iap.getAvailablePurchases();
          if (availablePurchases) {
            const hasPremium = availablePurchases.some(
              (p: any) => p.productId === IAP_PRODUCTS.PREMIUM
            );
            if (hasPremium && !isPremium) {
              await savePremiumStatus(true);
              setIsPremium(true);
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

  // Lancer l'achat premium
  const purchasePremium = useCallback(async () => {
    if (!connected || !iapModuleRef.current) {
      Alert.alert(
        "Service indisponible",
        "Le service d'achat n'est pas disponible. Vérifiez votre connexion internet et réessayez.",
        [{ text: "OK" }]
      );
      return;
    }

    if (isPremium) {
      Alert.alert(
        "Déjà Premium",
        "Vous bénéficiez déjà de toutes les fonctionnalités Premium.",
        [{ text: "OK" }]
      );
      return;
    }

    setPurchasing(true);

    try {
      await iapModuleRef.current.requestPurchase({
        request: {
          apple: { sku: IAP_PRODUCTS.PREMIUM },
          google: { skus: [IAP_PRODUCTS.PREMIUM] },
        },
      });
      // Le résultat sera géré par purchaseUpdatedListener
    } catch (error: any) {
      if (error.code !== "E_USER_CANCELLED" && error.code !== "UserCancelled") {
        Alert.alert(
          "Erreur",
          "Impossible de lancer l'achat. Veuillez réessayer.",
          [{ text: "OK" }]
        );
      }
      setPurchasing(false);
    }
  }, [connected, isPremium]);

  // Restaurer les achats
  const restorePurchases = useCallback(async () => {
    if (!connected || !iapModuleRef.current) {
      Alert.alert(
        "Service indisponible",
        "Le service d'achat n'est pas disponible. Vérifiez votre connexion internet.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      const availablePurchases = await iapModuleRef.current.getAvailablePurchases();
      if (availablePurchases) {
        const hasPremium = availablePurchases.some(
          (p: any) => p.productId === IAP_PRODUCTS.PREMIUM
        );
        if (hasPremium) {
          await savePremiumStatus(true);
          setIsPremium(true);
          onPremiumChange?.(true);
          Alert.alert(
            "Achats restaurés",
            "Votre abonnement Premium a été restauré avec succès.",
            [{ text: "OK" }]
          );
        } else {
          Alert.alert(
            "Aucun achat trouvé",
            "Aucun achat Premium n'a été trouvé sur votre compte.",
            [{ text: "OK" }]
          );
        }
      }
    } catch (error) {
      Alert.alert(
        "Erreur",
        "Impossible de restaurer les achats. Veuillez réessayer.",
        [{ text: "OK" }]
      );
    }
  }, [connected, isPremium]);

  const value: IAPContextType = {
    connected,
    products,
    purchasing,
    isPremium,
    purchasePremium,
    restorePurchases,
    premiumPrice,
    platformSupported,
  };

  return <IAPContext.Provider value={value}>{children}</IAPContext.Provider>;
}
