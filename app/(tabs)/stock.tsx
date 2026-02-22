import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
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

type FilterType = "all" | "homologue" | "retire" | "homologue_cmr" | "homologue_toxique";

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

  const [filter, setFilter] = useState<FilterType>("all");

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

  // Filter stock based on selected filter
  const filteredStock = useMemo(() => {
    if (filter === "all") return stock;
    return stock.filter((item) => item.classification === filter);
  }, [stock, filter]);

  const handleFilterToggle = useCallback((filterType: FilterType) => {
    setFilter((current) => (current === filterType ? "all" : filterType));
  }, []);

  const handleExportPDF = useCallback(async () => {
    try {
      // Generate HTML for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #0a7ea5; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #0a7ea5; color: white; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
            .homologue { background-color: #F0FDF4; color: #16A34A; }
            .retire { background-color: #FEF2F2; color: #DC2626; }
            .cmr { background-color: #FFFBEB; color: #D97706; }
            .toxique { background-color: #FFF7ED; color: #C2410C; }
          </style>
        </head>
        <body>
          <h1>PhytoCheck - Stock des Produits</h1>
          <p>Date d'export : ${new Date().toLocaleDateString("fr-FR")}</p>
          <p>Nombre de produits : ${stock.length}</p>
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>AMM</th>
                <th>Quantité</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              ${stock.map(item => `
                <tr>
                  <td>${item.nom}</td>
                  <td>${item.amm}</td>
                  <td>${item.quantite} ${item.unite}</td>
                  <td><span class="badge ${item.classification}">${getClassificationLabel(item.classification as ProductClassification)}</span></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </body>
        </html>
      `;

      // Generate PDF
      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      // Share PDF
      if (Platform.OS === "web") {
        // On web, download the file
        const link = document.createElement("a");
        link.href = uri;
        link.download = `PhytoCheck-Stock-${new Date().toISOString().split("T")[0]}.pdf`;
        link.click();
      } else {
        // On mobile, share the file
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Exporter le stock en PDF",
          UTI: "com.adobe.pdf",
        });
      }
    } catch (error) {
      console.error("Error exporting PDF:", error);
      Alert.alert(
        "Erreur",
        "Une erreur est survenue lors de l'export du PDF. Veuillez réessayer."
      );
    }
  }, [stock]);

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
        {/* Export PDF Button */}
        <Pressable
          style={({ pressed }) => [
            styles.exportButton,
            !isPremium && styles.exportButtonDisabled,
            pressed && isPremium && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
          onPress={() => {
            if (!isPremium) {
              Alert.alert(
                "Fonctionnalité Premium",
                "L'export PDF est réservé aux utilisateurs Premium. Passez à Premium pour débloquer cette fonctionnalité.",
                [
                  { text: "Annuler", style: "cancel" },
                  {
                    text: "Voir Premium",
                    onPress: () => router.push("/premium" as any),
                  },
                ]
              );
            } else {
              handleExportPDF();
            }
          }}
          disabled={!isPremium}
        >
          <Text style={[
            styles.exportButtonText,
            !isPremium && styles.exportButtonTextDisabled,
          ]}>
            {isPremium ? "📄 Export en PDF" : "🔒 Export en PDF (Premium)"}
          </Text>
        </Pressable>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats grid with filters */}
          <View style={styles.statsGrid}>
            <Pressable
              style={({ pressed }) => [
                styles.statCard,
                { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
                filter === "homologue" && styles.statCardActive,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => handleFilterToggle("homologue")}
            >
              <Text style={[styles.statNumber, { color: "#16A34A" }]}>
                {stockStats.homologues}
              </Text>
              <Text style={[styles.statLabel, { color: "#16A34A" }]}>
                Homologués
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.statCard,
                { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
                filter === "retire" && styles.statCardActive,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => handleFilterToggle("retire")}
            >
              <Text style={[styles.statNumber, { color: "#DC2626" }]}>
                {stockStats.ppnu}
              </Text>
              <Text style={[styles.statLabel, { color: "#DC2626" }]}>PPNU</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.statCard,
                { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
                filter === "homologue_cmr" && styles.statCardActive,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => handleFilterToggle("homologue_cmr")}
            >
              <Text style={[styles.statNumber, { color: "#D97706" }]}>
                {stockStats.cmr}
              </Text>
              <Text style={[styles.statLabel, { color: "#D97706" }]}>CMR</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.statCard,
                { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" },
                filter === "homologue_toxique" && styles.statCardActive,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => handleFilterToggle("homologue_toxique")}
            >
              <Text style={[styles.statNumber, { color: "#C2410C" }]}>
                {stockStats.toxiques}
              </Text>
              <Text style={[styles.statLabel, { color: "#C2410C" }]}>
                Toxiques
              </Text>
            </Pressable>
          </View>

          {/* Stock list */}
          {filteredStock.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {filter === "all"
                  ? "Aucun produit dans le stock"
                  : "Aucun produit dans cette catégorie"}
              </Text>
            </View>
          ) : (
            filteredStock.map((item) => (
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
                    {item.nom}{item.secondaryName ? ` (${item.secondaryName})` : ""}
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
    backgroundColor: "#0a7ea5",
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
  exportButton: {
    backgroundColor: "#0a7ea5",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  exportButtonDisabled: {
    backgroundColor: "#E5E7EB",
    opacity: 0.6,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  exportButtonTextDisabled: {
    color: "#9BA1A6",
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
  statCardActive: {
    borderWidth: 3,
    transform: [{ scale: 0.98 }],
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
    color: "#0a7ea5",
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
