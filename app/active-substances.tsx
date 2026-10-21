import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useApp } from "@/lib/app-context";
import {
  extractActiveSubstanceNames,
  getClassificationBgColor,
  getClassificationColor,
  getClassificationLabel,
  searchByExactSubstances,
  type ClassifiedProduct,
} from "@/lib/product-service";
import { useData } from "@/lib/data-context";
import { formatStockQuantity } from "@/lib/quantity";

function normalizeStockName(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[®™©℠]/g, "")
    .replace(/[’']/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function readSubstances(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      );
    }
  } catch {
    // Compatibilité avec un éventuel lien contenant une seule matière en clair.
  }

  return raw
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ActiveSubstancesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    substances?: string | string[];
    sourceName?: string | string[];
  }>();
  const {
    performSearch,
    isPremium,
    remainingSearches,
    stock,
  } = useApp();
  const { products, riskPhrases } = useData();
  const countedSearch = useRef(false);
  const substances = useMemo(
    () => readSubstances(params.substances),
    [params.substances],
  );
  const sourceName = Array.isArray(params.sourceName)
    ? params.sourceName[0]
    : params.sourceName;
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<ClassifiedProduct[]>([]);
  const activeNames = useMemo(
    () => extractActiveSubstanceNames(substances.join(" | ")),
    [substances],
  );

  useEffect(() => {
    if (countedSearch.current) return;
    countedSearch.current = true;

    void performSearch().then((allowed) => {
      setIsAllowed(allowed);
      if (!allowed) {
        setIsLoading(false);
        Alert.alert(
          "Limite atteinte",
          "Vous avez atteint la limite de 20 recherches gratuites. Passez à Premium pour des recherches illimitées.",
          [
            { text: "Fermer", style: "cancel" },
            { text: "Voir Premium", onPress: () => router.push("/premium") },
          ],
        );
      }
    });
  }, [performSearch, router]);

  useEffect(() => {
    if (isAllowed !== true || activeNames.length === 0) {
      if (isAllowed !== null) setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      setResults(
        searchByExactSubstances(activeNames, 10000, products, riskPhrases),
      );
      setIsLoading(false);
    }, 0);

    return () => clearTimeout(timer);
  }, [activeNames, isAllowed, products, riskPhrases]);

  const isActiveProductInStock = (product: ClassifiedProduct) =>
    stock.some((item) => {
      if (item.amm !== product.amm) return false;

      // Plusieurs noms commerciaux peuvent partager la même AMM. Le nom
      // enregistré doit donc également correspondre au résultat affiché.
      const stockDisplayName = normalizeStockName(item.secondaryName || item.nom);
      const resultDisplayName = normalizeStockName(product.matchedName || product.nom);
      return stockDisplayName === resultDisplayName;
    });

  const stockedResults = useMemo(
    () =>
      [...results].sort(
        (left, right) =>
          Number(isActiveProductInStock(right)) -
          Number(isActiveProductInStock(left)),
      ),
    [results, stock],
  );

  const openProduct = (product: ClassifiedProduct) => {
    router.push({
      pathname: "/product/[amm]",
      params: { amm: product.amm, name: product.matchedName || product.nom },
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <View style={styles.headerBar}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.6 },
            ]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Retour à la fiche produit"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <IconSymbol name="arrow.left" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Matières actives
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <IconSymbol name="leaf.fill" size={24} color="#0F766E" />
            </View>
            <View style={styles.introTextContainer}>
              <Text style={styles.title}>
                Produits avec exactement les mêmes matières actives
              </Text>
              {sourceName ? (
                <Text style={styles.subtitle}>
                  Sélection issues de la fiche « {sourceName} ».
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.substancesCard}>
            <Text style={styles.sectionLabel}>
              Matière{activeNames.length > 1 ? "s" : ""} sélectionnée
              {activeNames.length > 1 ? "s" : ""}
            </Text>
            <View style={styles.chipsContainer}>
              {activeNames.map((substance) => (
                <View key={substance} style={styles.substanceChip}>
                  <IconSymbol name="leaf.fill" size={15} color="#0F766E" />
                  <Text style={styles.substanceChipText}>{substance}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.exactMatchHint}>
              La composition doit contenir cet ensemble exact de matières
              actives, sans matière supplémentaire.
            </Text>
          </View>

          {isPremium ? null : (
            <Text style={styles.remainingText}>
              {remainingSearches} recherche{remainingSearches > 1 ? "s" : ""}{" "}
              restante{remainingSearches > 1 ? "s" : ""}
            </Text>
          )}

          {isLoading ? (
            <View
              style={styles.loadingCard}
              accessibilityRole="progressbar"
              accessibilityState={{ busy: true }}
            >
              <ActivityIndicator size="large" color="#0A7EA5" />
              <Text style={styles.loadingText}>
                Recherche des homologations en cours…
              </Text>
            </View>
          ) : isAllowed !== true ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Recherche non disponible</Text>
              <Text style={styles.emptyText}>
                Passez à Premium pour continuer vos recherches.
              </Text>
            </View>
          ) : stockedResults.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Aucun produit trouvé</Text>
              <Text style={styles.emptyText}>
                Aucun produit homologué ne possède exactement cet ensemble de
                matières actives.
              </Text>
            </View>
          ) : (
            <View style={styles.resultsSection}>
              <Text style={styles.resultsTitle}>
                {stockedResults.length} produit
                {stockedResults.length > 1 ? "s" : ""} homologué
                {stockedResults.length > 1 ? "s" : ""}
              </Text>
              {stockedResults.map((product) => {
                const inStock = isActiveProductInStock(product);
                const stockItem = stock.find(
                  (item) =>
                    item.amm === product.amm &&
                    normalizeStockName(item.secondaryName || item.nom) ===
                      normalizeStockName(product.matchedName || product.nom),
                );
                return (
                  <Pressable
                    // Plusieurs cartes peuvent partager la même AMM (nom
                    // principal et noms secondaires). L'AMM seule ne doit
                    // donc pas être utilisée comme clé React : sinon React
                    // peut réutiliser l'état visuel « En stock » d'une carte
                    // pour les autres noms commerciaux.
                    key={`${product.amm}:${normalizeStockName(product.matchedName || product.nom)}`}
                    style={({ pressed }) => [
                      styles.resultCard,
                      inStock && styles.inStockResultCard,
                      pressed && { opacity: 0.72 },
                    ]}
                    onPress={() => openProduct(product)}
                    accessibilityRole="button"
                    accessibilityLabel={`${product.nom}${inStock ? ", déjà présent dans le stock" : ""}`}
                  >
                    <View style={styles.resultHeader}>
                      <View style={styles.resultNameContainer}>
                        <Text
                          style={[
                            styles.resultName,
                            inStock && styles.inStockResultName,
                          ]}
                        >
                          {product.matchedName || product.nom}
                        </Text>
                        {product.matchedName ? (
                          <Text style={styles.resultSubName}>
                            (Nom principal : {product.nom})
                          </Text>
                        ) : null}
                        {inStock ? (
                          <View style={styles.inStockLabel}>
                            <IconSymbol
                              name="checkmark.circle.fill"
                              size={16}
                              color="#15803D"
                            />
                            <Text style={styles.inStockLabelText}>
                              En stock :{" "}
                              {formatStockQuantity(stockItem?.quantite ?? 0)}{" "}
                              {stockItem?.unite ?? "L"}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <IconSymbol
                        name="chevron.right"
                        size={22}
                        color={inStock ? "#15803D" : "#94A3B8"}
                      />
                    </View>
                    <Text style={styles.resultAMM}>AMM : {product.amm}</Text>
                    <Text style={styles.resultHolder} numberOfLines={1}>
                      {product.titulaire}
                    </Text>
                    <View style={styles.resultFooter}>
                      <Text style={styles.resultSubstances} numberOfLines={2}>
                        {product.substancesActives}
                      </Text>
                      <View
                        style={[
                          styles.classificationBadge,
                          {
                            backgroundColor: getClassificationBgColor(
                              product.classification,
                            ),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.classificationText,
                            {
                              color: getClassificationColor(
                                product.classification,
                              ),
                            },
                          ]}
                        >
                          {getClassificationLabel(
                            product.classification,
                            product.fonctions,
                          )}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A7EA5" },
  safeArea: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#0A7EA5",
  },
  backButton: { padding: 10, margin: -10 },
  headerTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginHorizontal: 12,
  },
  headerSpacer: { width: 24 },
  content: { flex: 1, backgroundColor: "#F5F5F5" },
  contentContainer: { padding: 20, paddingBottom: 40, gap: 14 },
  introCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  introIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#CCFBF1",
    alignItems: "center",
    justifyContent: "center",
  },
  introTextContainer: { flex: 1 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: "700", color: "#1A1A1A" },
  subtitle: { marginTop: 6, fontSize: 13, lineHeight: 19, color: "#64748B" },
  substancesCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#065F46",
    marginBottom: 10,
  },
  chipsContainer: { gap: 8 },
  substanceChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#99F6E4",
  },
  substanceChipText: {
    flexShrink: 1,
    color: "#134E4A",
    fontSize: 14,
    fontWeight: "600",
  },
  exactMatchHint: {
    marginTop: 11,
    color: "#166534",
    fontSize: 12,
    lineHeight: 18,
  },
  remainingText: {
    color: "#64748B",
    fontSize: 12,
    textAlign: "right",
    marginTop: -4,
  },
  loadingCard: {
    minHeight: 150,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  loadingText: { color: "#475569", fontSize: 14 },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#1E293B",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 7,
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  resultsSection: { gap: 12 },
  resultsTitle: { color: "#1E293B", fontSize: 17, fontWeight: "700" },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  inStockResultCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#22C55E",
    borderWidth: 2,
  },
  resultHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  resultNameContainer: { flex: 1, gap: 6 },
  resultName: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "700",
    flexShrink: 1,
  },
  resultSubName: {
    color: "#0F766E",
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 18,
  },
  inStockResultName: { color: "#166534" },
  inStockLabel: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  inStockLabelText: { color: "#166534", fontSize: 12, fontWeight: "700" },
  resultAMM: { marginTop: 9, color: "#64748B", fontSize: 13 },
  resultHolder: { marginTop: 4, color: "#475569", fontSize: 13 },
  resultFooter: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  resultSubstances: {
    flex: 1,
    minWidth: 0,
    color: "#334155",
    fontSize: 12,
    lineHeight: 17,
  },
  classificationBadge: {
    maxWidth: "48%",
    minWidth: 0,
    flexShrink: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  classificationText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "center",
  },
});
