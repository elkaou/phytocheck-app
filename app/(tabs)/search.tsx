import { useState, useEffect, useCallback, useRef } from "react";
import {
  ScrollView,
  Text,
  View,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  searchProducts,
  ClassifiedProduct,
  getClassificationLabel,
  getClassificationColor,
  getClassificationBgColor,
} from "@/lib/product-service";
import { useApp } from "@/lib/app-context";

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; q?: string }>();
  const { remainingSearches, isPremium, performSearch } = useApp();

  const [query, setQuery] = useState(params.q || "");
  const [autoSearchDone, setAutoSearchDone] = useState(false);
  const [results, setResults] = useState<ClassifiedProduct[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const resultsRef = useRef<View>(null);

  const doSearch = useCallback((searchQuery: string) => {
    setIsSearching(true);
    setTimeout(() => {
      const found = searchProducts(searchQuery);
      setResults(found);
      setHasSearched(true);
      setIsSearching(false);
      
      // Scroll to results after a short delay
      setTimeout(() => {
        resultsRef.current?.measureLayout(
          // @ts-ignore
          scrollViewRef.current?.getInnerViewNode?.(),
          (_x: number, y: number) => {
            scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
          },
          () => {}
        );
      }, 200);
    }, 100);
  }, []);

  // Auto-search when coming from scan with q parameter
  useEffect(() => {
    if (params.q && !autoSearchDone) {
      setAutoSearchDone(true);
      doSearch(params.q);
    }
  }, [params.q, autoSearchDone, doSearch]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    // Count 1 search action per manual search button press
    const canDo = await performSearch();
    if (!canDo) {
      Alert.alert(
        "Limite atteinte",
        "Vous avez atteint la limite de 15 recherches gratuites. Passez à Premium pour des recherches illimitées.",
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Voir Premium",
            onPress: () => router.push("/premium"),
          },
        ]
      );
      return;
    }

    doSearch(query.trim());
  }, [query, performSearch, router, doSearch]);

  const handleScan = useCallback(() => {
    router.push("/scan" as any);
  }, [router]);

  const renderProduct = useCallback(
    ({ item }: { item: ClassifiedProduct }) => (
      <Pressable
        style={({ pressed }) => [
          styles.resultCard,
          pressed && { opacity: 0.7 },
        ]}
        onPress={() =>
          router.push({
            pathname: "/product/[amm]" as any,
            params: { 
              amm: item.amm,
              name: item.matchedName || item.nom,
            },
          })
        }
      >
        <View style={styles.resultCardContent}>
          {item.matchedName ? (
            <>
              <Text style={styles.resultName} numberOfLines={1}>
                {item.matchedName}
              </Text>
              <Text style={styles.resultSecondary} numberOfLines={1}>
                (Nom principal : {item.nom})
              </Text>
            </>
          ) : (
            <Text style={styles.resultName} numberOfLines={1}>
              {item.nom}
            </Text>
          )}
          <Text style={styles.resultAMM}>AMM : {item.amm}</Text>
          <Text style={styles.resultInfo} numberOfLines={1}>
            {item.titulaire}
          </Text>
        </View>
        <View
          style={[
            styles.badge,
            { backgroundColor: getClassificationBgColor(item.classification) },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: getClassificationColor(item.classification) },
            ]}
          >
            {getClassificationLabel(item.classification)}
          </Text>
        </View>
      </Pressable>
    ),
    [router]
  );

  return (
    <ScreenContainer containerClassName="bg-primary">
      {/* Header with remaining searches */}
      <View style={styles.header}>
        {!isPremium && (
          <View style={styles.remainingBadge}>
            <Text style={styles.remainingText}>
              {remainingSearches === Infinity
                ? "Recherches illimitées"
                : `${remainingSearches} recherche${remainingSearches > 1 ? "s" : ""} restante${remainingSearches > 1 ? "s" : ""}`}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Search by name or AMM */}
          <Text style={styles.sectionTitle}>Recherche par nom ou AMM</Text>
          <TextInput
            style={styles.input}
            placeholder="Rechercher par nom ou AMM"
            placeholderTextColor="#9BA1A6"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            autoCorrect={false}
          />
          <Pressable
            style={({ pressed }) => [
              styles.searchButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleSearch}
          >
            <IconSymbol name="magnifyingglass" size={22} color="#FFFFFF" />
            <Text style={styles.searchButtonText}>Rechercher</Text>
          </Pressable>

          {/* Search by photo */}
          <Text style={[styles.sectionTitle, { marginTop: 28 }]}>
            Recherche par photo d'étiquette
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.scanButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleScan}
          >
            <IconSymbol name="camera.fill" size={22} color="#FFFFFF" />
            <Text style={styles.searchButtonText}>Scanner une étiquette</Text>
          </Pressable>
          <Text style={styles.scanHint}>
            Prenez une photo de l'étiquette pour identifier le produit
            automatiquement
          </Text>

          {/* Results */}
          {isSearching && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0a7ea5" />
              <Text style={styles.loadingText}>Recherche en cours...</Text>
            </View>
          )}

          {!isSearching && hasSearched && results.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Aucun produit trouvé pour "{query}"
              </Text>
            </View>
          )}

          {!isSearching && results.length > 0 && (
            <View ref={resultsRef} style={{ marginTop: 20 }}>
              <Text style={styles.resultsCount}>
                {results.length} résultat{results.length > 1 ? "s" : ""}
              </Text>
              {results.map((item) => (
                <View key={item.amm}>{renderProduct({ item })}</View>
              ))}
            </View>
          )}

          {!hasSearched && !isSearching && (
            <View style={styles.hintCard}>
              <Text style={styles.hintText}>
                Entrez un nom de produit ou un numéro AMM pour commencer
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#0a7ea5",
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: "flex-start",
  },
  remainingBadge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  remainingText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#EF4444",
  },
  content: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  searchButton: {
    backgroundColor: "#0a7ea5",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  scanButton: {
    backgroundColor: "#0a7ea5",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  searchButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  scanHint: {
    fontSize: 14,
    color: "#687076",
    marginTop: 8,
    textAlign: "center",
  },
  loadingContainer: {
    marginTop: 40,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: "#687076",
  },
  emptyContainer: {
    marginTop: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#687076",
    textAlign: "center",
  },
  resultsCount: {
    fontSize: 14,
    color: "#687076",
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultCardContent: {
    flex: 1,
    marginRight: 12,
    minWidth: 0, // Allow text truncation
  },
  resultName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    flexShrink: 1,
  },
  resultSecondary: {
    fontSize: 12,
    color: "#0a7ea5",
    fontStyle: "italic",
    marginTop: 1,
  },
  resultAMM: {
    fontSize: 13,
    color: "#687076",
    marginTop: 2,
    flexShrink: 1,
  },
  resultInfo: {
    fontSize: 12,
    color: "#9BA1A6",
    marginTop: 2,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  hintCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginTop: 32,
    alignItems: "center",
  },
  hintText: {
    fontSize: 16,
    color: "#687076",
    textAlign: "center",
    lineHeight: 24,
  },
});
