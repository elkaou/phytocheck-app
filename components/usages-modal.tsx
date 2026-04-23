import React, { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ProductUsage } from "@/lib/data-context";

interface UsagesModalProps {
  visible: boolean;
  productName: string;
  usages: ProductUsage[];
  onClose: () => void;
}

export function UsagesModal({ visible, productName, usages, onClose }: UsagesModalProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return usages;
    const q = search.toLowerCase().trim();
    return usages.filter(
      (u) =>
        u.culture.toLowerCase().includes(q) ||
        (u.cible ?? "").toLowerCase().includes(q) ||
        (u.application ?? "").toLowerCase().includes(q)
    );
  }, [usages, search]);

  const renderItem = ({ item }: { item: ProductUsage }) => (
    <View style={styles.usageCard}>
      {/* Culture + cible */}
      <View style={styles.usageHeader}>
        <Text style={styles.cultureName}>{item.culture}</Text>
        {item.cible ? (
          <View style={styles.cibleBadge}>
            <Text style={styles.cibleText}>{item.cible}</Text>
          </View>
        ) : null}
      </View>

      {/* Mode d'application */}
      {item.application ? (
        <Text style={styles.applicationText}>{item.application}</Text>
      ) : null}

      {/* Détails : dose, DAR, nb applications, ZNT */}
      <View style={styles.detailsRow}>
        {item.dose && item.unite ? (
          <View style={styles.detailChip}>
            <Text style={styles.detailLabel}>Dose</Text>
            <Text style={styles.detailValue}>{item.dose} {item.unite}</Text>
          </View>
        ) : null}
        {item.dar ? (
          <View style={styles.detailChip}>
            <Text style={styles.detailLabel}>DAR</Text>
            <Text style={styles.detailValue}>{item.dar} j</Text>
          </View>
        ) : null}
        {item.nb_max_appli ? (
          <View style={styles.detailChip}>
            <Text style={styles.detailLabel}>Max appli.</Text>
            <Text style={styles.detailValue}>{item.nb_max_appli}</Text>
          </View>
        ) : null}
        {item.znt_aqua ? (
          <View style={[styles.detailChip, styles.zntChip]}>
            <Text style={styles.detailLabel}>ZNT</Text>
            <Text style={[styles.detailValue, { color: "#0a7ea5" }]}>{item.znt_aqua} m</Text>
          </View>
        ) : null}
      </View>

      {/* Conditions d'emploi */}
      {item.condition ? (
        <Text style={styles.conditionText}>{item.condition}</Text>
      ) : null}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Usages autorisés
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {productName}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}
              onPress={onClose}
            >
              <IconSymbol name="xmark.circle.fill" size={28} color="#687076" />
            </Pressable>
          </View>

          {/* Compteur + barre de recherche */}
          <View style={styles.searchBar}>
            <IconSymbol name="magnifyingglass" size={18} color="#687076" />
            <TextInput
              style={styles.searchInput}
              placeholder="Filtrer par culture ou cible..."
              placeholderTextColor="#9BA1A6"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
          <Text style={styles.counter}>
            {filtered.length} usage{filtered.length > 1 ? "s" : ""}
            {search.trim() ? ` sur ${usages.length}` : ""}
          </Text>

          {/* Liste des usages */}
          {filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun usage trouvé</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item, index) => `${item.usage ?? item.culture}-${index}`}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#687076",
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1A1A1A",
    padding: 0,
  },
  counter: {
    fontSize: 13,
    color: "#687076",
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 8,
    gap: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#687076",
  },
  usageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  usageHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  cultureName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    flex: 1,
  },
  cibleBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cibleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1D4ED8",
  },
  applicationText: {
    fontSize: 13,
    color: "#687076",
    fontStyle: "italic",
  },
  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  detailChip: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
  },
  zntChip: {
    backgroundColor: "#EFF6FF",
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#687076",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 1,
  },
  conditionText: {
    fontSize: 12,
    color: "#D97706",
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    padding: 8,
    lineHeight: 18,
  },
});
