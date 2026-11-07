import { describe, expect, it } from "vitest";

import {
  getBeeWarningForAmm,
  getBeeWarningForConditions,
  getBeeWarningForProduct,
} from "@/lib/bee-restrictions";
import bundledUsages from "@/assets/data/usages.json";

describe("restrictions abeilles", () => {
  it("détecte la mention abeilles de Cythrine Max depuis une ligne d'usage", () => {
    expect(
      getBeeWarningForConditions([
        "Mention abeilles : emploi autorisé au cours des périodes de production d'exsudats, en dehors de la présence des abeilles, pour deux applications maximales sur la culture.",
      ]),
    ).toBe("conditional");
  });

  it("conserve la priorité d'une restriction floraison issue du JSON produit", () => {
    expect(getBeeWarningForAmm("2180894")).toBe("restricted-during-flowering");
  });

  it("détecte la restriction de Cythrine Max depuis ses conditions d'usage", () => {
    expect(getBeeWarningForProduct({ amm: "2100026" }, bundledUsages)).toBe(
      "conditional",
    );
  });

  it("conserve l'avertissement si les usages distants sont partiels", () => {
    expect(getBeeWarningForProduct({ amm: "2100026" }, { "2100026": [] })).toBe(
      "conditional",
    );
  });

  it("ne plante pas lorsque les usages ne sont pas encore disponibles", () => {
    expect(getBeeWarningForProduct({ amm: "2100026" }, undefined)).toBe(
      "conditional",
    );
  });

  it("inspecte les usages de l'AMM française de référence pour un PCP", () => {
    expect(
      getBeeWarningForProduct(
        { amm: "2180086", referenceAmm: "2100026" },
        bundledUsages,
      ),
    ).toBe("conditional");
  });

  it("n'interprète pas une simple mention de floraison comme une restriction abeilles", () => {
    expect(
      getBeeWarningForConditions(["Ne pas appliquer durant la floraison."]),
    ).toBeUndefined();
  });
});
