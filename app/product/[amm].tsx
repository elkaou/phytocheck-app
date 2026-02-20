import { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  getProductByAMM,
  ClassifiedProduct,
  getClassificationLabel,
  getClassificationColor,
  getClassificationBgColor,
} from "@/lib/product-service";
import { useApp } from "@/lib/app-context";

export default function ProductDetailScreen() {
  const { amm } = useLocalSearchParams<{ amm: string }>();
  const router = useRouter();
  const { addProductToStock, isProductInStock, getProductQuantity, updateProductQuantity, isPremium, stock } = useApp();

  const [product, setProduct] = useState<ClassifiedProduct | null>(null);
  const inStock = amm ? isProductInStock(amm) : false;

  useEffect(() => {
    if (amm) {
      const p = getProductByAMM(amm);
      setProduct(p);
    }
  }, [amm]);

  const currentQuantity = amm ? getProductQuantity(amm) : 0;

  const handleAddToStock = useCallback(async () => {
    if (!product) return;

    // Show dialog to enter quantity and unit
    Alert.prompt(
      "Ajouter au stock",
      "Entrez la quantité :",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Ajouter (L)",
          onPress: async (quantityStr?: string) => {
            const quantity = parseFloat(quantityStr || "1") || 1;
            const result = await addProductToStock(product, quantity, "L");
            if (result === "added") {
              Alert.alert("Ajouté", `"${product.nom}" a été ajouté à votre stock (${quantity} L).`);
            } else if (result === "incremented") {
              Alert.alert("Quantité mise à jour", `Quantité de "${product.nom}" augmentée (+${quantity} L).`);
            } else if (result === "limit") {
              Alert.alert(
                "Limite atteinte",
                "Vous avez atteint la limite de 20 produits en stock. Passez à Premium pour un stock illimité."
              );
            }
          },
        },
        {
          text: "Ajouter (Kg)",
          onPress: async (quantityStr?: string) => {
            const quantity = parseFloat(quantityStr || "1") || 1;
            const result = await addProductToStock(product, quantity, "Kg");
            if (result === "added") {
              Alert.alert("Ajouté", `"${product.nom}" a été ajouté à votre stock (${quantity} Kg).`);
            } else if (result === "incremented") {
              Alert.alert("Quantité mise à jour", `Quantité de "${product.nom}" augmentée (+${quantity} Kg).`);
            } else if (result === "limit") {
              Alert.alert(
                "Limite atteinte",
                "Vous avez atteint la limite de 20 produits en stock. Passez à Premium pour un stock illimité."
              );
            }
          },
        },
      ],
      "plain-text",
      "1",
      "numeric"
    );
  }, [product, addProductToStock]);

  if (!product) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
          <View style={styles.headerBar}>
            <Pressable
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              onPress={() => router.back()}
            >
              <IconSymbol name="arrow.left" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.headerBarTitle}>Produit</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Produit non trouvé</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const classColor = getClassificationColor(product.classification);
  const classBgColor = getClassificationBgColor(product.classification);
  const classLabel = getClassificationLabel(product.classification);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
        {/* Header bar */}
        <View style={styles.headerBar}>
          <Pressable
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            onPress={() => router.back()}
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
              <View style={styles.quantityRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.quantityButton,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={async () => {
                    if (amm && currentQuantity > 1) {
                      await updateProductQuantity(amm, currentQuantity - 1);
                    } else if (amm && currentQuantity === 1) {
                      Alert.alert(
                        "Retirer du stock",
                        "La quantité sera 0 et le produit sera retiré du stock.",
                        [
                          { text: "Annuler", style: "cancel" },
                          {
                            text: "Retirer",
                            style: "destructive",
                            onPress: () => updateProductQuantity(amm, 0),
                          },
                        ]
                      );
                    }
                  }}
                >
                  <Text style={styles.quantityButtonText}>−</Text>
                </Pressable>
                <Text style={styles.quantityValue}>{currentQuantity}</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.quantityButton,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={handleAddToStock}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </Pressable>
              </View>
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
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 12,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0a7ea5",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButtonText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  quantityValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1A1A1A",
    minWidth: 40,
    textAlign: "center",
  },
});
