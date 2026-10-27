import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import {
  countActiveStockFilters,
  EMPTY_STOCK_FILTERS,
  STOCK_FUNCTION_OPTIONS,
  STOCK_STATUS_OPTIONS,
  type StockFilters,
  type StockFunctionFilter,
  type StockStatusFilter,
} from "@/lib/stock-filters";

interface StockFilterPanelProps {
  filters: StockFilters;
  farmCultures: string[];
  onChange: (filters: StockFilters) => void;
  onReset: () => void;
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
      ]}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function StockFilterPanel({
  filters,
  farmCultures,
  onChange,
  onReset,
}: StockFilterPanelProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [draftFilters, setDraftFilters] = useState<StockFilters>(filters);
  const activeCount = countActiveStockFilters(filters);
  const selectedCultures = farmCultures.filter((culture) =>
    draftFilters.cultures.includes(culture),
  );

  const pressFeedback = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // Le retour visuel reste disponible si les vibrations sont désactivées.
    });
  };

  const openPanel = () => {
    // Les choix sont locaux à la fenêtre. Aucun recalcul de la liste Stock ne
    // s’exécute pendant que l’utilisateur coche les critères.
    setDraftFilters({
      ...filters,
      functions: [...filters.functions],
      statuses: [...filters.statuses],
      cultures: [...filters.cultures],
    });
    setVisible(true);
  };

  const toggleFunction = (value: StockFunctionFilter) => {
    setDraftFilters((current) => {
      const functions = current.functions.includes(value)
        ? current.functions.filter((item) => item !== value)
        : [...current.functions, value];
      return { ...current, functions };
    });
  };

  const toggleStatus = (value: StockStatusFilter) => {
    setDraftFilters((current) => {
      const statuses = current.statuses.includes(value)
        ? current.statuses.filter((item) => item !== value)
        : [...current.statuses, value];
      return { ...current, statuses };
    });
  };

  const toggleCulture = (value: string) => {
    setDraftFilters((current) => {
      const selected = current.cultures.includes(value);
      return {
        ...current,
        cultures: selected
          ? current.cultures.filter((culture) => culture !== value)
          : [...current.cultures, value],
      };
    });
  };

  const selectAllCultures = () =>
    setDraftFilters((current) => ({ ...current, cultures: [...farmCultures] }));
  const clearCultures = () =>
    setDraftFilters((current) => ({ ...current, cultures: [] }));

  const reset = () => {
    pressFeedback();
    setDraftFilters(EMPTY_STOCK_FILTERS);
    onReset();
  };

  const apply = () => {
    pressFeedback();
    onChange(draftFilters);
    setVisible(false);
  };

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.trigger,
          pressed && styles.buttonPressed,
        ]}
        onPress={openPanel}
        accessibilityRole="button"
        accessibilityLabel="Filtrer le stock"
      >
        <MaterialIcons name="tune" size={20} color="#0A7EA4" />
        <Text style={styles.triggerText}>Filtrer</Text>
        {activeCount > 0 ? (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{activeCount}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.title}>Filtrer le stock</Text>
                <Text style={styles.subtitle}>
                  Dans chaque rubrique, plusieurs choix se cumulent.
                </Text>
              </View>
              <Pressable
                onPress={() => setVisible(false)}
                accessibilityLabel="Fermer les filtres"
                style={({ pressed }) => pressed && { opacity: 0.62 }}
              >
                <MaterialIcons name="close" size={26} color="#475569" />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.sectionTitle}>1. Fonction du produit</Text>
              <View style={styles.chips}>
                {STOCK_FUNCTION_OPTIONS.map((option) => (
                  <FilterChip
                    key={option}
                    label={option}
                    selected={draftFilters.functions.includes(option)}
                    onPress={() => toggleFunction(option)}
                  />
                ))}
              </View>

              <Text style={styles.sectionTitle}>2. Cultures</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.manageCulturesButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => {
                  setVisible(false);
                  router.push({ pathname: "/farm-cultures" });
                }}
                accessibilityRole="button"
                accessibilityLabel="Gérer les cultures de l’exploitation"
              >
                <MaterialIcons name="agriculture" size={21} color="#0A7EA4" />
                <View style={styles.manageCulturesTextWrap}>
                  <Text style={styles.manageCulturesTitle}>
                    Cultures de l’exploitation
                  </Text>
                  <Text style={styles.manageCulturesSubtitle}>
                    {farmCultures.length === 0
                      ? "Aucune culture saisie — aucun filtre culture"
                      : `${farmCultures.length} culture${farmCultures.length > 1 ? "s" : ""} enregistrée${farmCultures.length > 1 ? "s" : ""}`}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={23} color="#64748B" />
              </Pressable>

              {farmCultures.length > 0 ? (
                <>
                  <View style={styles.cultureHeader}>
                    <Text style={styles.resultsLabel}>
                      Cultures à inclure dans le filtre
                    </Text>
                    <View style={styles.cultureActions}>
                      <Pressable
                        onPress={selectAllCultures}
                        accessibilityRole="button"
                        style={({ pressed }) => pressed && { opacity: 0.62 }}
                      >
                        <Text style={styles.actionText}>Toutes</Text>
                      </Pressable>
                      <Pressable
                        onPress={clearCultures}
                        accessibilityRole="button"
                        style={({ pressed }) => pressed && { opacity: 0.62 }}
                      >
                        <Text style={styles.actionText}>Aucune</Text>
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.helperText}>
                    {selectedCultures.length === 0
                      ? "Aucune sélection : le filtre ne tient pas compte des cultures."
                      : `${selectedCultures.length} culture${selectedCultures.length > 1 ? "s" : ""} sélectionnée${selectedCultures.length > 1 ? "s" : ""}.`}
                  </Text>
                  <View style={styles.chips}>
                    {farmCultures.map((culture) => (
                      <FilterChip
                        key={culture}
                        label={culture}
                        selected={draftFilters.cultures.includes(culture)}
                        onPress={() => toggleCulture(culture)}
                      />
                    ))}
                  </View>
                </>
              ) : null}

              <Text style={styles.sectionTitle}>3. Statut et danger</Text>
              <Text style={styles.helperText}>
                Sélectionnez le ou les statuts à afficher.
              </Text>
              <View style={styles.chips}>
                {STOCK_STATUS_OPTIONS.map((status) => (
                  <FilterChip
                    key={status}
                    label={status}
                    selected={draftFilters.statuses.includes(status)}
                    onPress={() => toggleStatus(status)}
                  />
                ))}
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                style={({ pressed }) => [
                  styles.resetButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={reset}
                accessibilityRole="button"
              >
                <Text style={styles.resetText}>Réinitialiser</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.applyButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={apply}
                accessibilityRole="button"
              >
                <Text style={styles.applyText}>Afficher les résultats</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.42)",
  },
  sheet: {
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  title: { color: "#0F172A", fontSize: 21, fontWeight: "800" },
  subtitle: { color: "#64748B", fontSize: 12, marginTop: 4, maxWidth: 290 },
  content: { padding: 20, paddingBottom: 12 },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
    marginBottom: 10,
  },
  helperText: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  manageCulturesButton: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 14,
    backgroundColor: "#F0F9FF",
    marginBottom: 16,
  },
  manageCulturesTextWrap: { flex: 1 },
  manageCulturesTitle: { color: "#075985", fontSize: 14, fontWeight: "800" },
  manageCulturesSubtitle: { color: "#64748B", fontSize: 12, marginTop: 3 },
  cultureHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  resultsLabel: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  cultureActions: { flexDirection: "row", gap: 12 },
  actionText: { color: "#0A7EA4", fontSize: 12, fontWeight: "800" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  chip: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
  },
  chipSelected: { borderColor: "#0A7EA4", backgroundColor: "#E0F2FE" },
  chipPressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  chipText: { color: "#475569", fontSize: 13, fontWeight: "600" },
  chipTextSelected: { color: "#075985" },
  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  resetButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  resetText: { color: "#475569", fontSize: 14, fontWeight: "700" },
  applyButton: {
    flex: 1.5,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#0A7EA4",
  },
  applyText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  buttonPressed: { opacity: 0.78, transform: [{ scale: 0.97 }] },
  trigger: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 12,
    backgroundColor: "#F0F9FF",
  },
  triggerText: { color: "#0A7EA4", fontSize: 14, fontWeight: "800" },
  countBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A7EA4",
  },
  countBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
});
