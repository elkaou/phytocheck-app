import { useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { useData } from "@/lib/data-context";
import { getAvailableStockCultures } from "@/lib/stock-filters";
import { loadFarmCultures, saveFarmCultures } from "@/lib/farm-cultures";
import { useEffect } from "react";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .trim();
}

export default function FarmCulturesScreen() {
  const router = useRouter();
  const { usages } = useData();
  const [selectedCultures, setSelectedCultures] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [isReady, setIsReady] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const availableCultures = useMemo(
    () => getAvailableStockCultures(usages),
    [usages],
  );
  const normalizedQuery = normalize(query);
  const matchingCultures = useMemo(() => {
    const cultures = normalizedQuery
      ? availableCultures.filter((culture) =>
          normalize(culture).includes(normalizedQuery),
        )
      : availableCultures;
    return cultures
      .filter((culture) => !selectedCultures.includes(culture))
      .slice(0, 30);
  }, [availableCultures, normalizedQuery, selectedCultures]);

  useEffect(() => {
    let active = true;
    void loadFarmCultures().then((cultures) => {
      if (active) {
        setSelectedCultures(cultures);
        setIsReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    void saveFarmCultures(selectedCultures);
  }, [isReady, selectedCultures]);

  const toggleCulture = (culture: string) => {
    setSelectedCultures((current) =>
      current.includes(culture)
        ? current.filter((item) => item !== culture)
        : [...current, culture].sort((a, b) =>
            a.localeCompare(b, "fr", { sensitivity: "base" }),
          ),
    );
  };

  const handleAddCulture = (culture: string) => {
    toggleCulture(culture);
    setQuery("");
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });
  };

  const handleSave = async () => {
    if (!isReady) return;
    await saveFarmCultures(selectedCultures);
    router.back();
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.65 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Retourner aux filtres du stock"
        >
          <MaterialIcons name="arrow-back" size={25} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Cultures de l’exploitation</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.introTitle}>
            Quelles cultures pratiquez-vous ?
          </Text>
          <Text style={styles.introText}>
            Ajoutez les cultures de votre exploitation. Elles seront ensuite
            proposées dans « Filtrer le stock ». Vous pourrez en sélectionner
            aucune, certaines ou toutes.
          </Text>

          {selectedCultures.length > 0 ? (
            <View style={styles.selectedCard}>
              <View style={styles.selectedHeader}>
                <Text style={styles.sectionTitle}>Cultures retenues</Text>
                <Text style={styles.selectedCount}>
                  {selectedCultures.length}
                </Text>
              </View>
              <View style={styles.chips}>
                {selectedCultures.map((culture) => (
                  <Pressable
                    key={`selected-${culture}`}
                    onPress={() => toggleCulture(culture)}
                    style={({ pressed }) => [
                      styles.selectedChip,
                      pressed && { opacity: 0.7 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Retirer ${culture}`}
                  >
                    <Text style={styles.selectedChipText}>{culture} ×</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <MaterialIcons name="info-outline" size={22} color="#0A7EA4" />
              <Text style={styles.emptyText}>
                Aucune culture enregistrée : aucun filtre de culture ne sera
                appliqué au stock.
              </Text>
            </View>
          )}

          <TextInput
            ref={searchInputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher une culture (ex. pommes de terre)"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
            accessibilityLabel="Rechercher une culture de l’exploitation"
          />

          <Text style={styles.resultsLabel}>
            {normalizedQuery
              ? `${matchingCultures.length} résultat${matchingCultures.length > 1 ? "s" : ""}`
              : "Toutes les cultures disponibles"}
          </Text>
          <View style={styles.availableList}>
            {matchingCultures.map((culture) => (
              <Pressable
                key={culture}
                onPress={() => handleAddCulture(culture)}
                style={({ pressed }) => [
                  styles.cultureRow,
                  pressed && { opacity: 0.65 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Ajouter ${culture}`}
              >
                <MaterialIcons
                  name="add-circle-outline"
                  size={22}
                  color="#0A7EA4"
                />
                <Text style={styles.cultureText}>{culture}</Text>
              </Pressable>
            ))}
          </View>
          {matchingCultures.length === 0 ? (
            <Text style={styles.noResultText}>
              Aucune culture trouvée. Essayez un autre terme.
            </Text>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.autoSaveText}>
            Enregistrement automatique activé
          </Text>
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && { opacity: 0.82 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Terminer la configuration des cultures"
          >
            <Text style={styles.saveText}>Terminer</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#0A7EA4",
  },
  backButton: { width: 42, alignItems: "flex-start", justifyContent: "center" },
  headerTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },
  headerSpacer: { width: 42 },
  keyboardAvoidingView: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  introTitle: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  introText: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  selectedCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  selectedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { color: "#166534", fontSize: 15, fontWeight: "800" },
  selectedCount: {
    color: "#FFFFFF",
    backgroundColor: "#16A34A",
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    textAlign: "center",
    paddingTop: 3,
    fontWeight: "800",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  selectedChip: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  selectedChipText: { color: "#166534", fontSize: 13, fontWeight: "700" },
  emptyCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    borderColor: "#BAE6FD",
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    marginBottom: 16,
  },
  emptyText: { flex: 1, color: "#075985", fontSize: 13, lineHeight: 18 },
  searchInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 12,
    paddingHorizontal: 14,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    fontSize: 14,
    marginBottom: 12,
  },
  resultsLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  availableList: { gap: 7 },
  cultureRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cultureText: { flex: 1, color: "#334155", fontSize: 14, fontWeight: "600" },
  noResultText: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  autoSaveText: {
    color: "#64748B",
    fontSize: 11,
    textAlign: "center",
    marginBottom: 7,
  },
  saveButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#0A7EA4",
  },
  saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
