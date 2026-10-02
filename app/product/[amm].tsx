import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  StyleSheet,
  Alert,
  Linking,
} from "react-native";
import { QuantityModal } from "@/components/quantity-modal";
import { UsagesModal } from "@/components/usages-modal";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  getProductByAMM,
  ClassifiedProduct,
  getClassificationLabel,
  getClassificationColor,
  getClassificationBgColor,
  createEmergencyAuthorizationProduct,
} from "@/lib/product-service";
import {
  formatEmergencyAuthorizationDate,
  getEmergencyAuthorizationsForAmm,
} from "@/lib/emergency-authorizations";
import { useApp } from "@/lib/app-context";
import { useData, ProductUsage } from "@/lib/data-context";

export default function ProductDetailScreen() {
  const params = useLocalSearchParams<{ amm: string | string[]; name?: string | string[]; culture?: string | string[] }>();
  // useLocalSearchParams peut retourner string | string[] selon la plateforme
  const amm = Array.isArray(params.amm) ? params.amm[0] : params.amm;
  const name = Array.isArray(params.name) ? params.name[0] : params.name;
  // Culture pré-sélectionnée depuis la recherche par culture (pour pré-filtrer les usages)
  const initialCulture = Array.isArray(params.culture) ? params.culture[0] : params.culture;
  const router = useRouter();
  const { addProductToStock, isProductInStock, getProductQuantity, updateProductQuantity, isPremium, stock } = useApp();
  const {
    products: dynamicProducts,
    riskPhrases: dynamicRiskPhrases,
    usages: dynamicUsages,
    emergencyAuthorizations,
  } = useData();

  const [product, setProduct] = useState<ClassifiedProduct | null>(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showUsagesModal, setShowUsagesModal] = useState(false);
  const inStock = amm ? isProductInStock(amm) : false;

  useEffect(() => {
    if (amm) {
      const p = getProductByAMM(amm, name, dynamicProducts, dynamicRiskPhrases);
      setProduct(p);
    }
  }, [amm, name, dynamicProducts, dynamicRiskPhrases]);

  const currentQuantity = amm ? getProductQuantity(amm) : 0;

  // Récupérer les usages pour ce produit (par numéro AMM) — exclure les usages retirés
  const productUsages: ProductUsage[] = amm
    ? (dynamicUsages[amm] ?? []).filter((u) => u.etat?.toLowerCase() !== "retrait")
    : [];
  const hasUsages = productUsages.length > 0;
  const emergencyAuthorizationsForProduct = useMemo(
    () => (amm ? getEmergencyAuthorizationsForAmm(emergencyAuthorizations, amm) : []),
    [amm, emergencyAuthorizations],
  );
  const emergencyStockProduct = useMemo(
    () => emergencyAuthorizationsForProduct[0]
      ? createEmergencyAuthorizationProduct(emergencyAuthorizationsForProduct[0])
      : null,
    [emergencyAuthorizationsForProduct],
  );

  const openOfficialDecision = useCallback((url: string) => {
    void Linking.openURL(url).catch(() => {
      Alert.alert("Lien indisponible", "La décision officielle ne peut pas être ouverte pour le moment.");
    });
  }, []);

  const handleAddToStock = useCallback(async () => {
    if (!product && !emergencyStockProduct) return;
    setShowQuantityModal(true);
  }, [product, emergencyStockProduct]);

  const handleQuantityConfirm = useCallback(async (quantity: number, unit: "L" | "Kg") => {
    const productToStore = product ?? emergencyStockProduct;
    if (!productToStore) return;
    
    setShowQuantityModal(false);

    // Pass secondary name if the product was accessed via a secondary name
    const secondaryName = product && name && name !== product.nom ? name : undefined;
    const displayName = secondaryName || productToStore.nom;
    const result = await addProductToStock(productToStore, quantity, unit, secondaryName);
    if (result === "added") {
      Alert.alert("Ajouté", `"${displayName}" a été ajouté à votre stock (${quantity} ${unit}).`, [
        {
          text: "OK",
          onPress: () => router.push("/(tabs)/search"),
        },
      ]);
    } else if (result === "incremented") {
      Alert.alert("Quantité mise à jour", `Quantité de "${displayName}" augmentée (+${quantity} ${unit}).`, [
        {
          text: "OK",
          onPress: () => router.push("/(tabs)/search"),
        },
      ]);
    } else if (result === "limit") {
      Alert.alert(
        "Limite atteinte",
        "Vous avez atteint la limite de 20 produits en stock. Passez à Premium pour un stock illimité."
      );
    }
  }, [product, emergencyStockProduct, name, addProductToStock, router]);

  if (!product) {
    const emergencyProductName = emergencyAuthorizationsForProduct[0]?.productName ?? name ?? "Produit";
    return (
      <View style={styles.container}>
        <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
          <View style={styles.headerBar}>
            <Pressable
              style={({ pressed }) => [{ padding: 10, margin: -10 }, pressed && { opacity: 0.6 }]}
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <IconSymbol name="arrow.left" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.headerBarTitle} numberOfLines={1}>{emergencyProductName}</Text>
            <View style={{ width: 24 }} />
          </View>
          {emergencyAuthorizationsForProduct.length === 0 ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Produit non trouvé</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollContent}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.emergencyFallbackCard}>
                <Text style={styles.emergencyFallbackTitle}>Produit signalé dans une autorisation d’urgence</Text>
                <Text style={styles.emergencyFallbackText}>
                  Cette AMM n’est pas présente dans le catalogue E‑Phy actuellement chargé. Consultez la décision ministérielle ci-dessous pour les conditions d’emploi applicables.
                </Text>
                <Text style={styles.ammText}>AMM : {amm}</Text>
              </View>
              <View style={styles.emergencyCard}>
                <Text style={styles.emergencyTitle}>Autorisations d’urgence — 120 jours</Text>
                {emergencyAuthorizationsForProduct.map((authorization) => (
                  <View key={authorization.id} style={styles.emergencyDecision}>
                    <View style={styles.emergencyExpiryBadge}>
                      <Text style={styles.emergencyExpiryText}>
                        Valide jusqu’au {formatEmergencyAuthorizationDate(authorization.expiresAt)}
                      </Text>
                    </View>
                    <Text style={styles.emergencyDecisionLabel}>Culture(s)</Text>
                    <Text style={styles.emergencyDecisionValue}>{authorization.cultures}</Text>
                    <Text style={styles.emergencyDecisionLabel}>Cible / effet recherché</Text>
                    <Text style={styles.emergencyDecisionValue}>{authorization.purpose}</Text>
                    <Pressable
                      style={({ pressed }) => [styles.emergencyDecisionLink, pressed && { opacity: 0.72 }]}
                      onPress={() => openOfficialDecision(authorization.decisionPdfUrl)}
                      accessibilityRole="link"
                      accessibilityLabel={`Consulter la décision officielle pour ${authorization.productName}`}
                    >
                      <Text style={styles.emergencyDecisionLinkText}>Consulter la décision officielle (PDF)</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
              <View style={styles.emergencyStockNotice}>
                <IconSymbol name="info.circle.fill" size={19} color="#1D4ED8" />
                <Text style={styles.emergencyStockNoticeText}>
                  Vous pouvez enregistrer ce produit dans le stock. Il restera identifié comme une autorisation temporaire Article 53 jusqu’à sa présence éventuelle dans E‑Phy.
                </Text>
              </View>
              {inStock ? (
                <View style={styles.stockSection}>
                  <View style={[styles.inStockBadge, styles.emergencyInStockBadge]}>
                    <IconSymbol name="checkmark.circle.fill" size={20} color="#1D4ED8" />
                    <Text style={[styles.inStockText, styles.emergencyInStockText]}>
                      En stock (quantité : {currentQuantity})
                    </Text>
                  </View>
                  <Text style={styles.stockEditNotice}>Pour modifier la quantité restante, ouvrez l’onglet Stock et touchez ce produit.</Text>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.emergencyAddButton,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={handleAddToStock}
                  accessibilityRole="button"
                  accessibilityLabel={`Ajouter ${emergencyProductName} au stock comme autorisation temporaire`}
                >
                  <IconSymbol name="plus.circle.fill" size={22} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>Ajouter au stock</Text>
                </Pressable>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
        <QuantityModal
          visible={showQuantityModal}
          productName={emergencyProductName}
          onCancel={() => setShowQuantityModal(false)}
          onConfirm={handleQuantityConfirm}
        />
      </View>
    );
  }

  const classColor = getClassificationColor(product.classification);
  const classBgColor = getClassificationBgColor(product.classification);
  const classLabel = getClassificationLabel(product.classification);
  const isAuthorise = product.classification !== "retire";

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
        {/* Header bar */}
        <View style={styles.headerBar}>
          <Pressable
            style={({ pressed }) => [{ padding: 10, margin: -10 }, pressed && { opacity: 0.6 }]}
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <IconSymbol name="arrow.left" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerBarTitle} numberOfLines={1}>
            {product.nom}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Classification badge */}
          <View style={styles.classificationSection}>
            <View
              style={[styles.classificationBadge, { backgroundColor: classBgColor, borderColor: classColor }]}
            >
              <Text style={[styles.classificationText, { color: classColor }]}>
                {classLabel}
              </Text>
            </View>
            {product.isCMR && (
              <View style={styles.warningTag}>
                <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#D97706" />
                <Text style={styles.warningTagText}>
                  Produit CMR (Cancérogène, Mutagène ou Reprotoxique)
                </Text>
              </View>
            )}
            {product.isToxique && !product.isCMR && (
              <View style={[styles.warningTag, { backgroundColor: "#FFF7ED" }]}>
                <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#C2410C" />
                <Text style={[styles.warningTagText, { color: "#C2410C" }]}>
                  Produit à toxicité élevée
                </Text>
              </View>
            )}
          </View>

          {/* Product info */}
          <View style={styles.infoCard}>
            <Text style={styles.productName}>{product.nom}</Text>
            <Text style={styles.ammText}>AMM : {product.amm}</Text>

            {product.nomsSecondaires ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Noms secondaires</Text>
                <Text style={styles.infoValue}>{product.nomsSecondaires}</Text>
              </View>
            ) : null}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Titulaire</Text>
              <Text style={styles.infoValue}>{product.titulaire}</Text>
            </View>

            {product.fonctions ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Fonctions</Text>
                <Text style={styles.infoValue}>{product.fonctions}</Text>
              </View>
            ) : null}

            {product.formulation ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Formulation</Text>
                <Text style={styles.infoValue}>{product.formulation}</Text>
              </View>
            ) : null}

            {product.substancesActives ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Substances actives</Text>
                <Text style={styles.infoValue}>
                  {product.substancesActives.split(" | ").join("\n")}
                </Text>
              </View>
            ) : null}

            {product.dateAutorisation ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date de première autorisation</Text>
                <Text style={styles.infoValue}>{product.dateAutorisation}</Text>
              </View>
            ) : null}

            {product.dateRetrait ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date de retrait</Text>
                <Text style={[styles.infoValue, { color: "#EF4444" }]}>
                  {product.dateRetrait}
                </Text>
              </View>
            ) : null}

            {product.gammeUsage ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Gamme d'usage</Text>
                <Text style={styles.infoValue}>{product.gammeUsage}</Text>
              </View>
            ) : null}
          </View>

          {emergencyAuthorizationsForProduct.length > 0 ? (
            <View style={styles.emergencyCard}>
              <Text style={styles.emergencyTitle}>Autorisations d’urgence — 120 jours</Text>
              <Text style={styles.emergencyIntro}>
                Valables uniquement dans le périmètre indiqué par chaque décision ministérielle.
              </Text>
              {emergencyAuthorizationsForProduct.map((authorization) => (
                <View key={authorization.id} style={styles.emergencyDecision}>
                  <View style={styles.emergencyExpiryBadge}>
                    <Text style={styles.emergencyExpiryText}>
                      Valide jusqu’au {formatEmergencyAuthorizationDate(authorization.expiresAt)}
                    </Text>
                  </View>
                  <Text style={styles.emergencyDecisionLabel}>Culture(s)</Text>
                  <Text style={styles.emergencyDecisionValue}>{authorization.cultures}</Text>
                  <Text style={styles.emergencyDecisionLabel}>Cible / effet recherché</Text>
                  <Text style={styles.emergencyDecisionValue}>{authorization.purpose}</Text>
                  <Pressable
                    style={({ pressed }) => [styles.emergencyDecisionLink, pressed && { opacity: 0.72 }]}
                    onPress={() => openOfficialDecision(authorization.decisionPdfUrl)}
                    accessibilityRole="link"
                    accessibilityLabel={`Consulter la décision officielle pour ${authorization.productName}`}
                  >
                    <Text style={styles.emergencyDecisionLinkText}>Consulter la décision officielle (PDF)</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {/* Bouton Usages — uniquement pour les produits autorisés avec des usages disponibles */}
          {isAuthorise && hasUsages && (
            <Pressable
              style={({ pressed }) => [
                styles.usagesButton,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
              onPress={() => setShowUsagesModal(true)}
            >
              <IconSymbol name="list.bullet" size={22} color="#FFFFFF" />
              <Text style={styles.usagesButtonText}>
                Usages autorisés ({productUsages.length})
              </Text>
              <IconSymbol name="chevron.right" size={20} color="#FFFFFF" />
            </Pressable>
          )}

          {/* Risk phrases */}
          {product.riskPhrases.length > 0 && (
            <View style={styles.riskCard}>
              <Text style={styles.riskTitle}>Phrases de risque</Text>
              {product.riskPhrases.map((phrase, index) => (
                <View key={`${phrase.code}-${index}`} style={styles.riskRow}>
                  <View style={styles.riskCodeBadge}>
                    <Text style={styles.riskCode}>{phrase.code}</Text>
                  </View>
                  <Text style={styles.riskDesc}>{phrase.libelle}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Stock section */}
          {inStock ? (
            <View style={styles.stockSection}>
              <View style={styles.inStockBadge}>
                <IconSymbol name="checkmark.circle.fill" size={20} color="#22C55E" />
                <Text style={styles.inStockText}>En stock (quantité : {currentQuantity})</Text>
              </View>
              <Text style={styles.stockEditNotice}>Pour modifier la quantité restante, ouvrez l’onglet Stock et touchez ce produit.</Text>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.addButton,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
              onPress={handleAddToStock}
            >
              <IconSymbol name="plus.circle.fill" size={22} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Ajouter au stock</Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Quantity Modal */}
      <QuantityModal
        visible={showQuantityModal}
        productName={name && name !== product.nom ? name : product.nom}
        onCancel={() => setShowQuantityModal(false)}
        onConfirm={handleQuantityConfirm}
      />

      {/* Usages Modal */}
      <UsagesModal
        visible={showUsagesModal}
        productName={name && name !== product.nom ? name : product.nom}
        usages={productUsages}
        onClose={() => setShowUsagesModal(false)}
        initialCulture={initialCulture}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a7ea5",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#0a7ea5",
  },
  headerBarTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 12,
  },
  scrollContent: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#687076",
  },
  emergencyFallbackCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
  },
  emergencyFallbackTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E3A8A",
  },
  emergencyFallbackText: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  emergencyStockNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  emergencyStockNoticeText: {
    flex: 1,
    color: "#1E3A8A",
    fontSize: 13,
    lineHeight: 19,
  },
  classificationSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 10,
  },
  classificationBadge: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 2,
    alignSelf: "flex-start",
  },
  classificationText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  warningTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  warningTagText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#D97706",
    flex: 1,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 16,
  },
  productName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  ammText: {
    fontSize: 15,
    color: "#687076",
    marginBottom: 16,
  },
  infoRow: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
    marginTop: 12,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#687076",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: "#1A1A1A",
    lineHeight: 22,
  },
  emergencyCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  emergencyTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1D4ED8",
  },
  emergencyIntro: {
    fontSize: 13,
    lineHeight: 19,
    color: "#1E40AF",
    marginTop: 6,
  },
  emergencyDecision: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#BFDBFE",
  },
  emergencyExpiryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#DBEAFE",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  emergencyExpiryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  emergencyDecisionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginTop: 7,
  },
  emergencyDecisionValue: {
    fontSize: 14,
    lineHeight: 20,
    color: "#1E293B",
    marginTop: 2,
  },
  emergencyDecisionLink: {
    marginTop: 12,
    alignSelf: "flex-start",
  },
  emergencyDecisionLinkText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1D4ED8",
    textDecorationLine: "underline",
  },
  usagesButton: {
    backgroundColor: "#2D9E6B",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  usagesButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
  },
  riskCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 16,
  },
  riskTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  riskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  riskCodeBadge: {
    backgroundColor: "#FEF2F2",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 60,
    alignItems: "center",
  },
  riskCode: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#EF4444",
  },
  riskDesc: {
    fontSize: 14,
    color: "#1A1A1A",
    flex: 1,
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: "#0a7ea5",
    borderRadius: 14,
    paddingVertical: 18,
    marginHorizontal: 20,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emergencyAddButton: {
    backgroundColor: "#1D4ED8",
    borderRadius: 14,
    paddingVertical: 18,
    marginHorizontal: 20,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  stockSection: {
    marginHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  inStockBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  inStockText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#22C55E",
  },
  emergencyInStockBadge: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  emergencyInStockText: {
    color: "#1D4ED8",
  },
  stockEditNotice: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
