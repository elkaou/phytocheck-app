/**
 * Normalise la saisie numérique au fil de la frappe.
 * Le pavé numérique iOS français propose une virgule ; le stockage emploie
 * un point, compris de façon identique par iOS et Android.
 */
export function normalizeStockQuantityInput(value: string): string {
  return value.replace(/,/g, ".");
}

/**
 * Converts a user-entered stock quantity into a positive number.
 * Both French decimal commas and decimal points are accepted so the
 * same value works with iOS and Android numeric keyboards.
 */
export function parseStockQuantity(value: string, allowZero = false): number | null {
  const normalized = normalizeStockQuantityInput(value.trim().replace(/\s/g, ""));

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return null;
  }

  const quantity = Number(normalized);
  const isValid = allowZero ? quantity >= 0 : quantity > 0;
  return Number.isFinite(quantity) && isValid ? quantity : null;
}
