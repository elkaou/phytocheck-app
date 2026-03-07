/**
 * Contexte IAP (In-App Purchase) pour PhytoCheck
 * Fournit un hook useIAPContext pour accéder aux fonctionnalités d'abonnement
 * Compatible iOS, Android et web (mode dégradé sur web)
 *
 * Google Play Billing v5+ : Utilise un seul product ID avec plusieurs base plans
 *
 * Stratégie de validation (révocation) :
 * - getAvailablePurchases() est la SOURCE DE VÉRITÉ (Google Play ne retourne que les abonnements actifs)
 * - Si vide → onPremiumChange(false) est appelé pour révoquer le statut Premium
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Platform, Alert } from "react-native";
import {
  IAP_PRODUCTS_ANDROID,
  IAP_PRODUCTS_IOS,
  IAP_BASE_PLANS,
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
  basePlanId?: string; // Pour Android : ID du base plan
  offerToken?: string; // Pour Android : token de l'offre
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
            console.log("[IAP] Purchase received:", JSON.stringify(purchase, null, 2));

            let subType: SubscriptionType = null;

            if (Platform.OS === "android") {
              if ((purchase as any).productId === IAP_PRODUCTS_ANDROID.PREMIUM) {
                const basePlanId = (purchase as any).basePlanId || (purchase as any).subscriptionOfferDetails?.basePlanId;
                if (basePlanId === IAP_BASE_PLANS.MONTHLY) {
                  subType = "monthly";
                } else if (basePlanId === IAP_BASE_PLANS.YEARLY) {
                  subType = "yearly";
                } else {
                  subType = "monthly";
                }
              }
            } else {
              // iOS : deux product IDs séparés
              if ((purchase as any).productId === IAP_PRODUCTS_IOS.PREMIUM_MONTHLY) {
                subType = "monthly";
              } else if ((purchase as any).productId === IAP_PRODUCTS_IOS.PREMIUM_YEARLY) {
                subType = "yearly";
              }
            }

            if (subType) {
              await savePremiumStatus(true, subType, new Date().toISOString());
              setIsPremium(true);
              setSubscriptionType(subType);
              onPremiumChange?.(true);
            }

            // Finaliser la transaction
            await iap.finishTransaction({ purchase, isConsumable: false });

            if (subType) {
              Alert.alert(
                "Abonnement activé",
                `Félicitations ! Votre abonnement ${subType === "monthly" ? "mensuel" : "annuel"} PhytoCheck Premium est actif. Profitez de toutes les fonctionnalités avancées.`,
                [{ text: "OK" }]
              );
            }
          } catch (error) {
            console.error("[IAP] Erreur finalisation achat:", error);
          } finally {
            setPurchasing(false);
          }
        });

        purchaseErrorSub = iap.purchaseErrorListener((error: any) => {
          console.error("[IAP] Purchase error:", error);
          if (error.code !== "E_USER_CANCELLED" && error.code !== "UserCancelled") {
            Alert.alert(
              "Erreur d'achat",
              `L'abonnement n'a pas pu être finalisé. Veuillez réessayer.\n\nDétails: ${error.message || error.code}`,
              [{ text: "OK" }]
            );
          }
          setPurchasing(false);
        });

        // Charger les produits
        try {
          const mappedProducts: IAPProduct[] = [];

          if (Platform.OS === "android") {
            // Android : Un seul product ID avec plusieurs base plans
            // type: 'subs' est requis pour les abonnements Google Play Billing v5+
            const fetchedProducts = await iap.fetchProducts({
              skus: [IAP_PRODUCTS_ANDROID.PREMIUM],
              type: 'subs',
            });

            console.log("[IAP] Fetched products (Android):", JSON.stringify(fetchedProducts, null, 2));

            if (fetchedProducts && fetchedProducts.length > 0) {
              const product = fetchedProducts[0];
              const offerDetails = (product as any).subscriptionOfferDetailsAndroid || (product as any).subscriptionOfferDetails || [];

              for (const offer of offerDetails) {
                const basePlanId = offer.basePlanId;
                const pricingPhase = offer.pricingPhases?.pricingPhaseList?.[0];
                const price = pricingPhase?.formattedPrice || "N/A";

                if (basePlanId === IAP_BASE_PLANS.MONTHLY) {
                  mappedProducts.push({
                    id: IAP_PRODUCTS_ANDROID.PREMIUM,
                    basePlanId: basePlanId,
                    offerToken: offer.offerToken,
                    title: "PhytoCheck Premium Mensuel",
                    description: "Abonnement mensuel - Toutes les fonctionnalités",
                    price: price,
                    currency: "EUR",
                    subscriptionType: "monthly",
                  });
                  setMonthlyPrice(price);
                } else if (basePlanId === IAP_BASE_PLANS.YEARLY) {
                  mappedProducts.push({
                    id: IAP_PRODUCTS_ANDROID.PREMIUM,
                    basePlanId: basePlanId,
                    offerToken: offer.offerToken,
                    title: "PhytoCheck Premium Annuel",
                    description: "Abonnement annuel - Facturation annuelle",
                    price: price,
                    currency: "EUR",
                    subscriptionType: "yearly",
                  });
                  setYearlyPrice(price);
                }
              }
              console.log("[IAP] Mapped products count:", mappedProducts.length);
            } else {
              console.log("[IAP] No products fetched from Google Play!");
            }
          } else {
            // iOS : Deux product IDs séparés pour les abonnements auto-renouvelables
            // IMPORTANT: type: 'subs' est OBLIGATOIRE pour que StoreKit retourne les abonnements
            const fetchedProducts = await iap.fetchProducts({
              skus: [IAP_PRODUCTS_IOS.PREMIUM_MONTHLY, IAP_PRODUCTS_IOS.PREMIUM_YEARLY],
              type: 'subs',
            });

            console.log("[IAP] Fetched products (iOS):", JSON.stringify(fetchedProducts, null, 2));

            if (fetchedProducts && fetchedProducts.length > 0) {
              for (const product of fetchedProducts) {
                // expo-iap utilise product.id (pas product.productId) pour l'identifiant
                const productId = (product as any).id || (product as any).productId;
                const isMonthly = productId === IAP_PRODUCTS_IOS.PREMIUM_MONTHLY;
                const isYearly = productId === IAP_PRODUCTS_IOS.PREMIUM_YEARLY;

                if (!isMonthly && !isYearly) {
                  console.log("[IAP] Produit iOS inconnu:", productId);
                  continue;
                }

                // displayPrice est le prix formaté par StoreKit (ex: "9,99 €")
                const price = (product as any).displayPrice || (product as any).localizedPrice || (isMonthly ? "9,99 €" : "19,99 €");

                mappedProducts.push({
                  id: productId,
                  title: isMonthly ? "PhytoCheck Premium Mensuel" : "PhytoCheck Premium Annuel",
                  description: isMonthly ? "Abonnement mensuel - Toutes les fonctionnalités" : "Abonnement annuel - Facturation annuelle",
                  price: price,
                  currency: (product as any).currency || "EUR",
                  subscriptionType: isMonthly ? "monthly" : "yearly",
                });

                if (isMonthly) {
                  setMonthlyPrice(price);
                } else {
                  setYearlyPrice(price);
                }
              }
              console.log("[IAP] iOS mapped products count:", mappedProducts.length);
            } else {
              console.log("[IAP] No products fetched from App Store! Skus:", [IAP_PRODUCTS_IOS.PREMIUM_MONTHLY, IAP_PRODUCTS_IOS.PREMIUM_YEARLY]);
              // Les produits ne sont pas disponibles (sandbox, review, ou problème réseau)
              // On ajoute des produits par défaut pour que l'UI reste fonctionnelle
              // L'achat sera tenté directement avec le SKU connu
              mappedProducts.push({
                id: IAP_PRODUCTS_IOS.PREMIUM_MONTHLY,
                title: "PhytoCheck Premium Mensuel",
                description: "Abonnement mensuel - Toutes les fonctionnalités",
                price: "9,99 €",
                currency: "EUR",
                subscriptionType: "monthly",
              });
              mappedProducts.push({
                id: IAP_PRODUCTS_IOS.PREMIUM_YEARLY,
                title: "PhytoCheck Premium Annuel",
                description: "Abonnement annuel - Facturation annuelle",
                price: "19,99 €",
                currency: "EUR",
                subscriptionType: "yearly",
              });
            }
          }

          setProducts(mappedProducts);
        } catch (productError) {
          console.error("[IAP] Error loading products:", productError);
          // En cas d'erreur de chargement des produits iOS, ajouter des produits par défaut
          if (Platform.OS === "ios") {
            setProducts([
              {
                id: IAP_PRODUCTS_IOS.PREMIUM_MONTHLY,
                title: "PhytoCheck Premium Mensuel",
                description: "Abonnement mensuel",
                price: "9,99 €",
                currency: "EUR",
                subscriptionType: "monthly",
              },
              {
                id: IAP_PRODUCTS_IOS.PREMIUM_YEARLY,
                title: "PhytoCheck Premium Annuel",
                description: "Abonnement annuel",
                price: "19,99 €",
                currency: "EUR",
                subscriptionType: "yearly",
              },
            ]);
          }
        }

        // Vérifier les achats existants (restauration automatique + révocation)
        try {
          const availablePurchases = await iap.getAvailablePurchases();
          if (availablePurchases && availablePurchases.length > 0) {
            let premiumPurchase: any = null;
            let subType: SubscriptionType = null;

            if (Platform.OS === "android") {
              premiumPurchase = availablePurchases.find(
                (p: any) => p.productId === IAP_PRODUCTS_ANDROID.PREMIUM
              );

              if (premiumPurchase) {
                const basePlanId = (premiumPurchase as any).basePlanId || (premiumPurchase as any).subscriptionOfferDetails?.basePlanId;
                if (basePlanId === IAP_BASE_PLANS.MONTHLY) {
                  subType = "monthly";
                } else if (basePlanId === IAP_BASE_PLANS.YEARLY) {
                  subType = "yearly";
                } else {
                  subType = "monthly";
                }
              }
            } else {
              // iOS : chercher l'un des deux product IDs
              const monthlyPurchase = availablePurchases.find(
                (p: any) => p.productId === IAP_PRODUCTS_IOS.PREMIUM_MONTHLY
              );
              const yearlyPurchase = availablePurchases.find(
                (p: any) => p.productId === IAP_PRODUCTS_IOS.PREMIUM_YEARLY
              );

              if (monthlyPurchase) {
                premiumPurchase = monthlyPurchase;
                subType = "monthly";
              } else if (yearlyPurchase) {
                premiumPurchase = yearlyPurchase;
                subType = "yearly";
              }
            }

            if (premiumPurchase && subType) {
              await savePremiumStatus(true, subType, new Date().toISOString());
              setIsPremium(true);
              setSubscriptionType(subType);
              onPremiumChange?.(true);
              console.log("[IAP] Premium actif via getAvailablePurchases:", subType);
            } else {
              await savePremiumStatus(false, null);
              setIsPremium(false);
              setSubscriptionType(null);
              onPremiumChange?.(false);
              console.log("[IAP] Aucun abonnement actif → Premium révoqué");
            }
          } else {
            await savePremiumStatus(false, null);
            setIsPremium(false);
            setSubscriptionType(null);
            onPremiumChange?.(false);
            console.log("[IAP] getAvailablePurchases vide → Premium révoqué");
          }
        } catch (restoreError) {
          console.warn("[IAP] Impossible de vérifier les achats existants:", restoreError);
        }
      } catch (error) {
        console.warn("[IAP] Erreur initialisation IAP:", error);
        setConnected(false);
      }
    };

    initIAP();

    return () => {
      purchaseUpdateSub?.remove();
      purchaseErrorSub?.remove();
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

      try {
        if (Platform.OS === "android") {
          const targetProduct = products.find(p => p.subscriptionType === type);

          if (!targetProduct || !targetProduct.offerToken) {
            throw new Error("Produit Android non trouvé ou offerToken manquant");
          }

          await iapModuleRef.current.requestPurchase({
            type: 'subs',
            request: {
              google: {
                skus: [IAP_PRODUCTS_ANDROID.PREMIUM],
                subscriptionOffers: [{
                  sku: IAP_PRODUCTS_ANDROID.PREMIUM,
                  offerToken: targetProduct.offerToken,
                }],
              },
            },
          });
        } else {
          // iOS : type: 'subs' OBLIGATOIRE pour les abonnements auto-renouvelables
          const iosSku = type === "monthly" ? IAP_PRODUCTS_IOS.PREMIUM_MONTHLY : IAP_PRODUCTS_IOS.PREMIUM_YEARLY;

          console.log("[IAP] Requesting purchase (iOS):", { sku: iosSku, type: 'subs' });

          await iapModuleRef.current.requestPurchase({
            type: 'subs',
            request: {
              apple: { sku: iosSku },
            },
          });
        }
      } catch (error: any) {
        console.error("[IAP] Purchase error:", error);
        if (error.code !== "E_USER_CANCELLED" && error.code !== "UserCancelled") {
          Alert.alert(
            "Erreur",
            `Impossible de lancer l'abonnement. Veuillez réessayer.\n\nDétails: ${error.message || error.code}`,
            [{ text: "OK" }]
          );
        }
        setPurchasing(false);
      }
    },
    [connected, isPremium, subscriptionType, products]
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
      if (availablePurchases && availablePurchases.length > 0) {
        let premiumPurchase: any = null;
        let subType: SubscriptionType = null;

        if (Platform.OS === "android") {
          premiumPurchase = availablePurchases.find(
            (p: any) => p.productId === IAP_PRODUCTS_ANDROID.PREMIUM
          );

          if (premiumPurchase) {
            const basePlanId = (premiumPurchase as any).basePlanId || (premiumPurchase as any).subscriptionOfferDetails?.basePlanId;
            if (basePlanId === IAP_BASE_PLANS.MONTHLY) {
              subType = "monthly";
            } else if (basePlanId === IAP_BASE_PLANS.YEARLY) {
              subType = "yearly";
            } else {
              subType = "monthly";
            }
          }
        } else {
          const monthlyPurchase = availablePurchases.find(
            (p: any) => p.productId === IAP_PRODUCTS_IOS.PREMIUM_MONTHLY
          );
          const yearlyPurchase = availablePurchases.find(
            (p: any) => p.productId === IAP_PRODUCTS_IOS.PREMIUM_YEARLY
          );

          if (monthlyPurchase) {
            premiumPurchase = monthlyPurchase;
            subType = "monthly";
          } else if (yearlyPurchase) {
            premiumPurchase = yearlyPurchase;
            subType = "yearly";
          }
        }

        if (premiumPurchase && subType) {
          await savePremiumStatus(true, subType, new Date().toISOString());
          setIsPremium(true);
          setSubscriptionType(subType);
          onPremiumChange?.(true);

          Alert.alert(
            "Abonnement restauré",
            `Votre abonnement ${subType === "monthly" ? "mensuel" : "annuel"} a été restauré avec succès.`,
            [{ text: "OK" }]
          );
        } else {
          Alert.alert("Aucun abonnement", "Aucun abonnement actif trouvé sur ce compte.", [{ text: "OK" }]);
        }
      } else {
        Alert.alert("Aucun abonnement", "Aucun abonnement actif trouvé sur ce compte.", [{ text: "OK" }]);
      }
    } catch (error) {
      console.error("[IAP] Restore error:", error);
      Alert.alert("Erreur", "Impossible de restaurer les abonnements. Veuillez réessayer.", [{ text: "OK" }]);
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
