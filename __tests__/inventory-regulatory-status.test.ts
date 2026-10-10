import { describe, expect, it } from "vitest";

import { getInventoryRegulatoryStatus } from "@/lib/inventory-regulatory-status";
import type { ProductClassification } from "@/lib/product-service";

describe("getInventoryRegulatoryStatus", () => {
  it.each<[ProductClassification, string, string, string]>([
    ["retire", "PPNU / retiré", "#EF4444", "#FEF2F2"],
    ["homologue_toxique", "Toxique", "#C2410C", "#FFF7ED"],
    ["homologue_cmr", "CMR", "#F59E0B", "#FFFBEB"],
    ["homologue", "Homologué", "#22C55E", "#F0FDF4"],
    ["autorisation_urgence", "Autorisation 120 jours", "#1D4ED8", "#EFF6FF"],
  ])("maps %s to its existing badge label and colors", (classification, label, color, backgroundColor) => {
    expect(getInventoryRegulatoryStatus({ classification })).toEqual({
      label,
      color,
      backgroundColor,
    });
  });
});
