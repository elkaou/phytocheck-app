import { describe, expect, it } from "vitest";

import {
  getUsagesForAmm,
  getUsagesForProduct,
} from "@/lib/product-usages";

describe("product-usages", () => {
  it("reprend les usages embarqués si le cache distant ne contient pas l'AMM", () => {
    const usages = getUsagesForAmm("2140040", {});

    expect(usages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          culture: "Crucifères oléagineuses",
          etat: "Retrait",
        }),
        expect.objectContaining({
          culture: "Pomme de terre",
          etat: "Retrait",
        }),
      ]),
    );
  });

  it("permet de résoudre les usages de BORAVI depuis un produit distant", () => {
    const usages = getUsagesForProduct(
      {
        amm: "2140040",
        referenceAmm: undefined,
      },
      {},
    );

    expect(
      usages.some((usage) => usage.culture === "Crucifères oléagineuses"),
    ).toBe(true);
  });
});
