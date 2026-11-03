import { describe, expect, it } from "vitest";

import { parseInventoryOcrResponse } from "../server/inventory-ocr";
import { resolveInventoryDetections } from "../lib/inventory-stock-resolution";
import type { Product, RiskPhrase } from "../lib/product-service";
import bundledProducts from "../assets/data/products.json";

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
  {
    amm: "9500568",
    nom: "SWITCH",
    nomsSecondaires: "",
    titulaire: "Exemple",
    gammeUsage: "PPP",
    substancesActives: "Substance E",
    fonctions: "Fongicide",
    formulation: "WG",
    etat: "AUTORISE",
    dateRetrait: "",
    dateAutorisation: "01/01/2020",
  },
  {
    amm: "2100169",
    nom: "BARYTON",
    nomsSecondaires: "SWITCH",
    titulaire: "Exemple",
    gammeUsage: "PPP",
    substancesActives: "Substance E",
    fonctions: "Fongicide",
    formulation: "EC",
    etat: "AUTORISE",
    dateRetrait: "",
    dateAutorisation: "01/01/2020",
  },
  {
    amm: "9600095",
    nom: "OMITE TD EW",
    nomsSecondaires: "",
    titulaire: "Exemple",
    gammeUsage: "PPP",
    substancesActives: "Substance F",
    fonctions: "Acaricide",
    formulation: "EW",
    etat: "RETIRE",
    dateRetrait: "01/01/2020",
    dateAutorisation: "01/01/2010",
  },
  {
    amm: "7600008",
    nom: "NIMROD",
    nomsSecondaires: "",
    titulaire: "Exemple",
    gammeUsage: "PPP",
    substancesActives: "Substance G",
    fonctions: "Fongicide",
    formulation: "EC",
    etat: "AUTORISE",
    dateRetrait: "",
    dateAutorisation: "01/01/2020",
  },
  {
    amm: "7500585",
    nom: "DOWPON 85 AQUATIQUE",
    nomsSecondaires: "",
    titulaire: "Exemple",
    gammeUsage: "PPP",
    substancesActives: "Substance H",
    fonctions: "Herbicide",
    formulation: "SL",
    etat: "RETIRE",
    dateRetrait: "01/01/2020",
    dateAutorisation: "01/01/2010",
  },
  {
    amm: "2140042",
    nom: "CLOMATE",
    nomsSecondaires: "",
    titulaire: "Exemple",
    gammeUsage: "PPP",
    substancesActives: "Substance I",
    fonctions: "Herbicide",
    formulation: "CS",
    etat: "AUTORISE",
    dateRetrait: "",
    dateAutorisation: "01/01/2020",
  },
  {
    amm: "2000327",
    nom: "SPOTLIGHT PLUS",
    nomsSecondaires: "",
    titulaire: "Exemple",
    gammeUsage: "PPP",
    substancesActives: "Substance J",
    fonctions: "Herbicide",
    formulation: "EC",
    etat: "AUTORISE",
    dateRetrait: "",
    dateAutorisation: "01/01/2020",
  },
  {
    amm: "9200383",
    nom: "KARATE XPRESS",
    nomsSecondaires: "POOL",
    titulaire: "Exemple",
    gammeUsage: "PPP",
    substancesActives: "Substance K",
    fonctions: "Insecticide",
    formulation: "CS",
    etat: "RETIRE",
    dateRetrait: "01/01/2020",
    dateAutorisation: "01/01/2010",
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
      JSON.stringify({
        containers: [{ productName: "ALPHA PRO", amm: "1234" }],
      }),
    );
    expect(parsed).toEqual([
      { containerIndex: 1, productName: "ALPHA PRO", amm: "" },
    ]);
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

  it("signale les AMM concurrentes quand un nom exact est principal sur une fiche et secondaire sur une autre", () => {
    const [resolved] = resolveInventoryDetections(
      [{ containerIndex: 1, productName: "FOLY R", amm: "2000380" }],
      (bundledProducts as Product[]).filter((product) =>
        ["9900115", "2000380"].includes(product.amm),
      ),
      {},
    );

    expect(resolved.product).toBeNull();
    expect(resolved.reason).toBe("ambiguous_name");
    expect(resolved.ambiguousProducts?.map((product) => product.amm)).toEqual([
      "2000380",
      "9900115",
    ]);
  });

  it.each([
    ["NIMROD", "7500585", "7600008", "NIMROD"],
    ["POOL", "9600095", "9200383", "KARATE XPRESS"],
  ])(
    "privilégie le nom commercial certain %s face à l’AMM OCR contradictoire",
    (detectedName, contradictoryAmm, expectedAmm, expectedName) => {
      const [resolved] = resolveInventoryDetections(
        [
          {
            containerIndex: 1,
            productName: detectedName,
            amm: contradictoryAmm,
          },
        ],
        products,
        riskPhrases,
      );

      expect(resolved.product?.amm).toBe(expectedAmm);
      expect(resolved.product?.nom).toBe(expectedName);
      expect(resolved.namePreferredOverAmm).toBe(true);
    },
  );

  it("signale SWITCH lorsque le nom principal et un nom secondaire homonyme ont deux AMM", () => {
    const [resolved] = resolveInventoryDetections(
      [{ containerIndex: 1, productName: "SWITCH", amm: "" }],
      products,
      riskPhrases,
    );

    expect(resolved.product).toBeNull();
    expect(resolved.reason).toBe("ambiguous_name");
    expect(resolved.ambiguousProducts?.map((product) => product.amm)).toEqual([
      "2100169",
      "9500568",
    ]);
  });

  it.each([
    ["CLOMATE", "2140042"],
    ["SPOTLIGHT PLUS", "2000327"],
  ])(
    "retient %s quand son nom commercial est lisible sans AMM",
    (detectedName, amm) => {
      const [resolved] = resolveInventoryDetections(
        [{ containerIndex: 1, productName: detectedName, amm: "" }],
        products,
        riskPhrases,
      );

      expect(resolved.product?.amm).toBe(amm);
    },
  );

  it("conserve VELMERI comme nom de stock quand l’AMM correspond à ALAKAZAM 500 WG", () => {
    const [resolved] = resolveInventoryDetections(
      [{ containerIndex: 1, productName: "VELMERI", amm: "2220043" }],
      [
        {
          amm: "2220043",
          nom: "ALAKAZAM 500 WG",
          nomsSecondaires: "VELMERI 500 WG | TERAVANT",
          titulaire: "JT AGRO Ltd",
          gammeUsage: "Professionnel",
          substancesActives: "flonicamide 500.0 g/kg",
          fonctions: "Insecticide",
          formulation: "WG",
          etat: "AUTORISE",
          dateRetrait: "",
          dateAutorisation: "28/02/2022",
        },
      ],
      riskPhrases,
    );

    expect(resolved.product?.amm).toBe("2220043");
    expect(resolved.stockDisplayName).toBe("VELMERI");
  });

  it("ne propose aucune fiche quand une AMM contredit une étiquette non exploitable", () => {
    const [resolved] = resolveInventoryDetections(
      [{ containerIndex: 1, productName: "TEXTE FLOU", amm: "9500568" }],
      products,
      riskPhrases,
    );

    expect(resolved.product).toBeNull();
    expect(resolved.reason).toBe("identity_conflict");
  });
});
