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
      const exportDate = new Date().toLocaleDateString("fr-FR", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      });
      const exportTime = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

      const statsHomologue = stock.filter(i => i.classification === "homologue").length;
      const statsPPNU = stock.filter(i => i.classification === "retire").length;
      const statsCMR = stock.filter(i => i.classification === "homologue_cmr").length;
      const statsToxique = stock.filter(i => i.classification === "homologue_toxique").length;

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>PhytoCheck - Inventaire des produits phytosanitaires</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f8fafc; color: #1e293b; font-size: 13px; }

            /* PAGE HEADER */
            .page-header {
              background: linear-gradient(135deg, #0a7ea4 0%, #065f7c 100%);
              color: white;
              padding: 32px 40px 24px;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .brand { display: flex; align-items: center; gap: 16px; }
            .brand-icon {
              width: 52px; height: 52px;
              background: rgba(255,255,255,0.2);
              border-radius: 12px;
              display: flex; align-items: center; justify-content: center;
              font-size: 28px;
            }
            .brand-name { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
            .brand-tagline { font-size: 13px; opacity: 0.85; margin-top: 2px; }
            .export-meta { text-align: right; font-size: 12px; opacity: 0.9; line-height: 1.6; }
            .export-meta strong { font-size: 14px; display: block; margin-bottom: 4px; }

            /* SUMMARY STRIP */
            .summary-strip {
              background: white;
              border-bottom: 1px solid #e2e8f0;
              padding: 20px 40px;
              display: flex;
              gap: 24px;
              align-items: center;
            }
            .summary-title { font-size: 15px; font-weight: 700; color: #0a7ea4; flex: 1; }
            .stat-pill {
              display: flex; align-items: center; gap: 6px;
              background: #f1f5f9; border-radius: 20px;
              padding: 6px 14px; font-size: 12px; font-weight: 600;
            }
            .stat-dot { width: 8px; height: 8px; border-radius: 50%; }
            .dot-green { background: #16a34a; }
            .dot-red { background: #dc2626; }
            .dot-amber { background: #d97706; }
            .dot-orange { background: #c2410c; }
            .stat-total {
              background: #0a7ea4; color: white;
              border-radius: 20px; padding: 6px 16px;
              font-size: 13px; font-weight: 700;
            }

            /* MAIN CONTENT */
            .main { padding: 24px 40px 40px; }

            /* TABLE */
            .table-wrapper {
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
            }
            table { width: 100%; border-collapse: collapse; }
            thead tr { background: #0a7ea4; }
            thead th {
              color: white; font-size: 11px; font-weight: 700;
              text-transform: uppercase; letter-spacing: 0.5px;
              padding: 14px 16px; text-align: left;
            }
            thead th:last-child { text-align: center; }
            tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.1s; }
            tbody tr:last-child { border-bottom: none; }
            tbody tr:nth-child(even) { background: #fafbfc; }
            tbody td { padding: 13px 16px; vertical-align: middle; }
            .col-nom { font-weight: 600; color: #1e293b; font-size: 13px; }
            .col-nom .secondary { font-size: 11px; color: #64748b; font-weight: 400; margin-top: 2px; }
            .col-amm { font-family: monospace; font-size: 12px; color: #475569; background: #f1f5f9; padding: 3px 8px; border-radius: 4px; display: inline-block; }
            .col-qty { font-weight: 600; color: #334155; }
            .col-date { font-size: 11px; color: #94a3b8; }
            .col-status { text-align: center; }

            /* BADGES */
            .badge {
              display: inline-block; padding: 4px 10px;
              border-radius: 20px; font-size: 11px; font-weight: 700;
              letter-spacing: 0.2px; white-space: nowrap;
            }
            .badge-homologue { background: #dcfce7; color: #15803d; }
            .badge-retire { background: #fee2e2; color: #b91c1c; }
            .badge-cmr { background: #fef9c3; color: #a16207; }
            .badge-toxique { background: #ffedd5; color: #c2410c; }

            /* FOOTER */
            .page-footer {
              margin-top: 32px;
              padding: 20px 40px;
              border-top: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 11px;
              color: #94a3b8;
            }
            .footer-left { line-height: 1.6; }
            .footer-right { text-align: right; line-height: 1.6; }
            .footer-brand { font-weight: 700; color: #0a7ea4; font-size: 12px; }

            /* EMPTY STATE */
            .empty-state {
              text-align: center; padding: 60px 40px;
              color: #94a3b8; font-size: 15px;
            }
          </style>
        </head>
        <body>

          <!-- EN-TÊTE -->
          <div class="page-header">
            <div class="brand">
              <div class="brand-icon">🌿</div>
              <div>
                <div class="brand-name">PhytoCheck</div>
                <div class="brand-tagline">Inventaire des produits phytosanitaires</div>
              </div>
            </div>
            <div class="export-meta">
              <strong>Rapport d'inventaire</strong>
              ${exportDate}<br>
              Exporté à ${exportTime}
            </div>
          </div>

          <!-- BANDE DE RÉSUMÉ -->
          <div class="summary-strip">
            <span class="summary-title">Résumé du stock</span>
            <span class="stat-pill"><span class="stat-dot dot-green"></span>${statsHomologue} Homologué${statsHomologue > 1 ? "s" : ""}</span>
            <span class="stat-pill"><span class="stat-dot dot-red"></span>${statsPPNU} PPNU</span>
            <span class="stat-pill"><span class="stat-dot dot-amber"></span>${statsCMR} CMR</span>
            <span class="stat-pill"><span class="stat-dot dot-orange"></span>${statsToxique} Toxique${statsToxique > 1 ? "s" : ""}</span>
            <span class="stat-total">${stock.length} produit${stock.length > 1 ? "s" : ""}</span>
          </div>

          <!-- TABLEAU PRINCIPAL -->
          <div class="main">
            <div class="table-wrapper">
              ${stock.length === 0
                ? `<div class="empty-state">Aucun produit dans le stock</div>`
                : `<table>
                <thead>
                  <tr>
                    <th style="width:35%">Nom du produit</th>
                    <th style="width:15%">N° AMM</th>
                    <th style="width:12%">Quantité</th>
                    <th style="width:18%">Titulaire</th>
                    <th style="width:12%">Date ajout</th>
                    <th style="width:8%">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  ${stock.map((item, index) => {
                    const badgeClass = {
                      homologue: "badge-homologue",
                      retire: "badge-retire",
                      homologue_cmr: "badge-cmr",
                      homologue_toxique: "badge-toxique",
                    }[item.classification] ?? "badge-homologue";
                    const dateAjout = item.dateAjout
                      ? new Date(item.dateAjout).toLocaleDateString("fr-FR")
                      : "—";
                    const nomDisplay = item.secondaryName
                      ? `${item.secondaryName}<div class="secondary">${item.nom}</div>`
                      : item.nom;
                    return `
                    <tr>
                      <td class="col-nom">${nomDisplay}</td>
                      <td><span class="col-amm">${item.amm}</span></td>
                      <td class="col-qty">${item.quantite ?? 1} ${item.unite ?? "L"}</td>
                      <td style="font-size:11px;color:#475569">${item.titulaire ?? "—"}</td>
                      <td class="col-date">${dateAjout}</td>
                      <td class="col-status"><span class="badge ${badgeClass}">${getClassificationLabel(item.classification as ProductClassification)}</span></td>
                    </tr>`;
                  }).join("")}
                </tbody>
              </table>`
              }
            </div>
          </div>

          <!-- PIED DE PAGE -->
          <div class="page-footer">
            <div class="footer-left">
              Document généré automatiquement par <span class="footer-brand">PhytoCheck</span><br>
              Ce document est confidentiel et destiné à un usage professionnel.
            </div>
            <div class="footer-right">
              <span class="footer-brand">PhytoCheck Premium</span><br>
              ${exportDate} — ${exportTime}
            </div>
          </div>

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
            {isPremium
              ? `${stock.length} produit${stock.length > 1 ? "s" : ""} en stock`
              : `Produits : ${stock.length} / ${FREE_STOCK_LIMIT}`}
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
            {isPremium ? "📄 Exporter le stock en PDF" : "🔒 Export PDF (Premium)"}
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
                    {item.secondaryName ? `${item.secondaryName} (${item.nom})` : item.nom}
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
