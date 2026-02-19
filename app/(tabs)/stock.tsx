import { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import {
  getClassificationLabel,
  getClassificationColor,
  getClassificationBgColor,
  ProductClassification,
} from "@/lib/product-service";
import { StockItem, FREE_STOCK_LIMIT } from "@/lib/store";

export default function StockScreen() {
  const router = useRouter();
  const {
    stock,
    stockStats,
    isPremium,
    removeProductFromStock,
    refreshStock,
    stockLimit,
  } = useApp();

  useEffect(() => {
    refreshStock();
  }, [refreshStock]);

  const handleRemove = useCallback(
    (item: StockItem) => {
      Alert.alert(
        "Supprimer du stock",
        `Voulez-vous retirer "${item.nom}" de votre stock ?`,
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Supprimer",
            style: "destructive",
            onPress: async () => {
              await removeProductFromStock(item.amm);
            },
          },
        ]
      );
    },
    [removeProductFromStock]
  );

  const maxDisplay = isPremium ? "∞" : String(FREE_STOCK_LIMIT);

  return (
    <ScreenContainer containerClassName="bg-primary">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestion du stock</Text>
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>
            Produits: {stock.length} / {maxDisplay}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
              <Text style={[styles.statNumber, { color: "#16A34A" }]}>
                {stockStats.homologues}
              </Text>
              <Text style={[styles.statLabel, { color: "#16A34A" }]}>
                Homologués
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <Text style={[styles.statNumber, { color: "#DC2626" }]}>
                {stockStats.ppnu}
              </Text>
              <Text style={[styles.statLabel, { color: "#DC2626" }]}>PPNU</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
              <Text style={[styles.statNumber, { color: "#D97706" }]}>
                {stockStats.cmr}
              </Text>
              <Text style={[styles.statLabel, { color: "#D97706" }]}>CMR</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }]}>
              <Text style={[styles.statNumber, { color: "#C2410C" }]}>
                {stockStats.toxiques}
              </Text>
              <Text style={[styles.statLabel, { color: "#C2410C" }]}>
                Toxiques
              </Text>
            </View>
          </View>

          {/* Stock list */}
          {stock.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Aucun produit dans le stock</Text>
            </View>
          ) : (
            stock.map((item) => (
              <Pressable
                key={item.amm}
                style={({ pressed }) => [
                  styles.stockCard,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() =>
                  router.push({
                    pathname: "/product/[amm]" as any,
                    params: { amm: item.amm },
                  })
                }
              >
                <View style={styles.stockCardContent}>
                  <Text style={styles.stockName} numberOfLines={1}>
                    {item.nom}
                  </Text>
                  <Text style={styles.stockAMM}>AMM : {item.amm}</Text>
                  <View style={styles.stockCardBottom}>
                    <View
                      style={[
                        styles.stockBadge,
                        {
                          backgroundColor: getClassificationBgColor(
                            item.classification as ProductClassification
                          ),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.stockBadgeText,
                          {
                            color: getClassificationColor(
                              item.classification as ProductClassification
                            ),
                          },
                        ]}
                      >
                        {getClassificationLabel(
                          item.classification as ProductClassification
                        )}
                      </Text>
                    </View>
                    <View style={styles.stockQuantityBadge}>
                      <Text style={styles.stockQuantityText}>
                        Qté : {item.quantite || 1} {item.unite || "L"}
                      </Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.deleteButton,
                    pressed && { opacity: 0.6 },
                  ]}
                  onPress={() => handleRemove(item)}
                >
                  <Text style={styles.deleteButtonText}>✕</Text>
                </Pressable>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#1A8A7D",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  counterBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  counterText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: "47%",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#687076",
  },
  stockCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stockCardContent: {
    flex: 1,
    marginRight: 12,
  },
  stockName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  stockAMM: {
    fontSize: 13,
    color: "#687076",
    marginTop: 2,
  },
  stockCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  stockBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  stockQuantityBadge: {
    backgroundColor: "#F0F4F8",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stockQuantityText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1A8A7D",
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "bold",
  },
});
