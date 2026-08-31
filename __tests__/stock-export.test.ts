import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { createStockWorkbookBase64 } from "@/lib/stock-export";
import type { StockItem } from "@/lib/store";

const STOCK_ITEM: StockItem = {
  amm: "1234567",
  nom: "Produit test",
  secondaryName: "Nom commercial",
  classification: "homologue_cmr",
  dateAjout: "2026-08-31T08:00:00.000Z",
  titulaire: "Titulaire test",
  fonctions: "Fongicide",
  etat: "AUTORISE",
  quantite: 0.6,
  unite: "L",
};

describe("createStockWorkbookBase64", () => {
  it("génère un fichier Excel lisible avec les colonnes d’inventaire", () => {
    const base64 = createStockWorkbookBase64([STOCK_ITEM]);
    const workbook = XLSX.read(base64, { type: "base64" });
    const sheet = workbook.Sheets.Inventaire;

    expect(workbook.SheetNames).toEqual(["Inventaire"]);
    expect(sheet.A1.v).toBe("Produit");
    expect(sheet.D2.v).toBe(0.6);
    expect(sheet.F2.v).toBe("Homologué — CMR");
  });
});
