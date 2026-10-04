import { describe, expect, it } from "vitest";

import { getCultureSearchLoadingDescription } from "@/lib/culture-search-loading";

describe("culture search loading description", () => {
  it("identifie clairement la culture et le type demandé", () => {
    expect(getCultureSearchLoadingDescription("Orge", "Herbicide")).toBe(
      "Recherche des herbicides autorisés pour Orge",
    );
  });

  it("décrit une recherche sans filtre de type", () => {
    expect(getCultureSearchLoadingDescription("Haricots", "Tous")).toBe(
      "Recherche des produits autorisés pour Haricots",
    );
  });

  it("reste compréhensible tant que la culture est en cours de sélection", () => {
    expect(getCultureSearchLoadingDescription("", "Fongicide")).toBe(
      "Recherche des fongicides autorisés pour la culture sélectionnée",
    );
  });
});
