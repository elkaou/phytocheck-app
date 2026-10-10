import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import type { ClassifiedProduct, Product, RiskPhrase } from "@/lib/product-service";
import { searchProducts } from "@/lib/product-service";
import type { ResolvedInventoryDetection } from "@/lib/inventory-stock-resolution";

interface InventoryManualCorrectionModalProps {
  visible: boolean;
  detection: ResolvedInventoryDetection | null;
  products: Product[];
  riskPhrases: Record<string, RiskPhrase[]>;
  isPremium: boolean;
  onCancel: () => void;
  onSelect: (product: ClassifiedProduct) => void;
}

export function InventoryManualCorrectionModal({
  visible,
  detection,
  products,
  riskPhrases,
  isPremium,
  onCancel,
  onSelect,
}: InventoryManualCorrectionModalProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (visible) setQuery(detection?.detectedName ?? "");
  }, [detection?.detectedName, visible]);

  const candidates = useMemo(
    () => searchProducts(query, 12, products, riskPhrases),
    [products, query, riskPhrases],
  );

  const normalizedQuery = query.trim();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <MaterialIcons name="edit" size={22} color="#0A7EA5" />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Corriger le produit</Text>
              <Text style={styles.subtitle}>
                {isPremium
                  ? `Bidon ${detection?.containerIndex ?? ""} — sélectionnez le produit correspondant.`
                  : `Bidon ${detection?.containerIndex ?? ""} — ce choix est gratuit et ne décompte aucune recherche.`}
              </Text>
            </View>
          </View>

          {detection?.detectedName ? (
            <View style={styles.detectedNameBox}>
              <Text style={styles.detectedNameLabel}>Nom lu sur l’étiquette</Text>
              <Text style={styles.detectedName}>{detection.detectedName}</Text>
            </View>
          ) : null}

          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={21} color="#64748B" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Nom du produit ou n° AMM"
              placeholderTextColor="#94A3B8"
              autoFocus
              autoCapitalize="characters"
              returnKeyType="search"
              style={styles.searchInput}
            />
            {normalizedQuery ? (
              <Pressable onPress={() => setQuery("")} hitSlop={10}>
                <MaterialIcons name="close" size={20} color="#64748B" />
              </Pressable>
            ) : null}
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.results}>
            {normalizedQuery.length < 2 ? (
              <Text style={styles.emptyText}>Saisissez au moins deux caractères pour rechercher un produit.</Text>
            ) : candidates.length === 0 ? (
              <Text style={styles.emptyText}>Aucun produit ne correspond à cette recherche.</Text>
            ) : (
              candidates.map((product) => {
                const displayName = product.matchedName || product.nom;
                return (
                  <Pressable
                    key={`${product.amm}:${product.matchedName || product.nom}`}
                    onPress={() => onSelect(product)}
                    style={({ pressed }) => [styles.candidate, pressed && { opacity: 0.72 }]}
                  >
                    <View style={styles.candidateCopy}>
                      <Text style={styles.candidateName}>{displayName}</Text>
                      {product.matchedName ? (
                        <Text style={styles.candidatePrimary}>Nom principal : {product.nom}</Text>
                      ) : null}
                      <Text style={styles.candidateAmm}>AMM {product.amm}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#0A7EA5" />
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <Pressable onPress={onCancel} style={({ pressed }) => [styles.cancelButton, pressed && { opacity: 0.7 }]}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.52)" },
  sheet: { maxHeight: "92%", flexShrink: 1, backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 22 },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginTop: 10, marginBottom: 18 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, gap: 3 },
  title: { color: "#0F172A", fontSize: 20, lineHeight: 25, fontWeight: "800" },
  subtitle: { color: "#64748B", fontSize: 13, lineHeight: 18 },
  detectedNameBox: { marginTop: 16, backgroundColor: "#FFFBEB", borderColor: "#FDE68A", borderWidth: 1, borderRadius: 10, padding: 11, gap: 2 },
  detectedNameLabel: { color: "#92400E", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  detectedName: { color: "#78350F", fontSize: 16, fontWeight: "800" },
  searchBox: { marginTop: 16, flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1, borderColor: "#94A3B8", borderRadius: 12, paddingHorizontal: 12, minHeight: 50 },
  searchInput: { flex: 1, color: "#0F172A", fontSize: 16, paddingVertical: 11 },
  results: { paddingTop: 12, paddingBottom: 8, gap: 8, flexGrow: 1 },
  emptyText: { color: "#64748B", textAlign: "center", fontSize: 14, lineHeight: 20, paddingVertical: 20 },
  candidate: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 11, paddingVertical: 11, paddingHorizontal: 12 },
  candidateCopy: { flex: 1, gap: 2 },
  candidateName: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  candidatePrimary: { color: "#475569", fontSize: 12, lineHeight: 17 },
  candidateAmm: { color: "#0A7EA5", fontSize: 12, fontWeight: "700" },
  cancelButton: { alignItems: "center", paddingVertical: 13, marginTop: 4 },
  cancelText: { color: "#475569", fontSize: 15, fontWeight: "700" },
});
