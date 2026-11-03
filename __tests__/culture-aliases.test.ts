import { describe, expect, it } from "vitest";

import {
  cultureMatchesSearch,
  getCultureSearchSet,
  getCultureSuggestions,
  normalizeCultureName,
} from "@/lib/culture-aliases";

describe("culture aliases", () => {
  it("normalise la casse et les accents", () => {
    expect(normalizeCultureName("  Épinard ")).toBe("epinard");
  });

  it("inclut les deux familles de haricots depuis le choix Haricots", () => {
    const cultures = getCultureSearchSet("haricots");

    expect(Array.from(cultures)).toContain(
      "Haricots et Pois non écossés frais",
    );
    expect(Array.from(cultures)).toContain("Haricots et Pois écossés frais");
    expect(
      cultureMatchesSearch("Haricots et pois non écossés frais", "Haricots"),
    ).toBe(true);
    expect(
      cultureMatchesSearch("Haricots et Pois écossés frais", "haricots"),
    ).toBe(true);
  });

  it("ne confond pas une culture sans rapport", () => {
    expect(cultureMatchesSearch("Vigne", "Haricots")).toBe(false);
  });

  it.each(["Fraisier", " FRAISIER ", "Fraise", "fraises", "fraisiers"])(
    "rattache %s aux cultures légumières et non aux groupes fruitiers",
    (query) => {
      expect(cultureMatchesSearch("Fraisier", query)).toBe(true);
      expect(cultureMatchesSearch("Cultures légumières", query)).toBe(true);
      for (const group of [
        "Petit fruits",
        "Petits fruits",
        "Cultures fruitières",
      ]) {
        expect(cultureMatchesSearch(group, query)).toBe(false);
      }
    },
  );

  it("ne transforme pas le rattachement à un groupe en synonymie ou en lien entre cultures sœurs", () => {
    expect(cultureMatchesSearch("Fraisier", "Cultures légumières")).toBe(false);
    expect(cultureMatchesSearch("Tomate - Aubergine", "Fraisier")).toBe(false);
    expect(cultureMatchesSearch("Framboisier", "Fraisier")).toBe(false);
    expect(cultureMatchesSearch("Petits fruits", "Framboisier")).toBe(true);
    expect(cultureMatchesSearch("Petits fruits", "Cassissier")).toBe(true);
    expect(cultureMatchesSearch("Cultures fruitières", "Pommier")).toBe(true);
  });

  it("propose Groseille via Cassissier et Pissenlit via les Chicorées à chicons", () => {
    const cultures = [
      "Cassissier",
      "Chicorées - Production de chicons",
      "Cultures fruitières",
    ];

    expect(getCultureSuggestions("groseille", cultures)).toContainEqual({
      value: "Cassissier",
      label: "Groseille → Cassissier",
    });
    expect(getCultureSuggestions("pissenlit", cultures)).toContainEqual({
      value: "Chicorées - Production de chicons",
      label: "Pissenlit → Chicorées - Production de chicons",
    });
  });

  it("ne rattache pas Groseillier ou Pissenlit au Fraisier", () => {
    expect(cultureMatchesSearch("Fraisier", "Groseillier")).toBe(false);
    expect(cultureMatchesSearch("Fraisier", "Pissenlit")).toBe(false);
  });
});
