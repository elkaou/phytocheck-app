import { describe, expect, it } from "vitest";
import { normalizeStockQuantityInput, parseStockQuantity } from "../lib/quantity";

describe("normalizeStockQuantityInput", () => {
  it("convertit immédiatement la virgule du clavier iOS en point", () => {
    expect(normalizeStockQuantityInput("0,6")).toBe("0.6");
    expect(normalizeStockQuantityInput("1,25")).toBe("1.25");
  });

  it("conserve les décimales au point saisies sur Android", () => {
    expect(normalizeStockQuantityInput("1.75")).toBe("1.75");
  });
});

describe("parseStockQuantity", () => {
  it("accepte une quantité entière", () => {
    expect(parseStockQuantity("25")).toBe(25);
  });

  it("accepte une décimale saisie avec une virgule iOS", () => {
    expect(parseStockQuantity("0,6")).toBe(0.6);
  });

  it("conserve la prise en charge du point décimal Android", () => {
    expect(parseStockQuantity("1.75")).toBe(1.75);
  });

  it("refuse les valeurs nulles, négatives ou mal formées", () => {
    expect(parseStockQuantity("0")).toBeNull();
    expect(parseStockQuantity("-2")).toBeNull();
    expect(parseStockQuantity("0,6.5")).toBeNull();
  });
});
