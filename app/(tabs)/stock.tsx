import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  StyleSheet,
  Alert,
  InteractionManager,
  Platform,
  TextInput,
  Image,
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
import { StockFilterPanel } from "@/components/stock-filter-panel";
import { StockWithdrawalWarningModal } from "@/components/stock-withdrawal-warning-modal";
import { useApp } from "@/lib/app-context";
import { useData } from "@/lib/data-context";
import { StockRegulatoryChange } from "@/lib/stock-regulatory-check";
import { StockEmergencyAuthorizationChange } from "@/lib/emergency-stock-check";
import {
  formatEmergencyAuthorizationDate,
  formatEmergencyAuthorizationRemainingDays,
  getEmergencyAuthorizationReminderForAmm,
} from "@/lib/emergency-authorizations";
import { formatStockQuantity } from "@/lib/quantity";
import {
  createStockWorkbook,
  createStockWorkbookBase64,
  sortStockItemsAlphabetically,
} from "@/lib/stock-export";
import {
  getClassificationLabel,
  getClassificationColor,
  getClassificationBgColor,
  ProductClassification,
} from "@/lib/product-service";
import { getStock, StockItem, FREE_STOCK_LIMIT } from "@/lib/store";
import { stockItemMatchesSearch } from "@/lib/stock-search";
import {
  EMPTY_STOCK_FILTERS,
  isStockProductOutsideFarmCultures,
  stockProductMatchesFilters,
  type StockFilters,
} from "@/lib/stock-filters";
import { loadFarmCultures } from "@/lib/farm-cultures";

