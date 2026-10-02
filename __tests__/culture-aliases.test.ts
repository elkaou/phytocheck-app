import { describe, expect, it } from "vitest";

import {
  cultureMatchesSearch,
  getCultureSearchSet,
  normalizeCultureName,
} from "@/lib/culture-aliases";

describe("culture aliases", () => {
  it("normalise la casse et les accents", () => {
    expect(normalizeCultureName("  Épinard ")).toBe("epinard");
  });

  it("inclut les deux familles de haricots depuis le choix Haricots", () => {
    const cultures = getCultureSearchSet("haricots");

    expect(Array.from(cultures)).toContain("Haricots et Pois non écossés frais");
    expect(Array.from(cultures)).toContain("Haricots et Pois écossés frais");
    expect(cultureMatchesSearch("Haricots et pois non écossés frais", "Haricots")).toBe(true);
    expect(cultureMatchesSearch("Haricots et Pois écossés frais", "haricots")).toBe(true);
  });

  it("ne confond pas une culture sans rapport", () => {
    expect(cultureMatchesSearch("Vigne", "Haricots")).toBe(false);
  });
});
