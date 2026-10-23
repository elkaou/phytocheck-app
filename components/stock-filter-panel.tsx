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
import { useRouter } from "expo-router";

import {
  countActiveStockFilters,
  STOCK_FUNCTION_OPTIONS,
  type StockFilters,
} from "@/lib/stock-filters";

type StockFilterFunction = (typeof STOCK_FUNCTION_OPTIONS)[number];

interface StockFilterPanelProps {
  filters: StockFilters;
  farmCultures: string[];
  onChange: (filters: StockFilters) => void;
  onReset: () => void;
}

function ToggleRow({
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
      style={({ pressed }) => [styles.optionRow, pressed && { opacity: 0.65 }]}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
    >
      <MaterialIcons
        name={selected ? "check-box" : "check-box-outline-blank"}
        size={22}
        color={selected ? "#0A7EA4" : "#64748B"}
      />
      <Text style={styles.optionLabel}>{label}</Text>
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
  const activeCount = countActiveStockFilters(filters);
  const selectedCultures = farmCultures.filter((culture) =>
    filters.cultures.includes(culture),
  );

  const toggleFunction = (value: StockFilterFunction) => {
    const functions = filters.functions.includes(value)
      ? filters.functions.filter((item) => item !== value)
      : [...filters.functions, value];
    onChange({ ...filters, functions });
  };

  const toggleCulture = (value: string) => {
    const selected = filters.cultures.includes(value);
    onChange({
      ...filters,
      cultures: selected
        ? filters.cultures.filter((culture) => culture !== value)
        : [...filters.cultures, value],
    });
  };

  const selectAllCultures = () =>
    onChange({ ...filters, cultures: [...farmCultures] });
  const clearCultures = () => onChange({ ...filters, cultures: [] });

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.trigger, pressed && { opacity: 0.72 }]}
        onPress={() => setVisible(true)}
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
                  Les critères d’un même groupe se cumulent en OU.
                </Text>
              </View>
              <Pressable
                onPress={() => setVisible(false)}
                accessibilityLabel="Fermer les filtres"
              >
                <MaterialIcons name="close" size={26} color="#475569" />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.sectionTitle}>Fonction du produit</Text>
              <View style={styles.chips}>
                {STOCK_FUNCTION_OPTIONS.map((option) => {
                  const selected = filters.functions.includes(option);
                  return (
                    <Pressable
                      key={option}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => toggleFunction(option)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selected && styles.chipTextSelected,
                        ]}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.sectionTitle}>Statut et danger</Text>
              <ToggleRow
                label="Inclure les produits retirés / PPNU"
                selected={filters.includeRetired}
                onPress={() =>
                  onChange({
                    ...filters,
                    includeRetired: !filters.includeRetired,
                  })
                }
              />
              <ToggleRow
                label="Uniquement non CMR"
                selected={filters.nonCmr}
                onPress={() =>
                  onChange({ ...filters, nonCmr: !filters.nonCmr })
                }
              />
              <ToggleRow
                label="Uniquement non toxiques"
                selected={filters.nonToxique}
                onPress={() =>
                  onChange({ ...filters, nonToxique: !filters.nonToxique })
                }
              />
              <ToggleRow
                label="Retrait prévu sous 3 mois"
                selected={filters.withdrawalWithinThreeMonths}
                onPress={() =>
                  onChange({
                    ...filters,
                    withdrawalWithinThreeMonths:
                      !filters.withdrawalWithinThreeMonths,
                  })
                }
              />

              <Text style={styles.sectionTitle}>
                Cultures de l’exploitation
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.manageCulturesButton,
                  pressed && { opacity: 0.72 },
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
                      >
                        <Text style={styles.actionText}>Toutes</Text>
                      </Pressable>
                      <Pressable
                        onPress={clearCultures}
                        accessibilityRole="button"
                      >
                        <Text style={styles.actionText}>Aucune</Text>
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.helperText}>
                    {selectedCultures.length === 0
                      ? "Aucune sélection : toutes les cultures de l’exploitation sont ignorées pour ce filtre."
                      : `${selectedCultures.length} culture${selectedCultures.length > 1 ? "s" : ""} sélectionnée${selectedCultures.length > 1 ? "s" : ""}.`}
                  </Text>
                  <View style={styles.chips}>
                    {farmCultures.map((culture) => {
                      const selected = filters.cultures.includes(culture);
                      return (
                        <Pressable
                          key={culture}
                          style={[styles.chip, selected && styles.chipSelected]}
                          onPress={() => toggleCulture(culture)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: selected }}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              selected && styles.chipTextSelected,
                            ]}
                          >
                            {culture}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}
            </ScrollView>

            <View style={styles.footer}>
              <Pressable style={styles.resetButton} onPress={onReset}>
                <Text style={styles.resetText}>Réinitialiser</Text>
              </Pressable>
              <Pressable
                style={styles.applyButton}
                onPress={() => setVisible(false)}
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
  subtitle: { color: "#64748B", fontSize: 12, marginTop: 4, maxWidth: 280 },
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
  chipText: { color: "#475569", fontSize: 13, fontWeight: "600" },
  chipTextSelected: { color: "#075985" },
  optionRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  optionLabel: { flex: 1, color: "#334155", fontSize: 14 },
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