const STOCK_FILTERS_STORAGE_KEY = "phytocheck_stock_filters_v1";
import {
  acknowledgeStockWithdrawalWarnings,
  filterUnacknowledgedStockWithdrawalWarnings,
  formatStockWithdrawalDate,
  formatStockWithdrawalRemainingDays,
  getStockWithdrawalWarningState,
  getUpcomingStockWithdrawalWarnings,
  StockWithdrawalWarning,
} from "@/lib/stock-withdrawal-warning";

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
    checkStockEmergencyAuthorizations,
    stockLimit,
  } = useApp();
  const {
    products,
    riskPhrases,
    usages,
    updateDate,
    emergencyAuthorizations,
    emergencyAuthorizationsUpdateDate,
  } = useData();

  const [filters, setFilters] = useState<StockFilters>(EMPTY_STOCK_FILTERS);
  const [farmCultures, setFarmCultures] = useState<string[]>([]);
  const [itemBeingEdited, setItemBeingEdited] = useState<StockItem | null>(
    null,
  );
  const [isStockSearchOpen, setIsStockSearchOpen] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [withdrawalWarnings, setWithdrawalWarnings] = useState<
    StockWithdrawalWarning[]
  >([]);
  const isCheckingRegulatoryStatus = useRef(false);

  useEffect(() => {
    refreshStock();
  }, [refreshStock]);

  useEffect(() => {
    void AsyncStorage.getItem(STOCK_FILTERS_STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const saved = JSON.parse(raw) as Partial<StockFilters>;
          setFilters({
            ...EMPTY_STOCK_FILTERS,
            ...saved,
            functions: Array.isArray(saved.functions)
              ? saved.functions
              : EMPTY_STOCK_FILTERS.functions,
            cultures: Array.isArray(saved.cultures)
              ? saved.cultures
              : EMPTY_STOCK_FILTERS.cultures,
          });
        } catch {
          // Une préférence corrompue ne doit pas bloquer l’onglet Stock.
        }
      })
      .catch((error: unknown) => {
        console.warn(
          "Préférences de filtres Stock impossibles à charger:",
          error,
        );
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadFarmCultures().then((cultures) => {
        if (!active) return;
        setFarmCultures(cultures);
        setFilters((current) => ({
          ...current,
          cultures: cultures.length
            ? current.cultures.filter((culture) => cultures.includes(culture))
            : [],
        }));
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const showRegulatoryAlert = useCallback(
    (
      changes: StockRegulatoryChange[],
      emergencyChanges: StockEmergencyAuthorizationChange[],
      onDismiss?: () => void,
    ) => {
      const details = changes
        .slice(0, 5)
        .map((change) => {
          const suffix = change.dateRetrait
            ? ` (retrait : ${change.dateRetrait})`
            : "";
          return `• ${change.productName} : ${getClassificationLabel(change.currentClassification)}${suffix}`;
        })
        .join("\n");
      const remaining =
        changes.length > 5
          ? `\n• … et ${changes.length - 5} autre${changes.length > 6 ? "s" : ""}`
          : "";
      const ephySection =
        changes.length > 0
          ? `Base E‑Phy du ${updateDate}\n${changes.length} produit${changes.length > 1 ? "s ont" : " a"} changé de statut.\n\n${details}${remaining}`
          : "";

      const article53Labels: Record<
        StockEmergencyAuthorizationChange["type"],
        string
      > = {
        new: "Nouvelle autorisation temporaire",
        expiring: "Échéance proche",
        expired: "Autorisation expirée",
      };
      const article53Details = emergencyChanges
        .slice(0, 5)
        .map((change) => {
          const date = formatEmergencyAuthorizationDate(
            change.authorization.expiresAt,
          );
          return `• ${article53Labels[change.type]} : ${change.authorization.productName} — ${change.authorization.cultures} (jusqu’au ${date})`;
        })
        .join("\n");
      const article53Remaining =
        emergencyChanges.length > 5
          ? `\n• … et ${emergencyChanges.length - 5} autre${emergencyChanges.length > 6 ? "s" : ""}`
          : "";
      const article53Section =
        emergencyChanges.length > 0
          ? `Autorisations d’urgence Article 53\n${article53Details}${article53Remaining}\n\nCes décisions temporaires ne modifient pas le statut E‑Phy du produit.`
          : "";

      Alert.alert(
        "Mise à jour réglementaire",
        [ephySection, article53Section].filter(Boolean).join("\n\n"),
        [{ text: "Compris", onPress: onDismiss }],
        { cancelable: false },
      );
    },
    [updateDate],
  );

  // Ce contrôle peut parcourir une base E‑Phy volumineuse. Il ne doit pas être
  // attaché à useFocusEffect : les onglets restent montés et chaque navigation
  // Stock → Premium → Stock relancerait inutilement le traitement lourd.
  useEffect(
    useCallback(() => {
      let isActive = true;
      const interactionTask = InteractionManager.runAfterInteractions(() => {
        if (!isActive || isCheckingRegulatoryStatus.current) return;

        isCheckingRegulatoryStatus.current = true;
        void Promise.all([
          checkStockRegulatoryStatus(products, riskPhrases),
          checkStockEmergencyAuthorizations(emergencyAuthorizations),
          getStockWithdrawalWarningState(),
          getStock(),
        ])
          .then(
            ([changes, emergencyChanges, withdrawalWarningState, storedStock]: [
              StockRegulatoryChange[],
              StockEmergencyAuthorizationChange[],
              Awaited<ReturnType<typeof getStockWithdrawalWarningState>>,
              StockItem[],
            ]) => {
              if (!isActive) return;

              const upcomingWithdrawalWarnings =
                filterUnacknowledgedStockWithdrawalWarnings(
                  getUpcomingStockWithdrawalWarnings(storedStock, products),
                  withdrawalWarningState.acknowledgedWarningIds,
                );
              const showWithdrawalWarning = () => {
                if (isActive && upcomingWithdrawalWarnings.length > 0) {
                  setWithdrawalWarnings(upcomingWithdrawalWarnings);
                }
              };

              if (changes.length > 0 || emergencyChanges.length > 0) {
                showRegulatoryAlert(
                  changes,
                  emergencyChanges,
                  showWithdrawalWarning,
                );
              } else {
                showWithdrawalWarning();
              }
            },
          )
          .catch((error: unknown) =>
            console.warn(
              "Vérification réglementaire du stock impossible:",
              error,
            ),
          )
          .finally(() => {
            isCheckingRegulatoryStatus.current = false;
          });
      });

      return () => {
        isActive = false;
        interactionTask.cancel();
      };
    }, [
      checkStockRegulatoryStatus,
      checkStockEmergencyAuthorizations,
      products,
      riskPhrases,
      emergencyAuthorizations,
      emergencyAuthorizationsUpdateDate,
      showRegulatoryAlert,
    ]),
  );

  const handleWithdrawalWarningClose = useCallback(
    (acknowledge: boolean) => {
      const warningsToHandle = withdrawalWarnings;
      setWithdrawalWarnings([]);
      if (acknowledge) {
        void acknowledgeStockWithdrawalWarnings(warningsToHandle);
      }
    },
    [withdrawalWarnings],
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
        ],
      );
    },
    [removeProductFromStock],
  );

  const handleEditQuantity = useCallback((item: StockItem) => {
    setItemBeingEdited(item);
  }, []);

  const handleOpenProduct = useCallback(
    (item: StockItem) => {
      router.push({
        pathname: "/product/[amm]",
        params: {
          amm: item.amm,
          name: item.secondaryName || item.nom,
        },
      });
    },
    [router],
  );

  const handleQuantityConfirm = useCallback(
    async (quantity: number) => {
      if (!itemBeingEdited) return;

      const success = await updateProductQuantity(
        itemBeingEdited.amm,
        quantity,
      );
      if (!success) {
        Alert.alert("Erreur", "La quantité n’a pas pu être mise à jour.");
        return;
      }
      setItemBeingEdited(null);
    },
    [itemBeingEdited, updateProductQuantity],
  );

  const productsByAmm = useMemo(
    () => new Map(products.map((product) => [product.amm, product])),
    [products],
  );

  const stockWithdrawalReminders = useMemo(() => {
    return new Map(
      getUpcomingStockWithdrawalWarnings(stock, products).map((warning) => [
        warning.amm,
        warning,
      ]),
    );
  }, [stock, products]);

  // Applique les filtres combinables puis trie le stock alphabétiquement.
  const filteredStock = useMemo(() => {
    const effectiveFilters: StockFilters = {
      ...filters,
      // Sans cultures configurées pour l’exploitation, aucun filtre culturel
      // résiduel ne doit modifier la liste du stock.
      cultures: farmCultures.length
        ? filters.cultures.filter((culture) => farmCultures.includes(culture))
        : [],
    };
    const filtered = stock.filter((item) => {
      return (
        stockProductMatchesFilters(
          item,
          effectiveFilters,
          productsByAmm,
          usages,
          new Set(stockWithdrawalReminders.keys()),
        ) && stockItemMatchesSearch(item, stockSearchQuery)
      );
    });
    return [...filtered].sort((a, b) => {
      const nameA = (a.secondaryName || a.nom).toLowerCase();
      const nameB = (b.secondaryName || b.nom).toLowerCase();
      return nameA.localeCompare(nameB, "fr", { sensitivity: "base" });
    });
  }, [
    stock,
    filters,
    farmCultures,
    productsByAmm,
    usages,
    stockWithdrawalReminders,
    stockSearchQuery,
  ]);

  const stockEmergencyReminders = useMemo(() => {
    const reminders = new Map<
      string,
      NonNullable<ReturnType<typeof getEmergencyAuthorizationReminderForAmm>>
    >();
    stock.forEach((item) => {
      const reminder = getEmergencyAuthorizationReminderForAmm(
        emergencyAuthorizations,
        item.amm,
      );
      if (reminder) reminders.set(item.amm, reminder);
    });
    return reminders;
  }, [stock, emergencyAuthorizations]);

  const handleStockSearchToggle = useCallback(() => {
    setIsStockSearchOpen((isOpen) => {
      if (isOpen) setStockSearchQuery("");
      return !isOpen;
    });
  }, []);

  const handleFiltersChange = useCallback(
    (nextFilters: StockFilters) => {
      const sanitizedFilters = {
        ...nextFilters,
        cultures: farmCultures.length
          ? nextFilters.cultures.filter((culture) =>
              farmCultures.includes(culture),
            )
          : [],
      };
      setFilters(sanitizedFilters);
      void AsyncStorage.setItem(
        STOCK_FILTERS_STORAGE_KEY,
        JSON.stringify(sanitizedFilters),
      );
    },
    [farmCultures],
  );

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_STOCK_FILTERS);
    void AsyncStorage.removeItem(STOCK_FILTERS_STORAGE_KEY);
  }, []);

  const handleExportPDF = useCallback(async () => {
    try {
      const exportStock = sortStockItemsAlphabetically(stock);
      const logoUri = Image.resolveAssetSource(
        require("../../assets/images/logo-phytocheck.jpg"),
      )?.uri;
      let logoSource = logoUri ?? "";
      if (logoSource && !logoSource.startsWith("data:")) {
        try {
          const logoBase64 = await FileSystem.readAsStringAsync(logoSource, {
            encoding: FileSystem.EncodingType.Base64,
          });
          logoSource = `data:image/jpeg;base64,${logoBase64}`;
        } catch {
          // Sur le web, l’URI bundlée peut être directement utilisable dans le HTML.
        }
      }
      const exportDate = new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const exportTime = new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const statsHomologue = stock.filter(
        (i) => i.classification === "homologue",
      ).length;
      const statsPPNU = stock.filter(
        (i) => i.classification === "retire",
      ).length;
      const statsCMR = stock.filter(
        (i) => i.classification === "homologue_cmr",
      ).length;
      const statsToxique = stock.filter(
        (i) => i.classification === "homologue_toxique",
      ).length;

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
              width: 64px; height: 64px;
              background: white;
              border-radius: 12px;
              display: flex; align-items: center; justify-content: center;
              overflow: hidden;
            }
            .brand-logo {
              width: 64px; height: 64px;
              object-fit: cover;
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
            .col-status { text-align: center; width: 30%; }

            /* BADGES */
            .badge {
              display: inline-block; padding: 3px 7px;
              border-radius: 10px; font-size: 9px; font-weight: 700;
              letter-spacing: 0.1px; white-space: normal;
              word-break: break-word; text-align: center;
              line-height: 1.4; max-width: 100%;
            }
            .badge-homologue { background: #dcfce7; color: #15803d; }
            .badge-retire { background: #fee2e2; color: #b91c1c; }
            .badge-cmr { background: #fef9c3; color: #a16207; }
            .badge-toxique { background: #ffedd5; color: #c2410c; }
            .badge-emergency { background: #dbeafe; color: #1d4ed8; }
            .badge-culture { background: #fef3c7; color: #b45309; margin-top: 5px; }

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
              <div class="brand-icon">
                ${logoSource ? `<img class="brand-logo" src="${logoSource}" alt="Logo PhytoCheck">` : ""}
              </div>
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
              ${
                    exportStock.length === 0
                  ? `<div class="empty-state">Aucun produit dans le stock</div>`
                  : `<table>
                <thead>
                  <tr>
                    <th style="width:30%">Nom du produit</th>
                    <th style="width:13%">N° AMM</th>
                    <th style="width:12%">Quantité</th>
                    <th style="width:15%">Titulaire</th>
                    <th style="width:30%">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  ${exportStock
                    .map((item) => {
                      const badgeClass =
                        {
                          homologue: "badge-homologue",
                          retire: "badge-retire",
                          homologue_cmr: "badge-cmr",
                          homologue_toxique: "badge-toxique",
                          autorisation_urgence: "badge-emergency",
                        }[item.classification] ?? "badge-homologue";
                      const outsideFarmCultures = isStockProductOutsideFarmCultures(
                        item.amm,
                        farmCultures,
                        usages,
                      );
                      const classificationLabel = getClassificationLabel(
                        item.classification as ProductClassification,
                        item.fonctions,
                      );
                      const nomDisplay = item.secondaryName
                        ? `${item.secondaryName}<div class="secondary">${item.nom}</div>`
                        : item.nom;
                      return `
                    <tr>
                      <td class="col-nom">${nomDisplay}</td>
                      <td><span class="col-amm">${item.amm}</span></td>
                      <td class="col-qty">${item.quantite ?? 1} ${item.unite ?? "L"}</td>
                      <td style="font-size:11px;color:#475569">${item.titulaire ?? "—"}</td>
                      <td class="col-status">
                        <span class="badge ${badgeClass}">${classificationLabel}</span>
                        ${outsideFarmCultures ? '<div><span class="badge badge-culture">Culture non déclarée sur l’exploitation</span></div>' : ""}
                      </td>
                    </tr>`;
                    })
                    .join("")}
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
        "Une erreur est survenue lors de l'export du PDF. Veuillez réessayer.",
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
        Alert.alert(
          "Export Excel",
          "Le partage de fichiers n’est pas disponible sur cet appareil.",
        );
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: "Exporter le stock en Excel",
        UTI: "org.openxmlformats.spreadsheetml.sheet",
      });
    } catch (error) {
      console.error("Error exporting Excel:", error);
      Alert.alert(
        "Erreur",
        "Une erreur est survenue lors de l’export Excel. Veuillez réessayer.",
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
            style={({ pressed }) => [
              styles.inventoryScanButton,
              pressed && { opacity: 0.72 },
            ]}
            onPress={() => router.push("/inventory-scan" as any)}
            accessibilityRole="button"
            accessibilityLabel="Ajout multiple au stock"
            accessibilityHint="Photographie plusieurs bidons pour les ajouter au stock"
          >
            <MaterialIcons name="add-a-photo" size={22} color="#1D4ED8" />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.stockSearchButton,
              pressed && { opacity: 0.72 },
            ]}
            onPress={handleStockSearchToggle}
            accessibilityRole="button"
            accessibilityLabel={
              isStockSearchOpen
                ? "Fermer la recherche dans le stock"
                : "Rechercher dans le stock"
            }
            accessibilityHint="Recherche un produit déjà enregistré par nom ou numéro AMM"
          >
            <MaterialIcons
              name={isStockSearchOpen ? "close" : "search"}
              size={23}
              color="#0a7ea5"
            />
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
              pressed &&
                isPremium && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleExportPDF}
            disabled={!isPremium}
            accessibilityRole="button"
            accessibilityLabel="Exporter le stock en PDF"
            accessibilityState={{ disabled: !isPremium }}
          >
            <Text
              style={[
                styles.exportButtonText,
                !isPremium && styles.exportButtonTextDisabled,
              ]}
            >
              {isPremium ? "Export PDF" : "🔒 Export PDF"}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.exportButton,
              !isPremium && styles.exportButtonDisabled,
              pressed &&
                isPremium && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleExportExcel}
            disabled={!isPremium}
            accessibilityRole="button"
            accessibilityLabel="Exporter le stock en Excel"
            accessibilityState={{ disabled: !isPremium }}
          >
            <Text
              style={[
                styles.exportButtonText,
                !isPremium && styles.exportButtonTextDisabled,
              ]}
            >
              {isPremium ? "Export Excel" : "🔒 Export Excel"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.compactFilterRow}>
          <Text style={styles.filteredCountText}>
            {filteredStock.length} produit
            {filteredStock.length > 1 ? "s" : ""}
          </Text>
          <StockFilterPanel
            filters={filters}
            farmCultures={farmCultures}
            onChange={handleFiltersChange}
            onReset={resetFilters}
          />
        </View>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Stock list */}
          {filteredStock.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {stockSearchQuery.trim()
                  ? "Aucun produit ne correspond à cette recherche"
                  : filters.functions.length > 0 ||
                      filters.cultures.length > 0 ||
                      filters.nonCmr ||
                      filters.nonToxique ||
                      filters.withdrawalWithinThreeMonths ||
                      !filters.includeRetired
                    ? "Aucun produit ne correspond aux filtres sélectionnés"
                    : "Aucun produit dans le stock"}
              </Text>
            </View>
          ) : (
            filteredStock.map((item) => {
              const emergencyReminder = stockEmergencyReminders.get(item.amm);
              const withdrawalReminder = stockWithdrawalReminders.get(item.amm);
              const outsideFarmCultures = isStockProductOutsideFarmCultures(
                item.amm,
                farmCultures,
                usages,
              );
              return (
                <View key={item.amm} style={styles.stockCard}>
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
                        {item.secondaryName
                          ? `${item.secondaryName} (${item.nom})`
                          : item.nom}
                      </Text>
                      <Text style={styles.stockNameChevron}>›</Text>
                    </Pressable>
                    <Text style={styles.stockAMM}>AMM : {item.amm}</Text>
                    {outsideFarmCultures ? (
                      <View style={styles.stockCultureWarning}>
                        <MaterialIcons
                          name="agriculture"
                          size={17}
                          color="#9A3412"
                        />
                        <Text style={styles.stockCultureWarningText}>
                          Culture non déclarée sur l’exploitation
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.stockCardBottom}>
                      <View
                        style={[
                          styles.stockBadge,
                          {
                            backgroundColor: getClassificationBgColor(
                              item.classification as ProductClassification,
                            ),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.stockBadgeText,
                            {
                              color: getClassificationColor(
                                item.classification as ProductClassification,
                              ),
                            },
                          ]}
                        >
                          {getClassificationLabel(
                            item.classification as ProductClassification,
                            item.fonctions,
                          )}
                        </Text>
                      </View>
                      {withdrawalReminder ? (
                        <View style={styles.stockWithdrawalReminder}>
                          <MaterialIcons
                            name="warning-amber"
                            size={17}
                            color="#B45309"
                          />
                          <Text style={styles.stockWithdrawalReminderText}>
                            {formatStockWithdrawalRemainingDays(
                              withdrawalReminder.daysRemaining,
                            )}{" "}
                            ·{" "}
                            {formatStockWithdrawalDate(
                              withdrawalReminder.withdrawalDate,
                            )}
                          </Text>
                        </View>
                      ) : null}
                      {emergencyReminder ? (
                        <View style={styles.stockEmergencyReminder}>
                          <MaterialIcons
                            name="schedule"
                            size={18}
                            color="#1D4ED8"
                          />
                          <View style={styles.stockEmergencyReminderContent}>
                            <Text style={styles.stockEmergencyReminderTitle}>
                              Autorisation d’urgence — Article 53
                            </Text>
                            <Text style={styles.stockEmergencyReminderText}>
                              {formatEmergencyAuthorizationRemainingDays(
                                emergencyReminder.daysRemaining,
                              )}{" "}
                              · jusqu’au{" "}
                              {formatEmergencyAuthorizationDate(
                                emergencyReminder.authorization.expiresAt,
                              )}
                              {emergencyReminder.activeDecisionCount > 1
                                ? ` · +${emergencyReminder.activeDecisionCount - 1} autre décision`
                                : ""}
                            </Text>
                          </View>
                        </View>
                      ) : null}
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
                        Qté : {formatStockQuantity(item.quantite ?? 0)}{" "}
                        {item.unite || "L"}
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
              );
            })
          )}
        </ScrollView>
      </View>

      <QuantityModal
        visible={itemBeingEdited !== null}
        productName={
          itemBeingEdited?.secondaryName || itemBeingEdited?.nom || "Produit"
        }
        mode="edit"
        initialQuantity={itemBeingEdited?.quantite ?? 0}
        unit={itemBeingEdited?.unite ?? "L"}
        onCancel={() => setItemBeingEdited(null)}
        onConfirm={handleQuantityConfirm}
      />
      <StockWithdrawalWarningModal
        visible={withdrawalWarnings.length > 0}
        warnings={withdrawalWarnings}
        onClose={handleWithdrawalWarningClose}
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
  inventoryScanButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#DBEAFE",
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
  compactFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  filteredCountText: {
    flex: 1,
    color: "#475569",
    fontSize: 15,
    fontWeight: "700",
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
  stockCultureWarning: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginTop: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
  },
  stockCultureWarningText: {
    flex: 1,
    color: "#9A3412",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
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
    minWidth: 0,
  },
  stockBadgeText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "bold",
    flexShrink: 1,
  },
  stockWithdrawalReminder: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#FEF3C7",
  },
  stockWithdrawalReminderText: {
    color: "#92400E",
    fontSize: 11,
    fontWeight: "700",
  },
  stockEmergencyReminder: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  stockEmergencyReminderContent: {
    flex: 1,
  },
  stockEmergencyReminderTitle: {
    color: "#1E3A8A",
    fontSize: 12,
    fontWeight: "700",
  },
  stockEmergencyReminderText: {
    color: "#1D4ED8",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
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
