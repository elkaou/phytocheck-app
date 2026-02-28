/**
 * Contexte IAP (In-App Purchase) pour PhytoCheck
 * Compatible iOS, Android et web (mode dégradé sur web)
 * 
 * Basé sur expo-iap v3.4.1 :
 * - fetchProducts({ skus, type: 'subs' }) retourne ProductSubscriptionAndroid[]
 * - ProductSubscriptionAndroid.id = product ID
 * - ProductSubscriptionAndroid.subscriptionOfferDetailsAndroid[] = base plans
 * - subscriptionOfferDetailsAndroid[].basePlanId, .offerToken, .pricingPhases
 * 
 * Stratégie de validation :
 * - getAvailablePurchases() est la SOURCE DE VÉRITÉ (Google Play ne retourne que les abonnements actifs)
 * - Aucune date d'expiration calculée localement
 * - transactionDate stockée à titre informatif
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

interface IAPProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  subscriptionType: SubscriptionType;
  // Pour Android : offerToken requis pour requestPurchase
  offerToken?: string;
  // Pour Android : basePlanId pour identification
  basePlanId?: string;
}

interface IAPContextType {
  connected: boolean;
  products: IAPProduct[];
  purchasing: boolean;
  isPremium: boolean;
  subscriptionType: SubscriptionType;
  purchaseSubscription: (type: SubscriptionType) => Promise<void>;
  restorePurchases: () => Promise<void>;
  monthlyPrice: string;
  yearlyPrice: string;
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
  const iapModuleRef = useRef<any>(null);

  // Charger le cache local au démarrage
  useEffect(() => {
    loadPremiumStatus().then((status) => {
      setIsPremium(status.isPremium);
      setSubscriptionType(status.subscriptionType);
    });
  }, []);

  useEffect(() => {
    if (!platformSupported) return;

    let purchaseUpdateSub: any;
    let purchaseErrorSub: any;

    const initIAP = async () => {
      try {
        const iap = await import("expo-iap");
        iapModuleRef.current = iap;

        await iap.initConnection();
        setConnected(true);
        console.log("[IAP] Connection established");

        // Listener : achat finalisé
        purchaseUpdateSub = iap.purchaseUpdatedListener(async (purchase: any) => {
          try {
            console.log("[IAP] Purchase received:", JSON.stringify(purchase, null, 2));

            let subType: SubscriptionType = null;

            if (Platform.OS === "android") {
              if (purchase.productId === IAP_PRODUCTS_ANDROID.PREMIUM) {
                // Déterminer le type via basePlanId
                const basePlanId = purchase.basePlanId;
                if (basePlanId === IAP_BASE_PLANS.MONTHLY) {
                  subType = "monthly";
                } else if (basePlanId === IAP_BASE_PLANS.YEARLY) {
                  subType = "yearly";
                } else {
                  // Fallback : chercher dans les offres
                  subType = "monthly";
                  console.warn("[IAP] basePlanId non trouvé, fallback monthly. Purchase:", purchase);
                }
              }
            } else {
              if (purchase.productId === IAP_PRODUCTS_IOS.PREMIUM_MONTHLY) {
                subType = "monthly";
              } else if (purchase.productId === IAP_PRODUCTS_IOS.PREMIUM_YEARLY) {
                subType = "yearly";
              }
            }

            if (subType) {
              const transactionDate = purchase.transactionDate
                ? new Date(purchase.transactionDate).toISOString()
                : new Date().toISOString();

              await savePremiumStatus(true, subType, transactionDate);
              setIsPremium(true);
              setSubscriptionType(subType);
              onPremiumChange?.(true);

              // Finaliser la transaction
              await iap.finishTransaction({ purchase, isConsumable: false });

              Alert.alert(
                "Abonnement activé",
                `Félicitations ! Votre abonnement ${subType === "monthly" ? "mensuel" : "annuel"} PhytoCheck Premium est actif.`,
                [{ text: "OK" }]
              );
            } else {
              console.warn("[IAP] Produit non reconnu dans purchaseUpdatedListener:", purchase.productId);
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
              `L'abonnement n'a pas pu être finalisé.\n\nCode: ${error.code}\nDétails: ${error.message}`,
              [{ text: "OK" }]
            );
          }
          setPurchasing(false);
        });

        // ─── Charger les produits ───────────────────────────────────────────
        try {
          const mappedProducts: IAPProduct[] = [];

          if (Platform.OS === "android") {
            console.log("[IAP] Fetching Android subscriptions, SKU:", IAP_PRODUCTS_ANDROID.PREMIUM);

            const fetchedProducts = await iap.fetchProducts({
              skus: [IAP_PRODUCTS_ANDROID.PREMIUM],
              type: "subs",
            });

            console.log("[IAP] fetchProducts result:", JSON.stringify(fetchedProducts, null, 2));

            if (fetchedProducts && fetchedProducts.length > 0) {
              const product = fetchedProducts[0] as any;
              // expo-iap v3 : subscriptionOfferDetailsAndroid (pas subscriptionOfferDetails)
              const offerDetails: any[] = product.subscriptionOfferDetailsAndroid ?? [];

              console.log("[IAP] subscriptionOfferDetailsAndroid:", JSON.stringify(offerDetails, null, 2));

              for (const offer of offerDetails) {
                const basePlanId: string = offer.basePlanId ?? "";
                const offerToken: string = offer.offerToken ?? "";
                // Prix dans pricingPhases.pricingPhaseList[0].formattedPrice
                const pricingPhaseList: any[] = offer.pricingPhases?.pricingPhaseList ?? [];
                const price: string = pricingPhaseList[0]?.formattedPrice ?? "N/A";

                if (basePlanId === IAP_BASE_PLANS.MONTHLY) {
                  mappedProducts.push({
                    id: product.id,
                    basePlanId,
                    offerToken,
                    title: "PhytoCheck Premium Mensuel",
                    description: "Abonnement mensuel - Toutes les fonctionnalités",
                    price,
                    currency: product.currency ?? "EUR",
                    subscriptionType: "monthly",
                  });
                  setMonthlyPrice(price);
                  console.log("[IAP] Monthly plan found:", basePlanId, price, offerToken);
                } else if (basePlanId === IAP_BASE_PLANS.YEARLY) {
                  mappedProducts.push({
                    id: product.id,
                    basePlanId,
                    offerToken,
                    title: "PhytoCheck Premium Annuel",
                    description: "Abonnement annuel - Économisez 17%",
                    price,
                    currency: product.currency ?? "EUR",
                    subscriptionType: "yearly",
                  });
                  setYearlyPrice(price);
                  console.log("[IAP] Yearly plan found:", basePlanId, price, offerToken);
                } else {
                  console.log("[IAP] Unknown basePlanId:", basePlanId);
                }
              }

              if (offerDetails.length === 0) {
                console.warn("[IAP] subscriptionOfferDetailsAndroid est vide ! Le produit existe mais n'a pas d'offres.");
              }
            } else {
              console.warn("[IAP] fetchProducts a retourné 0 résultat pour", IAP_PRODUCTS_ANDROID.PREMIUM);
            }
          } else {
            // iOS
            const fetchedProducts = await iap.fetchProducts({
              skus: [IAP_PRODUCTS_IOS.PREMIUM_MONTHLY, IAP_PRODUCTS_IOS.PREMIUM_YEARLY],
            });

            if (fetchedProducts && fetchedProducts.length > 0) {
              for (const product of fetchedProducts as any[]) {
                const isMonthly = product.id === IAP_PRODUCTS_IOS.PREMIUM_MONTHLY;
                const price = product.displayPrice ?? (isMonthly ? "4,99 €" : "49,99 €");

                mappedProducts.push({
                  id: product.id,
                  title: isMonthly ? "PhytoCheck Premium Mensuel" : "PhytoCheck Premium Annuel",
                  description: isMonthly ? "Abonnement mensuel" : "Abonnement annuel - Économisez 17%",
                  price,
                  currency: product.currency ?? "EUR",
                  subscriptionType: isMonthly ? "monthly" : "yearly",
                });

                if (isMonthly) setMonthlyPrice(price);
                else setYearlyPrice(price);
              }
            }
          }

          setProducts(mappedProducts);
          console.log("[IAP] Products set:", mappedProducts.length, "products");
        } catch (productError: any) {
          console.error("[IAP] Erreur chargement produits:", productError);
          Alert.alert(
            "Erreur IAP",
            `Impossible de charger les produits.\n\n${productError?.message ?? JSON.stringify(productError)}`,
            [{ text: "OK" }]
          );
        }

        // ─── Vérifier abonnements existants via getAvailablePurchases ──────
        try {
          const availablePurchases = await iap.getAvailablePurchases();
          console.log("[IAP] Available purchases:", JSON.stringify(availablePurchases, null, 2));

          if (availablePurchases && availablePurchases.length > 0) {
            let premiumPurchase: any = null;
            let subType: SubscriptionType = null;

            if (Platform.OS === "android") {
              premiumPurchase = availablePurchases.find(
                (p: any) => p.productId === IAP_PRODUCTS_ANDROID.PREMIUM
              );
              if (premiumPurchase) {
                const basePlanId = premiumPurchase.basePlanId;
                subType = basePlanId === IAP_BASE_PLANS.YEARLY ? "yearly" : "monthly";
              }
            } else {
              const monthly = availablePurchases.find((p: any) => p.productId === IAP_PRODUCTS_IOS.PREMIUM_MONTHLY);
              const yearly = availablePurchases.find((p: any) => p.productId === IAP_PRODUCTS_IOS.PREMIUM_YEARLY);
              if (monthly) { premiumPurchase = monthly; subType = "monthly"; }
              else if (yearly) { premiumPurchase = yearly; subType = "yearly"; }
            }

            if (premiumPurchase && subType) {
              const transactionDate = premiumPurchase.transactionDate
                ? new Date(premiumPurchase.transactionDate).toISOString()
                : new Date().toISOString();
              await savePremiumStatus(true, subType, transactionDate);
              setIsPremium(true);
              setSubscriptionType(subType);
              onPremiumChange?.(true);
              console.log("[IAP] Premium actif via getAvailablePurchases:", subType);
            } else {
              await savePremiumStatus(false, null);
              setIsPremium(false);
              setSubscriptionType(null);
            }
          } else {
            await savePremiumStatus(false, null);
            setIsPremium(false);
            setSubscriptionType(null);
          }
        } catch (restoreError) {
          console.warn("[IAP] Impossible de vérifier les achats existants:", restoreError);
        }
      } catch (error) {
        console.warn("[IAP] Erreur initialisation:", error);
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

  // ─── Lancer un achat ─────────────────────────────────────────────────────
  const purchaseSubscription = useCallback(
    async (type: SubscriptionType) => {
      if (!type) return;

      if (!connected || !iapModuleRef.current) {
        Alert.alert("Service indisponible", "Le service d'abonnement n'est pas disponible. Vérifiez votre connexion internet.", [{ text: "OK" }]);
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

      const targetProduct = products.find(p => p.subscriptionType === type);
      if (!targetProduct) {
        Alert.alert("Produit indisponible", "Ce produit n'est pas disponible pour le moment. Réessayez plus tard.", [{ text: "OK" }]);
        return;
      }

      setPurchasing(true);

      try {
        if (Platform.OS === "android") {
          if (!targetProduct.offerToken) {
            throw new Error(`offerToken manquant pour le plan ${type}. Le produit a-t-il bien été chargé ?`);
          }

          console.log("[IAP] requestPurchase Android:", {
            sku: targetProduct.id,
            basePlanId: targetProduct.basePlanId,
            offerToken: targetProduct.offerToken,
          });

          // expo-iap v3 : pour les abonnements Android, utiliser type: 'subs' et subscriptionOffers
          await iapModuleRef.current.requestPurchase({
            type: "subs",
            request: {
              google: {
                skus: [targetProduct.id],
                subscriptionOffers: [
                  {
                    sku: targetProduct.id,
                    offerToken: targetProduct.offerToken,
                  },
                ],
              },
            },
          });
        } else {
          const iosSku = type === "monthly" ? IAP_PRODUCTS_IOS.PREMIUM_MONTHLY : IAP_PRODUCTS_IOS.PREMIUM_YEARLY;
          console.log("[IAP] requestPurchase iOS:", iosSku);

          await iapModuleRef.current.requestPurchase({
            type: "subs",
            request: {
              apple: { sku: iosSku },
            },
          });
        }
        // Résultat géré par purchaseUpdatedListener
      } catch (error: any) {
        console.error("[IAP] Purchase error:", error);
        if (error.code !== "E_USER_CANCELLED" && error.code !== "UserCancelled") {
          Alert.alert("Erreur", `Impossible de lancer l'abonnement.\n\n${error.message ?? error.code}`, [{ text: "OK" }]);
        }
        setPurchasing(false);
      }
    },
    [connected, isPremium, subscriptionType, products]
  );

  // ─── Restaurer les achats ─────────────────────────────────────────────────
  const restorePurchases = useCallback(async () => {
    if (!connected || !iapModuleRef.current) {
      Alert.alert("Service indisponible", "Le service d'abonnement n'est pas disponible.", [{ text: "OK" }]);
      return;
    }

    try {
      const availablePurchases = await iapModuleRef.current.getAvailablePurchases();
      console.log("[IAP] Restore - available purchases:", JSON.stringify(availablePurchases, null, 2));

      if (availablePurchases && availablePurchases.length > 0) {
        let premiumPurchase: any = null;
        let subType: SubscriptionType = null;

        if (Platform.OS === "android") {
          premiumPurchase = availablePurchases.find((p: any) => p.productId === IAP_PRODUCTS_ANDROID.PREMIUM);
          if (premiumPurchase) {
            subType = premiumPurchase.basePlanId === IAP_BASE_PLANS.YEARLY ? "yearly" : "monthly";
          }
        } else {
          const monthly = availablePurchases.find((p: any) => p.productId === IAP_PRODUCTS_IOS.PREMIUM_MONTHLY);
          const yearly = availablePurchases.find((p: any) => p.productId === IAP_PRODUCTS_IOS.PREMIUM_YEARLY);
          if (monthly) { premiumPurchase = monthly; subType = "monthly"; }
          else if (yearly) { premiumPurchase = yearly; subType = "yearly"; }
        }

        if (premiumPurchase && subType) {
          const transactionDate = premiumPurchase.transactionDate
            ? new Date(premiumPurchase.transactionDate).toISOString()
            : new Date().toISOString();
          await savePremiumStatus(true, subType, transactionDate);
          setIsPremium(true);
          setSubscriptionType(subType);
          onPremiumChange?.(true);
          Alert.alert("Abonnement restauré", `Votre abonnement ${subType === "monthly" ? "mensuel" : "annuel"} a été restauré.`, [{ text: "OK" }]);
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

  return (
    <IAPContext.Provider value={{
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
    }}>
      {children}
    </IAPContext.Provider>
  );
}
