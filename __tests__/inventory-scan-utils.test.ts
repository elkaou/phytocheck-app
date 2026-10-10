import { describe, expect, it } from "vitest";

import {
  applyManualInventoryCorrection,
  countAutomaticInventorySearches,
  getInventorySearchChargeNotice,
} from "@/lib/inventory-scan-utils";
import type { ResolvedInventoryDetection } from "@/lib/inventory-stock-resolution";
import type { ClassifiedProduct } from "@/lib/product-service";

const product = {
  amm: "1234567",
  nom: "SWITCH",
  nomsSecondaires: "",
  titulaire: "Titulaire",
  gammeUsage: "",
  substancesActives: "",
  fonctions: "Fongicide",
  formulation: "",
  etat: "AUTORISE",
  dateRetrait: "",
  dateAutorisation: "2020-01-01",
  classification: "homologue",
  riskPhrases: [],
  isCMR: false,
  isToxique: false,
} as ClassifiedProduct;

const unresolved: ResolvedInventoryDetection = {
  containerIndex: 1,
  detectedName: "SWITCH",
  detectedAmm: "9600095",
  product: null,
  reason: "identity_conflict",
};

const automatic: ResolvedInventoryDetection = {
  containerIndex: 2,
  detectedName: "NIMROD",
  detectedAmm: "7600008",
  product,
};

describe("inventory scan utilities", () => {
  it("compte uniquement les bidons identifiés automatiquement", () => {
    const corrected = applyManualInventoryCorrection([unresolved], 1, product)[0];
    expect(countAutomaticInventorySearches([automatic, unresolved, corrected])).toBe(1);
  });

  it("rattache le produit choisi à un bidon initialement ambigu sans le rendre facturable", () => {
    const [corrected] = applyManualInventoryCorrection([unresolved], 1, product);

    expect(corrected.product?.amm).toBe("1234567");
    expect(corrected.manuallyCorrected).toBe(true);
    expect(corrected.reason).toBeUndefined();
  });

  it("explique le décompte par bidon et les corrections gratuites", () => {
    expect(getInventorySearchChargeNotice(4, false)).toContain("4 recherches");
    expect(getInventorySearchChargeNotice(4, false)).toContain("corrigés manuellement ne sont pas décomptés");
    expect(getInventorySearchChargeNotice(Infinity, true)).toContain("recherches illimitées");
  });
});
