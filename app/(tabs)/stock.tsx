import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  TextInput,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import * as XLSX from "xlsx";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ScreenContainer } from "@/components/screen-container";
import { QuantityModal } from "@/components/quantity-modal";
import { useApp } from "@/lib/app-context";
import { useData } from "@/lib/data-context";
import { StockRegulatoryChange } from "@/lib/stock-regulatory-check";
import { formatStockQuantity } from "@/lib/quantity";
import { createStockWorkbook, createStockWorkbookBase64 } from "@/lib/stock-export";
import {
  getClassificationLabel,
  getClassificationColor,
  getClassificationBgColor,
  ProductClassification,
} from "@/lib/product-service";
import { StockItem, FREE_STOCK_LIMIT } from "@/lib/store";
import { stockItemMatchesSearch } from "@/lib/stock-search";

type FilterType = "all" | "homologue" | "retire" | "homologue_cmr" | "homologue_toxique";

export default function StockScreen() {
  const router = useRouter();
  const {
    stock,
    stockStats,
    isPremium,
    removeProductFromStock,
    updateProductQuantity,
    refreshStock,
    checkStockRegulatoryStatus,
    stockLimit,
  } = useApp();
  const { products, riskPhrases, updateDate } = useData();

  const [filter, setFilter] = useState<FilterType>("all");
  const [itemBeingEdited, setItemBeingEdited] = useState<StockItem | null>(null);
  const [isStockSearchOpen, setIsStockSearchOpen] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const isCheckingRegulatoryStatus = useRef(false);

  useEffect(() => {
    refreshStock();
  }, [refreshStock]);

  const showRegulatoryAlert = useCallback((changes: StockRegulatoryChange[]) => {
    const details = changes
      .slice(0, 5)
      .map((change) => {
        const suffix = change.dateRetrait ? ` (retrait : ${change.dateRetrait})` : "";
        return `• ${change.productName} : ${getClassificationLabel(change.currentClassification)}${suffix}`;
      })
      .join("\n");
    const remaining = changes.length > 5 ? `\n• … et ${changes.length - 5} autre${changes.length > 6 ? "s" : ""}` : "";

    Alert.alert(
      "Mise à jour réglementaire",
      `${changes.length} produit${changes.length > 1 ? "s ont" : " a"} changé de statut selon la base E‑Phy du ${updateDate}.\n\n${details}${remaining}`,
      [{ text: "Compris" }],
    );
  }, [updateDate]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      if (isCheckingRegulatoryStatus.current) return () => { isActive = false; };

      isCheckingRegulatoryStatus.current = true;
      void checkStockRegulatoryStatus(products, riskPhrases)
        .then((changes: StockRegulatoryChange[]) => {
          if (isActive && changes.length > 0) showRegulatoryAlert(changes);
        })
        .catch((error: unknown) => console.warn("Vérification réglementaire du stock impossible:", error))
        .finally(() => {
          isCheckingRegulatoryStatus.current = false;
        });

      return () => { isActive = false; };
    }, [checkStockRegulatoryStatus, products, riskPhrases, showRegulatoryAlert]),
  );

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

  const handleEditQuantity = useCallback((item: StockItem) => {
    setItemBeingEdited(item);
  }, []);

  const handleOpenProduct = useCallback((item: StockItem) => {
    router.push({
      pathname: "/product/[amm]",
      params: {
        amm: item.amm,
        name: item.secondaryName || item.nom,
      },
    });
  }, [router]);

  const handleQuantityConfirm = useCallback(
    async (quantity: number) => {
      if (!itemBeingEdited) return;

      const success = await updateProductQuantity(itemBeingEdited.amm, quantity);
      if (!success) {
        Alert.alert("Erreur", "La quantité n’a pas pu être mise à jour.");
        return;
      }
      setItemBeingEdited(null);
    },
    [itemBeingEdited, updateProductQuantity]
  );



  // Filter and sort stock alphabetically
  const filteredStock = useMemo(() => {
    const filtered = stock.filter((item) => {
      const matchesClassification = filter === "all" || item.classification === filter;
      return matchesClassification && stockItemMatchesSearch(item, stockSearchQuery);
    });
    return [...filtered].sort((a, b) => {
      const nameA = (a.secondaryName || a.nom).toLowerCase();
      const nameB = (b.secondaryName || b.nom).toLowerCase();
      return nameA.localeCompare(nameB, "fr", { sensitivity: "base" });
    });
  }, [stock, filter, stockSearchQuery]);

  const handleStockSearchToggle = useCallback(() => {
    setIsStockSearchOpen((isOpen) => {
      if (isOpen) setStockSearchQuery("");
      return !isOpen;
    });
  }, []);

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
              display: inline-block; padding: 3px 7px;
              border-radius: 10px; font-size: 9px; font-weight: 700;
              letter-spacing: 0.1px; white-space: normal;
              word-break: break-word; text-align: center;
              line-height: 1.4; max-width: 130px;
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
                    <th style="width:13%">Titulaire</th>
                    <th style="width:12%">Date ajout</th>
                    <th style="width:18%">Statut</th>
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

  const handleExportExcel = useCallback(async () => {
    try {
      const filename = `PhytoCheck-Stock-${new Date().toISOString().split("T")[0]}.xlsx`;

      if (Platform.OS === "web") {
        XLSX.writeFile(createStockWorkbook(stock), filename);
        return;
      }

      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      const fileContents = createStockWorkbookBase64(stock);
      await FileSystem.writeAsStringAsync(fileUri, fileContents, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Export Excel", "Le partage de fichiers n’est pas disponible sur cet appareil.");
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: "Exporter le stock en Excel",
        UTI: "org.openxmlformats.spreadsheetml.sheet",
      });
    } catch (error) {
      console.error("Error exporting Excel:", error);
      Alert.alert(
        "Erreur",
        "Une erreur est survenue lors de l’export Excel. Veuillez réessayer."
      );
    }
  }, [stock]);

  return (
    <ScreenContainer containerClassName="bg-primary">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestion du stock</Text>
        <View style={styles.headerActions}>
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>
              {isPremium
                ? `${stock.length} produit${stock.length > 1 ? "s" : ""} en stock`
                : `Produits : ${stock.length} / ${FREE_STOCK_LIMIT}`}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.stockSearchButton, pressed && { opacity: 0.72 }]}
            onPress={handleStockSearchToggle}
            accessibilityRole="button"
            accessibilityLabel={isStockSearchOpen ? "Fermer la recherche dans le stock" : "Rechercher dans le stock"}
            accessibilityHint="Recherche un produit déjà enregistré par nom ou numéro AMM"
          >
            <MaterialIcons name={isStockSearchOpen ? "close" : "search"} size={23} color="#0a7ea5" />
          </Pressable>
        </View>
        {isStockSearchOpen ? (
          <View style={styles.stockSearchField}>
            <MaterialIcons name="search" size={20} color="#687076" />
            <TextInput
              style={styles.stockSearchInput}
              value={stockSearchQuery}
              onChangeText={setStockSearchQuery}
              placeholder="Nom, nom secondaire ou AMM"
              placeholderTextColor="#8B949E"
              autoFocus
              autoCorrect={false}
              autoCapitalize="characters"
              clearButtonMode="while-editing"
              returnKeyType="search"
              accessibilityLabel="Rechercher un produit dans le stock"
            />
          </View>
        ) : null}
      </View>

      <View style={styles.content}>
        <View style={styles.exportButtonsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.exportButton,
              !isPremium && styles.exportButtonDisabled,
              pressed && isPremium && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleExportPDF}
            disabled={!isPremium}
            accessibilityRole="button"
            accessibilityLabel="Exporter le stock en PDF"
            accessibilityState={{ disabled: !isPremium }}
          >
            <Text style={[styles.exportButtonText, !isPremium && styles.exportButtonTextDisabled]}>
              {isPremium ? "Export PDF" : "🔒 Export PDF"}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.exportButton,
              !isPremium && styles.exportButtonDisabled,
              pressed && isPremium && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleExportExcel}
            disabled={!isPremium}
            accessibilityRole="button"
            accessibilityLabel="Exporter le stock en Excel"
            accessibilityState={{ disabled: !isPremium }}
          >
            <Text style={[styles.exportButtonText, !isPremium && styles.exportButtonTextDisabled]}>
              {isPremium ? "Export Excel" : "🔒 Export Excel"}
            </Text>
          </Pressable>
        </View>

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
                {stockSearchQuery.trim()
                  ? "Aucun produit ne correspond à cette recherche"
                  : filter === "all"
                  ? "Aucun produit dans le stock"
                  : "Aucun produit dans cette catégorie"}
              </Text>
            </View>
          ) : (
            filteredStock.map((item) => (
              <View
                key={item.amm}
                style={styles.stockCard}
              >
                <View style={styles.stockCardContent}>
                  <Pressable
                    onPress={() => handleOpenProduct(item)}
                    style={({ pressed }) => [
                      styles.stockNameButton,
                      pressed && { opacity: 0.65 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Ouvrir la fiche de ${item.secondaryName || item.nom}`}
                    accessibilityHint="Affiche les informations détaillées du produit"
                  >
                    <Text style={styles.stockName} numberOfLines={1}>
                      {item.secondaryName ? `${item.secondaryName} (${item.nom})` : item.nom}
                    </Text>
                    <Text style={styles.stockNameChevron}>›</Text>
                  </Pressable>
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
                  </View>
                </View>
                <View style={styles.stockCardActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.stockQuantityButton,
                      pressed && { opacity: 0.72 },
                    ]}
                    onPress={() => handleEditQuantity(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Modifier la quantité de ${item.secondaryName || item.nom}`}
                    accessibilityHint="Ouvre la saisie de la quantité restante totale"
                  >
                    <Text style={styles.stockQuantityText}>
                      Qté : {formatStockQuantity(item.quantite ?? 0)} {item.unite || "L"}
                    </Text>
                    <Text style={styles.stockQuantityEditIcon}>✎</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed && { opacity: 0.6 },
                    ]}
                    onPress={() => handleRemove(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Supprimer ${item.secondaryName || item.nom} du stock`}
                  >
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      <QuantityModal
        visible={itemBeingEdited !== null}
        productName={itemBeingEdited?.secondaryName || itemBeingEdited?.nom || "Produit"}
        mode="edit"
        initialQuantity={itemBeingEdited?.quantite ?? 0}
        initialUnit={itemBeingEdited?.unite ?? "L"}
        onCancel={() => setItemBeingEdited(null)}
        onConfirm={handleQuantityConfirm}
      />
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  counterBadge: {
    flex: 1,
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
  stockSearchButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  stockSearchField: {
    minHeight: 48,
    marginTop: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  stockSearchInput: {
    flex: 1,
    minHeight: 46,
    paddingVertical: 8,
    color: "#1A1A1A",
    fontSize: 15,
  },
  content: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  exportButton: {
    flex: 1,
    backgroundColor: "#0a7ea5",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  exportButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  exportButtonDisabled: {
    backgroundColor: "#E5E7EB",
    opacity: 0.6,
  },
  exportButtonText: {
    fontSize: 14,
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
  },
  stockCardContent: {
    width: "100%",
  },
  stockNameButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 36,
  },
  stockName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    flex: 1,
  },
  stockNameChevron: {
    color: "#0a7ea5",
    fontSize: 28,
    fontWeight: "400",
    lineHeight: 28,
  },
  stockAMM: {
    fontSize: 13,
    color: "#687076",
    marginTop: 2,
  },
  stockCardBottom: {
    marginTop: 6,
  },
  stockBadge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: "100%",
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: "bold",
    flexShrink: 1,
  },
  stockCardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 12,
  },
  stockQuantityButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 44,
    flex: 1,
    backgroundColor: "#E6F4FA",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stockQuantityText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0a7ea5",
  },
  stockQuantityEditIcon: {
    color: "#0a7ea5",
    fontSize: 17,
    fontWeight: "700",
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
