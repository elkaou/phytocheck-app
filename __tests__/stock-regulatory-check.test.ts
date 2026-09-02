import { describe, expect, it } from "vitest";
import { checkStockRegulatoryStatus } from "../lib/stock-regulatory-check";
import type { Product, RiskPhrase } from "../lib/product-service";
import type { StockItem } from "../lib/store";

const stockItem: StockItem = {
  amm: "1234567",
  nom: "Produit témoin",
  classification: "homologue",
  dateAjout: "2026-08-31T00:00:00.000Z",
  titulaire: "Titulaire",
  fonctions: "Herbicide",
  etat: "AUTORISE",
  quantite: 2,
  unite: "L",
};

function product(overrides: Partial<Product> = {}): Product {
  return {
    amm: "1234567",
    nom: "Produit témoin",
    nomsSecondaires: "",
    titulaire: "Titulaire",
    gammeUsage: "",
    substancesActives: "",
    fonctions: "Herbicide",
    formulation: "",
    etat: "AUTORISE",
    dateRetrait: "",
    dateAutorisation: "",
    ...overrides,
  };
}

describe("checkStockRegulatoryStatus", () => {
  it("signale et persiste le retrait nouvellement détecté", () => {
    const result = checkStockRegulatoryStatus([stockItem], [product({ etat: "RETIRE", dateRetrait: "31/08/2026" })], {});

    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toMatchObject({ currentClassification: "retire", dateRetrait: "31/08/2026" });
    expect(result.updatedStock[0]).toMatchObject({ classification: "retire", etat: "RETIRE" });
  });

  it("signale un changement de classification CMR issu des données E‑Phy", () => {
    const risks: Record<string, RiskPhrase[]> = { "1234567": [{ code: "H350", libelle: "Peut provoquer le cancer" }] };
    const result = checkStockRegulatoryStatus([stockItem], [product()], risks);

    expect(result.changes[0]).toMatchObject({ currentClassification: "homologue_cmr" });
  });

  it("ne crée aucune alerte si le statut est inchangé", () => {
    const result = checkStockRegulatoryStatus([stockItem], [product()], {});

    expect(result.changes).toEqual([]);
    expect(result.updatedStock).toEqual([stockItem]);
  });
});
