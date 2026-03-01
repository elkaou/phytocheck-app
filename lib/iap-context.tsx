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
  getProductIds,
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
            console.log("Purchase received:", purchase);
            
            // Pour Google Play Billing v5+, le productId est l'ID de base
            // Le base plan est dans purchase.subscriptionOfferDetails ou purchase.basePlanId
            let subType: SubscriptionType = null;
            
            // Déterminer le product ID selon la plateforme
            const productIdMatch = Platform.OS === "android" 
              ? (purchase as any).productId === IAP_PRODUCTS_ANDROID.PREMIUM
              : ((purchase as any).productId === IAP_PRODUCTS_IOS.PREMIUM_MONTHLY || (purchase as any).productId === IAP_PRODUCTS_IOS.PREMIUM_YEARLY);
            
            if (productIdMatch) {
              // Déterminer le type d'abonnement à partir du base plan
              const basePlanId = (purchase as any).basePlanId || (purchase as any).subscriptionOfferDetails?.basePlanId;
              
              if (basePlanId === IAP_BASE_PLANS.MONTHLY) {
                subType = "monthly";
              } else if (basePlanId === IAP_BASE_PLANS.YEARLY) {
                subType = "yearly";
              } else {
                // Fallback : essayer de déterminer à partir du prix ou autre info
                // Pour l'instant, on considère que c'est mensuel par défaut
                subType = "monthly";
              }
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
          console.error("Purchase error:", error);
          // Ne pas afficher d'erreur si l'utilisateur a annulé
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
            const fetchedProducts = await iap.fetchProducts({
              skus: [IAP_PRODUCTS_ANDROID.PREMIUM],
              type: 'subs',
            });

            console.log("Fetched products (Android):", fetchedProducts);

            if (fetchedProducts && fetchedProducts.length > 0) {
              const product = fetchedProducts[0];
              // Sur Android avec Billing v5+, les base plans sont dans subscriptionOfferDetails
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
                    description: "Abonnement annuel - Économisez 17%",
                    price: price,
                    currency: "EUR",
                    subscriptionType: "yearly",
                  });
                  setYearlyPrice(price);
                }
              }
              console.log("[IAP DEBUG] Mapped products count:", mappedProducts.length);
            } else {
              console.log("[IAP DEBUG] No products fetched from Google Play!");
            }
          } else {
            // iOS : Deux product IDs séparés
            const fetchedProducts = await iap.fetchProducts({
              skus: [IAP_PRODUCTS_IOS.PREMIUM_MONTHLY, IAP_PRODUCTS_IOS.PREMIUM_YEARLY],
            });

            console.log("Fetched products (iOS):", fetchedProducts);

            if (fetchedProducts && fetchedProducts.length > 0) {
              for (const product of fetchedProducts) {
                const isMonthly = (product as any).productId === IAP_PRODUCTS_IOS.PREMIUM_MONTHLY;
                const price = product.displayPrice || (product as any).localizedPrice || (isMonthly ? "4,99 €" : "49,99 €");
                
                mappedProducts.push({
                  id: (product as any).productId,
                  title: isMonthly ? "PhytoCheck Premium Mensuel" : "PhytoCheck Premium Annuel",
                  description: isMonthly ? "Abonnement mensuel - Toutes les fonctionnalités" : "Abonnement annuel - Économisez 17%",
                  price: price,
                  currency: product.currency || "EUR",
                  subscriptionType: isMonthly ? "monthly" : "yearly",
                });
                
                if (isMonthly) {
                  setMonthlyPrice(price);
                } else {
                  setYearlyPrice(price);
                }
              }
            }
          }

          setProducts(mappedProducts);
        } catch (productError) {
          console.error("[IAP DEBUG] Error loading products:", productError);
          console.error("[IAP DEBUG] Error details:", JSON.stringify(productError, null, 2));
          Alert.alert(
            "Erreur de chargement IAP",
            `Impossible de charger les produits.\n\nErreur: ${(productError as any).message || JSON.stringify(productError)}`,
            [{ text: "OK" }]
          );
        }

        // Vérifier les achats existants (restauration automatique + révocation)
        try {
          const availablePurchases = await iap.getAvailablePurchases();
          if (availablePurchases && availablePurchases.length > 0) {
            let premiumPurchase: any = null;
            let subType: SubscriptionType = null;
            
            if (Platform.OS === "android") {
              // Android : chercher l'abonnement avec l'ID de base
              premiumPurchase = availablePurchases.find(
                (p: any) => p.productId === IAP_PRODUCTS_ANDROID.PREMIUM
              );
              
              if (premiumPurchase) {
                // Déterminer le type d'abonnement à partir du base plan
                const basePlanId = (premiumPurchase as any).basePlanId || (premiumPurchase as any).subscriptionOfferDetails?.basePlanId;
                
                if (basePlanId === IAP_BASE_PLANS.MONTHLY) {
                  subType = "monthly";
                } else if (basePlanId === IAP_BASE_PLANS.YEARLY) {
                  subType = "yearly";
                } else {
                  subType = "monthly"; // Fallback
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
              // Abonnement actif trouvé
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
              console.log("[IAP] Premium actif via getAvailablePurchases:", subType);
            } else {
              // Aucun abonnement actif parmi les achats disponibles → révoquer
              await savePremiumStatus(false, null);
              setIsPremium(false);
              setSubscriptionType(null);
              onPremiumChange?.(false);
              console.log("[IAP] Aucun abonnement actif dans getAvailablePurchases → Premium révoqué");
            }
          } else {
            // getAvailablePurchases vide → aucun abonnement actif → révoquer
            await savePremiumStatus(false, null);
            setIsPremium(false);
            setSubscriptionType(null);
            onPremiumChange?.(false);
            console.log("[IAP] getAvailablePurchases vide → Premium révoqué");
          }
        } catch (restoreError) {
          console.warn("Impossible de vérifier les achats existants:", restoreError);
          // En cas d'erreur réseau, on ne révoque pas pour éviter une fausse révocation
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

      try {
        const targetProduct = products.find(p => p.subscriptionType === type);
        
        if (!targetProduct) {
          throw new Error("Produit non trouvé");
        }
        
        if (Platform.OS === "android") {
          // Sur Android avec Billing v5+, on doit spécifier le base plan via offerToken
          if (!targetProduct.offerToken) {
            throw new Error("offerToken manquant pour Android");
          }

          console.log("Requesting purchase (Android):", {
            productId: IAP_PRODUCTS_ANDROID.PREMIUM,
            basePlanId: type === "monthly" ? IAP_BASE_PLANS.MONTHLY : IAP_BASE_PLANS.YEARLY,
            offerToken: targetProduct.offerToken,
          });

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
          // Sur iOS, utiliser le product ID spécifique (mensuel ou annuel)
          const iosSku = type === "monthly" ? IAP_PRODUCTS_IOS.PREMIUM_MONTHLY : IAP_PRODUCTS_IOS.PREMIUM_YEARLY;
          
          console.log("Requesting purchase (iOS):", {
            productId: iosSku,
          });
          
          await iapModuleRef.current.requestPurchase({
            request: {
              apple: { sku: iosSku },
              google: { skus: [IAP_PRODUCTS_ANDROID.PREMIUM] }, // Fallback (not used on iOS)
            },
          });
        }
        // Le résultat sera géré par purchaseUpdatedListener
      } catch (error: any) {
        console.error("Purchase error:", error);
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
          // Android : chercher l'abonnement avec l'ID de base
          premiumPurchase = availablePurchases.find(
            (p: any) => p.productId === IAP_PRODUCTS_ANDROID.PREMIUM
          );
          
          if (premiumPurchase) {
            // Déterminer le type d'abonnement à partir du base plan
            const basePlanId = (premiumPurchase as any).basePlanId || (premiumPurchase as any).subscriptionOfferDetails?.basePlanId;
            
            if (basePlanId === IAP_BASE_PLANS.MONTHLY) {
              subType = "monthly";
            } else if (basePlanId === IAP_BASE_PLANS.YEARLY) {
              subType = "yearly";
            } else {
              subType = "monthly"; // Fallback
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
      } else {
        Alert.alert(
          "Aucun abonnement",
          "Aucun abonnement actif trouvé sur ce compte.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Restore error:", error);
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
