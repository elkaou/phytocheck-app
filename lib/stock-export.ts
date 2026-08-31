import * as XLSX from "xlsx";

import type { StockItem } from "@/lib/store";

const CLASSIFICATION_LABELS: Record<string, string> = {
  homologue: "Homologué non CMR, non toxique",
  retire: "PPNU / retiré",
  homologue_cmr: "Homologué — CMR",
  homologue_toxique: "Homologué — toxique",
};

export function createStockWorkbook(stock: StockItem[]): XLSX.WorkBook {
  const rows = stock.map((item) => ({
    Produit: item.nom,
    "Nom secondaire": item.secondaryName ?? "",
    "N° AMM": item.amm,
    Quantité: Number.isFinite(item.quantite) ? Number(item.quantite.toFixed(4)) : 0,
    Unité: item.unite,
    Statut: CLASSIFICATION_LABELS[item.classification] ?? item.classification,
    Titulaire: item.titulaire ?? "",
    Fonction: item.fonctions ?? "",
    "État d’autorisation": item.etat ?? "",
    "Date d’ajout": item.dateAjout ? new Date(item.dateAjout).toLocaleDateString("fr-FR") : "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 28 },
    { wch: 28 },
    { wch: 14 },
    { wch: 12 },
    { wch: 10 },
    { wch: 30 },
    { wch: 28 },
    { wch: 20 },
    { wch: 22 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventaire");
  return workbook;
}

export function createStockWorkbookBase64(stock: StockItem[]): string {
  return XLSX.write(createStockWorkbook(stock), {
    type: "base64",
    bookType: "xlsx",
    compression: true,
  });
}
