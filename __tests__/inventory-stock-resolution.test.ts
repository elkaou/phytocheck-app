import { describe, expect, it } from "vitest";

import { parseInventoryOcrResponse } from "../server/inventory-ocr";
import { resolveInventoryDetections } from "../lib/inventory-stock-resolution";
import type { Product, RiskPhrase } from "../lib/product-service";

const products: Product[] = [
  {
    amm: "1234567",
    nom: "GLOBUS",
    nomsSecondaires: "RACKAM",
    titulaire: "Exemple",
    gammeUsage: "PPP",
    substancesActives: "Substance A",
    fonctions: "Herbicide",
    formulation: "EC",
    etat: "AUTORISE",
    dateRetrait: "",
    dateAutorisation: "01/01/2020",
  },
  {
    amm: "7654321",
    nom: "ALPHA PRO",
    nomsSecondaires: "",
    titulaire: "Exemple",
    gammeUsage: "PPP",
    substancesActives: "Substance B",
    fonctions: "Fongicide",
    formulation: "SC",
    etat: "AUTORISE",
    dateRetrait: "",
    dateAutorisation: "01/01/2020",
  },
  {
    amm: "1111111",
    nom: "PROTECT PLUS",
    nomsSecondaires: "",
    titulaire: "Exemple",
    gammeUsage: "PPP",
    substancesActives: "Substance C",
    fonctions: "Fongicide",
    formulation: "SC",
    etat: "AUTORISE",
    dateRetrait: "",
    dateAutorisation: "01/01/2020",
  },
  {
    amm: "2222222",
    nom: "PROTECT MAX",
    nomsSecondaires: "",
    titulaire: "Exemple",
    gammeUsage: "PPP",
    substancesActives: "Substance D",
    fonctions: "Fongicide",
    formulation: "SC",
    etat: "AUTORISE",
    dateRetrait: "",
    dateAutorisation: "01/01/2020",
  },
];

const riskPhrases: Record<string, RiskPhrase[]> = {};

describe("parseInventoryOcrResponse", () => {
  it("retient au plus une entrée par bidon identifié et ignore les doublons", () => {
    const parsed = parseInventoryOcrResponse(
      JSON.stringify({
        containers: [
          { productName: "GLOBUS", amm: "1234567" },
          { productName: "GLOBUS", amm: "1234567" },
          { productName: "ALPHA PRO", amm: "" },
        ],
      }),
    );

    expect(parsed).toEqual([
      { containerIndex: 1, productName: "GLOBUS", amm: "1234567" },
      { containerIndex: 2, productName: "ALPHA PRO", amm: "" },
    ]);
  });

  it("écarte les AMM qui ne contiennent pas exactement sept chiffres", () => {
    const parsed = parseInventoryOcrResponse(
      JSON.stringify({ containers: [{ productName: "ALPHA PRO", amm: "1234" }] }),
    );
    expect(parsed).toEqual([{ containerIndex: 1, productName: "ALPHA PRO", amm: "" }]);
  });
});

describe("resolveInventoryDetections", () => {
  it("choisit une unique fiche grâce à l’AMM et conserve le nom secondaire lu", () => {
    const [resolved] = resolveInventoryDetections(
      [{ containerIndex: 1, productName: "Rackam", amm: "1234567" }],
      products,
      riskPhrases,
    );

    expect(resolved.product?.amm).toBe("1234567");
    expect(resolved.product?.nom).toBe("GLOBUS");
    expect(resolved.stockDisplayName).toBe("RACKAM");
  });

  it("retient une seule fiche quand le nom commercial est exact", () => {
    const [resolved] = resolveInventoryDetections(
      [{ containerIndex: 1, productName: "ALPHA PRO", amm: "" }],
      products,
      riskPhrases,
    );

    expect(resolved.product?.amm).toBe("7654321");
  });

  it("ne choisit pas arbitrairement une fiche quand le nom est ambigu", () => {
    const [resolved] = resolveInventoryDetections(
      [{ containerIndex: 1, productName: "PROTECT", amm: "" }],
      products,
      riskPhrases,
    );

    expect(resolved.product).toBeNull();
    expect(resolved.reason).toBe("not_found");
  });
});
