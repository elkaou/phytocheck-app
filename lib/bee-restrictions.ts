import bundledRestrictions from "@/assets/data/bee-restrictions.json";

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
  return getBeeWarningLevel(beeRestrictions[amm]);
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
