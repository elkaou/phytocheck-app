import bundledRestrictions from "@/assets/data/bee-restrictions.json";
import bundledUsages from "@/assets/data/usages.json";
import type { ProductUsage } from "./data-context";
import { getUsageAmm, getUsagesForProduct } from "./product-usages";
import type { Product } from "./product-service";

export type BeeWarningLevel =
  | "conditional"
  | "restricted-during-flowering"
  | "restricted-in-presence-of-bees";

export interface BeeRestrictionRecord {
  hasBeeRestriction: boolean;
  levels: BeeWarningLevel[];
  restrictionCodes: string[];
  restrictionTexts: string[];
  source?: string;
}

export type BeeRestrictionMap = Record<string, BeeRestrictionRecord>;

export const beeRestrictions = bundledRestrictions as BeeRestrictionMap;
const EMBEDDED_USAGES = bundledUsages as Record<string, ProductUsage[]>;

const BEE_FLOWERING_RESTRICTION_PATTERN =
  /SPe\s*8[\s\S]*abeilles?[\s\S]*(?:ne\s+pas\s+appliquer|ne\s+pas\s+utiliser)[\s\S]*(?:durant|pendant)\s+la\s+floraison/i;
const BEE_PRESENCE_RESTRICTION_PATTERN =
  /SPe\s*8[\s\S]*abeilles?[\s\S]*ne\s+pas\s+(?:appliquer|utiliser)[\s\S]*en\s+présence/i;
const BEE_OUTSIDE_PRESENCE_PATTERN =
  /en\s+dehors\s+de\s+la\s+présence\s+(?:des?\s+)?abeilles?/i;

/**
 * Détermine le niveau d'avertissement à partir de conditions d'usage.
 * Certaines mentions abeilles sont attachées à chaque ligne de culture dans
 * le CSV des usages et ne figurent donc pas dans bee-restrictions.json.
 */
export function getBeeWarningForConditions(
  conditions: readonly (string | undefined)[],
): BeeWarningLevel | undefined {
  let level: BeeWarningLevel | undefined;
  for (const condition of conditions) {
    if (!condition) continue;
    const nextLevel = BEE_FLOWERING_RESTRICTION_PATTERN.test(condition)
      ? "restricted-during-flowering"
      : BEE_PRESENCE_RESTRICTION_PATTERN.test(condition)
        ? "restricted-in-presence-of-bees"
        : BEE_OUTSIDE_PRESENCE_PATTERN.test(condition)
          ? "conditional"
          : undefined;
    if (nextLevel === "restricted-during-flowering") return nextLevel;
    if (
      nextLevel === "restricted-in-presence-of-bees" ||
      (nextLevel === "conditional" && !level)
    ) {
      level = nextLevel;
    }
  }
  return level;
}

/**
 * Retourne le niveau le plus important pour l'AMM.
 * L'interdiction pendant la floraison est prioritaire sur une restriction
 * conditionnelle, afin de toujours afficher l'avertissement le plus sévère.
 */
export function getBeeWarningLevel(
  record: BeeRestrictionRecord | undefined,
): BeeWarningLevel | undefined {
  if (!record?.hasBeeRestriction || record.levels.length === 0)
    return undefined;
  if (record.levels.includes("restricted-during-flowering")) {
    return "restricted-during-flowering";
  }
  if (record.levels.includes("restricted-in-presence-of-bees")) {
    return "restricted-in-presence-of-bees";
  }
  return "conditional";
}

export function getBeeWarningForAmm(amm: string): BeeWarningLevel | undefined {
  return getBeeWarningLevel(beeRestrictions[String(amm).trim()]);
}

function mostSevereBeeWarning(
  first: BeeWarningLevel | undefined,
  second: BeeWarningLevel | undefined,
): BeeWarningLevel | undefined {
  if (
    first === "restricted-during-flowering" ||
    second === "restricted-during-flowering"
  ) {
    return "restricted-during-flowering";
  }
  if (
    first === "restricted-in-presence-of-bees" ||
    second === "restricted-in-presence-of-bees"
  ) {
    return "restricted-in-presence-of-bees";
  }
  return first || second;
}

/**
 * Calcule l'avertissement Abeille pour une fiche, en combinant les conditions
 * générales de l'AMM et les conditions rattachées à ses usages E-Phy.
 *
 * Les recherches par nom/AMM n'ont pas de culture sélectionnée : toutes les
 * conditions d'usage de la fiche sont donc inspectées. Les permis de commerce
 * parallèle sont résolus vers leur AMM française de référence par
 * getUsagesForProduct().
 */
export function getBeeWarningForProduct(
  product: Pick<Product, "amm" | "referenceAmm">,
  usages: Record<string, ProductUsage[]> | undefined,
): BeeWarningLevel | undefined {
  const dataWarning = getBeeWarningForAmm(product.amm);
  const usageData = usages ?? {};
  const usageAmm = getUsageAmm(product);
  const remoteRows = getUsagesForProduct(product, usageData);
  const embeddedRows = EMBEDDED_USAGES[usageAmm] ?? [];
  // Les données publiées à distance peuvent être plus anciennes ou partielles.
  // Pour un avertissement de sécurité, on complète donc les lignes distantes
  // par les lignes embarquées au lieu de perdre une condition Abeilles.
  const usageWarning = getBeeWarningForConditions(
    [...remoteRows, ...embeddedRows].map((usage) => {
      const row = usage as ProductUsage & {
        conditions?: string;
        mention?: string;
      };
      return row.condition ?? row.conditions ?? row.mention;
    }),
  );
  return mostSevereBeeWarning(dataWarning, usageWarning);
}

export function getBeeWarningLabel(level: BeeWarningLevel): string {
  switch (level) {
    case "restricted-during-flowering":
      return "Ne pas appliquer pendant la floraison";
    case "restricted-in-presence-of-bees":
      return "Ne pas appliquer en présence d'abeilles";
    case "conditional":
      return "Application en dehors de la présence des abeilles";
  }
}
