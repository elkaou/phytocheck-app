export interface InventoryOcrItem {
  containerIndex: number;
  productName: string;
  amm: string;
}

function cleanProductName(value: unknown): string {
  return String(value ?? "")
    .replace(/[™®©]/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\p{L}\p{N}\s\-']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanAmm(value: unknown): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  return /^\d{7}$/.test(digits) ? digits : "";
}

/**
 * Nettoie le JSON de l'analyse multi-bidons. Un élément équivaut à un unique
 * bidon visible. Les doublons sont éliminés par AMM, ou par nom quand l'AMM
 * n'est pas lisible, pour ne jamais ajouter le même contenant deux fois.
 */
export function parseInventoryOcrResponse(content: string): InventoryOcrItem[] {
  const cleaned = content
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return [];
  }

  const rawItems = Array.isArray((parsed as { containers?: unknown[] }).containers)
    ? (parsed as { containers: unknown[] }).containers
    : [];
  const seen = new Set<string>();
  const items: InventoryOcrItem[] = [];

  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") continue;
    const entry = raw as Record<string, unknown>;
    const productName = cleanProductName(entry.productName ?? entry.nom);
    const amm = cleanAmm(entry.amm);
    if (!productName && !amm) continue;

    const fingerprint = amm ? `amm:${amm}` : `name:${productName.toLocaleLowerCase("fr-FR")}`;
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);

    items.push({
      containerIndex: items.length + 1,
      productName,
      amm,
    });
  }

  return items;
}
