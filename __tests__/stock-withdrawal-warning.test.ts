import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    clear: () => values.clear(),
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
  };
});

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: storage.getItem,
    setItem: storage.setItem,
  },
}));

import {
  acknowledgeStockWithdrawalWarnings,
  filterUnacknowledgedStockWithdrawalWarnings,
  getStockWithdrawalWarningState,
  getStockWithdrawalWarningId,
  getUpcomingStockWithdrawalWarnings,
} from "@/lib/stock-withdrawal-warning";
import type { Product } from "@/lib/product-service";
import type { StockItem } from "@/lib/store";

const stockItem: StockItem = {
  amm: "1234567",
  nom: "Produit témoin",
  classification: "homologue",
  dateAjout: "2026-10-10T00:00:00.000Z",
  titulaire: "Titulaire",
  fonctions: "Herbicide",
  etat: "AUTORISE",
  quantite: 2,
  unite: "L",
};

function product(overrides: Partial<Product> = {}): Product {
  return {
    amm: "1234567",
    nom: "Produit témoin",
    nomsSecondaires: "",
    titulaire: "Titulaire",
    gammeUsage: "",
    substancesActives: "",
    fonctions: "Herbicide",
    formulation: "",
    etat: "AUTORISE",
    dateRetrait: "",
    dateAutorisation: "",
    ...overrides,
  };
}

describe("getUpcomingStockWithdrawalWarnings", () => {
  const now = new Date(2026, 9, 10);

  beforeEach(() => {
    storage.clear();
    storage.getItem.mockClear();
    storage.setItem.mockClear();
  });

  it("retient une date de retrait dans les trois mois calendaires", () => {
    const warnings = getUpcomingStockWithdrawalWarnings(
      [stockItem],
      [product({ dateRetrait: "10/01/2027" })],
      now,
    );

    expect(warnings).toEqual([
      expect.objectContaining({
        amm: "1234567",
        productName: "Produit témoin",
        withdrawalDate: "10/01/2027",
        daysRemaining: 92,
      }),
    ]);
  });

  it("ignore une date située au-delà de trois mois, passée ou un produit déjà retiré", () => {
    expect(getUpcomingStockWithdrawalWarnings([stockItem], [product({ dateRetrait: "11/01/2027" })], now)).toEqual([]);
    expect(getUpcomingStockWithdrawalWarnings([stockItem], [product({ dateRetrait: "09/10/2026" })], now)).toEqual([]);
    expect(getUpcomingStockWithdrawalWarnings([stockItem], [product({ etat: "RETIRE", dateRetrait: "10/11/2026" })], now)).toEqual([]);
  });

  it("n’alerte que pour les produits réellement présents dans le stock", () => {
    expect(
      getUpcomingStockWithdrawalWarnings([stockItem], [product({ amm: "9999999", dateRetrait: "10/11/2026" })], now),
    ).toEqual([]);
  });

  it("réaffiche une alerte si la date de retrait change", () => {
    const oldWarning = { amm: "1234567", productName: "Produit témoin", withdrawalDate: "10/11/2026", daysRemaining: 31 };
    const revisedWarning = { ...oldWarning, withdrawalDate: "15/11/2026", daysRemaining: 36 };

    expect(getStockWithdrawalWarningId(oldWarning)).not.toBe(getStockWithdrawalWarningId(revisedWarning));
    expect(filterUnacknowledgedStockWithdrawalWarnings([oldWarning, revisedWarning], [getStockWithdrawalWarningId(oldWarning)])).toEqual([
      revisedWarning,
    ]);
  });

  it("mémorise l’acquittement sans masquer une autre date de retrait", async () => {
    const acknowledgedWarning = {
      amm: "1234567",
      productName: "Produit témoin",
      withdrawalDate: "10/11/2026",
      daysRemaining: 31,
    };
    const updatedWarning = { ...acknowledgedWarning, withdrawalDate: "15/11/2026", daysRemaining: 36 };

    await acknowledgeStockWithdrawalWarnings([acknowledgedWarning]);
    const state = await getStockWithdrawalWarningState();

    expect(state.acknowledgedWarningIds).toEqual([getStockWithdrawalWarningId(acknowledgedWarning)]);
    expect(filterUnacknowledgedStockWithdrawalWarnings([acknowledgedWarning, updatedWarning], state.acknowledgedWarningIds)).toEqual([
      updatedWarning,
    ]);
  });
});
