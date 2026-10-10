import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Product } from "./product-service";
import type { StockItem } from "./store";

const STORAGE_KEY = "@phytocheck/stock_withdrawal_warning_state";
export const WITHDRAWAL_WARNING_MONTHS = 3;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export interface StockWithdrawalWarning {
  amm: string;
  productName: string;
  withdrawalDate: string;
  daysRemaining: number;
}

export interface StockWithdrawalWarningState {
  acknowledgedWarningIds: string[];
}

const EMPTY_STATE: StockWithdrawalWarningState = { acknowledgedWarningIds: [] };

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseFrenchDate(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;

  const [, dayValue, monthValue, yearValue] = match;
  const day = Number(dayValue);
  const month = Number(monthValue);
  const year = Number(yearValue);
  const parsed = new Date(year, month - 1, day);

  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
    ? parsed
    : null;
}

export function formatStockWithdrawalDate(value: string): string {
  const parsed = parseFrenchDate(value);
  if (!parsed) return value;

  return parsed.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatStockWithdrawalRemainingDays(days: number): string {
  if (days === 0) return "Retrait aujourd’hui";
  return `Retrait dans ${days} jour${days > 1 ? "s" : ""}`;
}

function addMonths(date: Date, months: number): Date {
  const result = startOfDay(date);
  const initialDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDayOfTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(initialDay, lastDayOfTargetMonth));
  return result;
}

/**
 * Retourne uniquement les produits encore autorisés dont le retrait est prévu
 * au plus tard dans les trois mois calendaires à venir.
 */
export function getUpcomingStockWithdrawalWarnings(
  stock: StockItem[],
  products: Product[],
  now: Date = new Date(),
): StockWithdrawalWarning[] {
  const today = startOfDay(now);
  const deadline = addMonths(today, WITHDRAWAL_WARNING_MONTHS);
  const productsByAmm = new Map(products.map((product) => [product.amm, product]));

  const warnings = stock.flatMap((stockItem) => {
    const product = productsByAmm.get(stockItem.amm);
    if (!product || product.etat !== "AUTORISE" || !product.dateRetrait) return [];

    const withdrawalDate = parseFrenchDate(product.dateRetrait);
    if (!withdrawalDate || withdrawalDate < today || withdrawalDate > deadline) return [];

    return [{
      amm: stockItem.amm,
      productName: stockItem.secondaryName || stockItem.nom || product.nom,
      withdrawalDate: product.dateRetrait,
      daysRemaining: Math.ceil((withdrawalDate.getTime() - today.getTime()) / MILLISECONDS_PER_DAY),
    }];
  });

  return warnings.sort((left, right) =>
    left.daysRemaining - right.daysRemaining || left.productName.localeCompare(right.productName, "fr"),
  );
}

/** Une date de retrait mise à jour crée volontairement une nouvelle alerte. */
export function getStockWithdrawalWarningId(warning: Pick<StockWithdrawalWarning, "amm" | "withdrawalDate">): string {
  return `${warning.amm}:${warning.withdrawalDate}`;
}

export function filterUnacknowledgedStockWithdrawalWarnings(
  warnings: StockWithdrawalWarning[],
  acknowledgedWarningIds: string[],
): StockWithdrawalWarning[] {
  const acknowledged = new Set(acknowledgedWarningIds);
  return warnings.filter((warning) => !acknowledged.has(getStockWithdrawalWarningId(warning)));
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

export async function getStockWithdrawalWarningState(): Promise<StockWithdrawalWarningState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY_STATE;

    return {
      acknowledgedWarningIds: asStringArray(
        (parsed as Partial<StockWithdrawalWarningState>).acknowledgedWarningIds,
      ),
    };
  } catch {
    return EMPTY_STATE;
  }
}

export async function acknowledgeStockWithdrawalWarnings(
  warnings: StockWithdrawalWarning[],
): Promise<void> {
  if (warnings.length === 0) return;

  const previous = await getStockWithdrawalWarningState();
  const acknowledgedWarningIds = Array.from(
    new Set([
      ...previous.acknowledgedWarningIds,
      ...warnings.map(getStockWithdrawalWarningId),
    ]),
  );

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ acknowledgedWarningIds }));
  } catch {
    // L’alerte réapparaîtra à la prochaine ouverture si l’écriture locale échoue.
  }
}
