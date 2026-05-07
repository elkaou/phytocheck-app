import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  ScrollView,
  Text,
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  searchProducts,
  searchBySubstance,
  classifyProduct,
  ClassifiedProduct,
  getClassificationLabel,
  getClassificationColor,
  getClassificationBgColor,
} from "@/lib/product-service";
import { useApp } from "@/lib/app-context";
import { useData } from "@/lib/data-context";
import { CULTURE_ALIASES, getCultureSuggestions, type CultureSuggestion } from "@/lib/culture-aliases";

// Filtres de type disponibles pour la recherche par culture
const TYPE_FILTERS = ["Tous", "Herbicide", "Fongicide", "Insecticide", "Acaricide"] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; q?: string }>();
  const { remainingSearches, isPremium, performSearch } = useApp();
  const { products: dynamicProducts, riskPhrases: dynamicRiskPhrases, usages } = useData();

  // --- États recherche par nom/AMM ---
  const [query, setQuery] = useState(params.q || "");
  const [substanceQuery, setSubstanceQuery] = useState("");
  const [autoSearchDone, setAutoSearchDone] = useState(false);
  const [results, setResults] = useState<ClassifiedProduct[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchType, setSearchType] = useState<"name" | "substance" | "culture">("name");
  const [filterHomologues, setFilterHomologues] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // --- États recherche par culture ---
  const [cultureQuery, setCultureQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<TypeFilter>("Tous");
  const [showCultureSuggestions, setShowCultureSuggestions] = useState(false);
  // Filtre par cible/maladie dans les résultats culture
  const [selectedCible, setSelectedCible] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const resultsRef = useRef<View>(null);
  const filtersRef = useRef<View>(null);
  const isNavigatingToProduct = useRef(false);
  const savedScrollY = useRef(0);

  // --- Cibles disponibles pour les résultats culture actuels ---
  const availableCibles = useMemo(() => {
    if (searchType !== "culture" || results.length === 0) return [];
    const cibles = new Set<string>();
    const culturesToSearch = new Set<string>([cultureQuery.trim()]);
    const aliases = CULTURE_ALIASES[cultureQuery.trim()] || [];
    aliases.forEach((alias) => culturesToSearch.add(alias));
    results.forEach((product) => {
      const productUsages = usages[product.amm] || [];
      productUsages.forEach((u) => {
        if (culturesToSearch.has(u.culture || "") && u.cible) {
          cibles.add(u.cible);
        }
      });
    });
    return Array.from(cibles).sort((a, b) => a.localeCompare(b, "fr"));
  }, [searchType, results, cultureQuery, usages]);

  // Produits filtrés par cible sélectionnée
  const cibleFilteredResults = useMemo(() => {
    if (!selectedCible || searchType !== "culture") return results;
    const culturesToSearch = new Set<string>([cultureQuery.trim()]);
    const aliases = CULTURE_ALIASES[cultureQuery.trim()] || [];
    aliases.forEach((alias) => culturesToSearch.add(alias));
    return results.filter((product) => {
      const productUsages = usages[product.amm] || [];
      return productUsages.some(
        (u) => culturesToSearch.has(u.culture || "") && u.cible === selectedCible
      );
    });
  }, [selectedCible, results, searchType, cultureQuery, usages]);

  // --- Liste des cultures disponibles (triées alphabétiquement) ---
  const allCultures = useMemo(() => {
    const cultures = new Set<string>();
    Object.values(usages).forEach((ammUsages) => {
      ammUsages.forEach((u) => {
        if (u.culture) cultures.add(u.culture);
      });
    });
    return Array.from(cultures).sort((a, b) => a.localeCompare(b, "fr"));
  }, [usages]);

  // --- Suggestions de cultures filtrées par la saisie ---
  const cultureSuggestions = useMemo<CultureSuggestion[]>(() => {
    return getCultureSuggestions(cultureQuery, allCultures, 10);
  }, [cultureQuery, allCultures]);

  // --- Recherche par culture ---
  const searchByCulture = useCallback(
    (cultureName: string, typeFilter: TypeFilter) => {
      setIsSearching(true);
      setSearchType("culture");
      setSelectedCible(null); // Réinitialiser le filtre cible à chaque nouvelle recherche
      setTimeout(() => {
        // Construire la liste des cultures à chercher : la culture elle-même + ses alias génériques
        const culturesToSearch = new Set<string>([cultureName]);
        const aliases = CULTURE_ALIASES[cultureName] || [];
        aliases.forEach((alias) => culturesToSearch.add(alias));

        // Trouver tous les AMM qui ont un usage sur l'une de ces cultures
        const ammList: string[] = [];
        Object.entries(usages).forEach(([amm, ammUsages]) => {
          const hasMatch = ammUsages.some((u) =>
            culturesToSearch.has(u.culture || "")
          );
          if (hasMatch) ammList.push(amm);
        });

        // Récupérer les produits correspondants
        const found: ClassifiedProduct[] = [];
        dynamicProducts.forEach((p) => {
          if (!ammList.includes(p.amm)) return;
          if (p.etat !== "AUTORISE") return; // Uniquement les produits autorisés

          // Filtrer par type si nécessaire
          if (typeFilter !== "Tous") {
            const fonctions = p.fonctions || "";
            const matchesType = fonctions
              .split("|")
              .map((f: string) => f.trim().toLowerCase())
              .some((f: string) => f.includes(typeFilter.toLowerCase()));
            if (!matchesType) return;
          }

          const classified = classifyProduct(p);
          found.push(classified);
        });

        // Trier alphabétiquement
        found.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

        setResults(found);
        setHasSearched(true);
        setIsSearching(false);

        // Remonter en haut pour voir les filtres (type + cible) dès l'affichage des résultats
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }, 150);
      }, 100);
    },
    [usages, dynamicProducts]
  );

  const handleCultureSearch = useCallback(
    async (cultureName?: string) => {
      const name = cultureName || cultureQuery.trim();
      if (!name) return;

      const canDo = await performSearch();
      if (!canDo) {
        Alert.alert(
          "Limite atteinte",
          "Vous avez atteint la limite de 20 recherches gratuites. Passez à Premium pour des recherches illimitées.",
          [
            { text: "Annuler", style: "cancel" },
            { text: "Voir Premium", onPress: () => router.push("/premium") },
          ]
        );
        return;
      }

      setCultureQuery(name);
      setShowCultureSuggestions(false);
      searchByCulture(name, selectedTypeFilter);
    },
    [cultureQuery, selectedTypeFilter, performSearch, router, searchByCulture]
  );

  // Relancer la recherche par culture quand le filtre de type change
  const handleTypeFilterChange = useCallback(
    (filter: TypeFilter) => {
      setSelectedTypeFilter(filter);
      if (searchType === "culture" && hasSearched && cultureQuery.trim()) {
        setIsSearching(true);
        setTimeout(() => {
          searchByCulture(cultureQuery.trim(), filter);
        }, 50);
      }
    },
    [searchType, hasSearched, cultureQuery, searchByCulture]
  );

  // --- Recherche par nom/AMM ---
  const doSearch = useCallback(
    (searchQuery: string, type: "name" | "substance" = "name") => {
      setIsSearching(true);
      setSearchType(type);
      setTimeout(() => {
        const found =
          type === "substance"
            ? searchBySubstance(searchQuery, 10000, dynamicProducts, dynamicRiskPhrases)
            : searchProducts(searchQuery, 50, dynamicProducts, dynamicRiskPhrases);
        setResults(found);
        setHasSearched(true);
        setIsSearching(false);

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
    },
    [dynamicProducts, dynamicRiskPhrases]
  );

  useEffect(() => {
    if (params.q && !autoSearchDone) {
      setAutoSearchDone(true);
      doSearch(params.q);
    }
  }, [params.q, autoSearchDone, doSearch]);

  useFocusEffect(
    useCallback(() => {
      if (isNavigatingToProduct.current) {
        isNavigatingToProduct.current = false;
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: savedScrollY.current, animated: false });
        }, 50);
        return;
      }
      if (!params.q) {
        setQuery("");
        setSubstanceQuery("");
        setCultureQuery("");
        setResults([]);
        setHasSearched(false);
        setFilterHomologues(false);
        setSelectedTypeFilter("Tous");
        setShowCultureSuggestions(false);
        savedScrollY.current = 0;
      }
    }, [params.q])
  );

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    const canDo = await performSearch();
    if (!canDo) {
      Alert.alert(
        "Limite atteinte",
        "Vous avez atteint la limite de 20 recherches gratuites. Passez à Premium pour des recherches illimitées.",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Voir Premium", onPress: () => router.push("/premium") },
        ]
      );
      return;
    }
    doSearch(query.trim(), "name");
  }, [query, performSearch, router, doSearch]);

  const handleSubstanceSearch = useCallback(async () => {
    if (!substanceQuery.trim()) return;
    const canDo = await performSearch();
    if (!canDo) {
      Alert.alert(
        "Limite atteinte",
        "Vous avez atteint la limite de 20 recherches gratuites. Passez à Premium pour des recherches illimitées.",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Voir Premium", onPress: () => router.push("/premium") },
        ]
      );
      return;
    }
    doSearch(substanceQuery.trim(), "substance");
  }, [substanceQuery, performSearch, router, doSearch]);

  const handleScan = useCallback(() => {
    router.push("/scan" as any);
  }, [router]);

  const renderProduct = useCallback(
    ({ item }: { item: ClassifiedProduct }) => (
      <Pressable
        style={({ pressed }) => [styles.resultCard, pressed && { opacity: 0.7 }]}
        onPress={() => {
          isNavigatingToProduct.current = true;
          router.push({
            pathname: "/product/[amm]" as any,
            params: {
              amm: item.amm,
              name: item.matchedName || item.nom,
              // Passer la culture sélectionnée pour pré-filtrer les usages autorisés
              ...(searchType === "culture" && cultureQuery.trim()
                ? { culture: cultureQuery.trim() }
                : {}),
            },
          });
        }}
      >
        <Text style={styles.resultName}>{item.matchedName || item.nom}</Text>
        {item.matchedName && (
          <Text style={styles.resultSecondary}>(Nom principal : {item.nom})</Text>
        )}
        <View style={styles.resultBottomRow}>
          <View style={styles.resultCardContent}>
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
              style={[styles.badgeText, { color: getClassificationColor(item.classification) }]}
              numberOfLines={2}
            >
              {getClassificationLabel(item.classification)}
            </Text>
          </View>
        </View>
      </Pressable>
    ),
    [router, searchType, cultureQuery]
  );

  // Titre du résultat selon le type de recherche
  const resultsTitle = useMemo(() => {
    if (searchType === "culture") {
      const count = cibleFilteredResults.length;
      const filterLabel = selectedTypeFilter !== "Tous" ? ` — ${selectedTypeFilter}` : "";
      const cibleLabel = selectedCible ? ` · ${selectedCible}` : "";
      return `${count} produit${count > 1 ? "s" : ""} autorisé${count > 1 ? "s" : ""} sur ${cultureQuery}${filterLabel}${cibleLabel}`;
    }
    const count = filterHomologues
      ? results.filter((r) => r.classification !== "retire").length
      : results.length;
    return `${count} résultat${count > 1 ? "s" : ""}${filterHomologues ? " (homologués)" : ""}`;
  }, [searchType, results, cultureQuery, selectedTypeFilter, filterHomologues]);

  return (
    <ScreenContainer containerClassName="bg-primary">
      {/* Header */}
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
        {/* Bouton Nouvelle recherche */}
        {hasSearched && (
          <Pressable
            style={({ pressed }) => [
              styles.newSearchButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={() => {
              setQuery("");
              setSubstanceQuery("");
              setCultureQuery("");
              setResults([]);
              setHasSearched(false);
              setFilterHomologues(false);
              setSelectedTypeFilter("Tous");
              setShowCultureSuggestions(false);
            }}
          >
            <IconSymbol name="plus.circle.fill" size={20} color="#FFFFFF" />
            <Text style={styles.newSearchButtonText}>Nouvelle recherche</Text>
          </Pressable>
        )}

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={(e) => {
            savedScrollY.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
          {/* Formulaires de recherche — masqués quand résultats affichés */}
          {!hasSearched && (
            <>
              {/* Recherche par nom ou AMM */}
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

              {/* Recherche par matière active */}
              <Text style={[styles.sectionTitle, { marginTop: 28 }]}>
                Recherche par matière active
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: glyphosate, fluroxypyr..."
                placeholderTextColor="#9BA1A6"
                value={substanceQuery}
                onChangeText={setSubstanceQuery}
                returnKeyType="search"
                onSubmitEditing={handleSubstanceSearch}
                autoCorrect={false}
                autoCapitalize="none"
              />
              <Pressable
                style={({ pressed }) => [
                  styles.searchButton,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
                onPress={handleSubstanceSearch}
              >
                <IconSymbol name="leaf.fill" size={22} color="#FFFFFF" />
                <Text style={styles.searchButtonText}>Rechercher</Text>
              </Pressable>

              {/* Recherche par culture */}
              <Text style={[styles.sectionTitle, { marginTop: 28 }]}>
                Recherche par culture
              </Text>
              <View style={{ position: "relative" }}>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: blé, vigne, maïs, tomate..."
                  placeholderTextColor="#9BA1A6"
                  value={cultureQuery}
                  onChangeText={(text) => {
                    setCultureQuery(text);
                    setShowCultureSuggestions(true);
                  }}
                  returnKeyType="search"
                  onSubmitEditing={() => handleCultureSearch()}
                  autoCorrect={false}
                  autoCapitalize="words"
                />
                {/* Suggestions d'autocomplétion */}
                {showCultureSuggestions && cultureSuggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    {cultureSuggestions.map((suggestion) => (
                      <Pressable
                        key={suggestion.value}
                        style={({ pressed }) => [
                          styles.suggestionItem,
                          pressed && { backgroundColor: "#F0F9FF" },
                        ]}
                        onPress={() => {
                          setCultureQuery(suggestion.value);
                          setShowCultureSuggestions(false);
                        }}
                      >
                        <Text style={styles.suggestionText}>{suggestion.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Boutons filtres par type */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
                contentContainerStyle={{ gap: 8, paddingRight: 4 }}
              >
                {TYPE_FILTERS.map((filter) => (
                  <Pressable
                    key={filter}
                    style={({ pressed }) => [
                      styles.typeFilterButton,
                      selectedTypeFilter === filter && styles.typeFilterButtonActive,
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => setSelectedTypeFilter(filter)}
                  >
                    <Text
                      style={[
                        styles.typeFilterText,
                        selectedTypeFilter === filter && styles.typeFilterTextActive,
                      ]}
                    >
                      {filter}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Pressable
                style={({ pressed }) => [
                  styles.cultureSearchButton,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
                onPress={() => handleCultureSearch()}
              >
                <IconSymbol name="leaf.fill" size={22} color="#FFFFFF" />
                <Text style={styles.searchButtonText}>Rechercher par culture</Text>
              </Pressable>

              {/* Recherche par photo */}
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
                Prenez une photo de l'étiquette pour identifier le produit automatiquement
              </Text>
            </>
          )}

          {/* Filtres de type affichés dans les résultats culture */}
          {!isSearching && hasSearched && searchType === "culture" && (
            <View ref={filtersRef} style={{ marginBottom: 12 }}>
              <Text style={styles.cultureResultTitle}>
                Produits autorisés sur : <Text style={{ color: "#0a7ea5" }}>{cultureQuery}</Text>
              </Text>
              {/* Filtre par type (Herbicide, Fongicide...) */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 8 }}
                contentContainerStyle={{ gap: 8, paddingRight: 4 }}
              >
                {TYPE_FILTERS.map((filter) => (
                  <Pressable
                    key={filter}
                    style={({ pressed }) => [
                      styles.typeFilterButton,
                      selectedTypeFilter === filter && styles.typeFilterButtonActive,
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => handleTypeFilterChange(filter)}
                  >
                    <Text
                      style={[
                        styles.typeFilterText,
                        selectedTypeFilter === filter && styles.typeFilterTextActive,
                      ]}
                    >
                      {filter}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              {/* Filtre par cible/maladie (si des cibles sont disponibles) */}
              {availableCibles.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginTop: 8 }}
                  contentContainerStyle={{ gap: 8, paddingRight: 4 }}
                >
                  <Pressable
                    style={[
                      styles.cibleFilterButton,
                      selectedCible === null && styles.cibleFilterButtonActive,
                    ]}
                    onPress={() => setSelectedCible(null)}
                  >
                    <Text style={[styles.cibleFilterText, selectedCible === null && styles.cibleFilterTextActive]}>
                      Toutes cibles
                    </Text>
                  </Pressable>
                  {availableCibles.map((cible) => (
                    <Pressable
                      key={cible}
                      style={[
                        styles.cibleFilterButton,
                        selectedCible === cible && styles.cibleFilterButtonActive,
                      ]}
                      onPress={() => setSelectedCible(selectedCible === cible ? null : cible)}
                    >
                      <Text style={[styles.cibleFilterText, selectedCible === cible && styles.cibleFilterTextActive]}>
                        {cible}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* Chargement */}
          {isSearching && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0a7ea5" />
              <Text style={styles.loadingText}>Recherche en cours...</Text>
            </View>
          )}

          {/* Aucun résultat */}
          {!isSearching && hasSearched && results.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchType === "culture"
                  ? `Aucun produit autorisé trouvé sur "${cultureQuery}"${selectedTypeFilter !== "Tous" ? ` pour le type "${selectedTypeFilter}"` : ""}`
                  : `Aucun produit trouvé pour "${searchType === "substance" ? substanceQuery : query}"`}
              </Text>
            </View>
          )}

          {/* Résultats */}
          {!isSearching && results.length > 0 && (
            <View ref={resultsRef} style={{ marginTop: 16 }}>
              <Text style={styles.helpHint}>
                ℹ️ Cliquez sur un produit pour plus de détails (Usages, matière active…)
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <Text style={styles.resultsCount}>{resultsTitle}</Text>
                {/* Bouton filtre Homologués — uniquement pour recherche nom/substance */}
                {searchType !== "culture" && (
                  <Pressable
                    style={({ pressed }) => ({
                      backgroundColor: filterHomologues ? "#2E7D32" : "#FFFFFF",
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      flexDirection: "row" as const,
                      alignItems: "center" as const,
                      gap: 5,
                      opacity: pressed ? 0.8 : 1,
                      borderWidth: 1.5,
                      borderColor: "#2E7D32",
                    })}
                    onPress={() => setFilterHomologues((f) => !f)}
                  >
                    <IconSymbol
                      name={filterHomologues ? "checkmark.circle.fill" : "circle"}
                      size={16}
                      color={filterHomologues ? "#FFFFFF" : "#2E7D32"}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: filterHomologues ? "#FFFFFF" : "#2E7D32",
                      }}
                    >
                      {filterHomologues ? "Homologués ✓" : "Homologués"}
                    </Text>
                  </Pressable>
                )}
              </View>
              {(searchType !== "culture" && filterHomologues
                ? results.filter((r) => r.classification !== "retire")
                : searchType === "culture"
                ? cibleFilteredResults
                : results
              ).map((item, index) => (
                <View key={`${item.amm}-${item.nom}-${index}`}>
                  {renderProduct({ item })}
                </View>
              ))}
            </View>
          )}

          {!hasSearched && !isSearching && (
            <View style={styles.hintCard}>
              <Text style={styles.hintText}>
                Recherchez par nom, AMM, matière active ou culture pour trouver les produits autorisés
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
  cultureSearchButton: {
    backgroundColor: "#2E7D32",
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
  newSearchButton: {
    backgroundColor: "#0a7ea5",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  newSearchButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  scanHint: {
    fontSize: 14,
    color: "#687076",
    marginTop: 8,
    textAlign: "center",
  },
  // Autocomplétion cultures
  suggestionsContainer: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  suggestionText: {
    fontSize: 15,
    color: "#1A1A1A",
  },
  // Filtres de type
  typeFilterButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: "#2E7D32",
  },
  typeFilterButtonActive: {
    backgroundColor: "#2E7D32",
  },
  typeFilterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2E7D32",
  },
  typeFilterTextActive: {
    color: "#FFFFFF",
  },
  // Filtre par cible/maladie
  cibleFilterButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: "#0a7ea5",
  },
  cibleFilterButtonActive: {
    backgroundColor: "#0a7ea5",
  },
  cibleFilterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0a7ea5",
  },
  cibleFilterTextActive: {
    color: "#FFFFFF",
  },
  // Résultats culture
  cultureResultTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  // Résultats communs
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
  helpHint: {
    fontSize: 12,
    color: "#687076",
    fontStyle: "italic",
    marginBottom: 10,
    textAlign: "center",
  },
  resultsCount: {
    fontSize: 14,
    color: "#687076",
    marginBottom: 12,
    flex: 1,
    flexWrap: "wrap",
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: "column",
  },
  resultBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  resultCardContent: {
    flex: 1,
    marginRight: 12,
    flexDirection: "column",
  },
  resultName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  resultSecondary: {
    fontSize: 12,
    color: "#0a7ea5",
    fontStyle: "italic",
    marginTop: 2,
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
    flexShrink: 0,
    maxWidth: 140,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
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
