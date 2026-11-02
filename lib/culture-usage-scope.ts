import {
  CULTURE_ALIASES,
  CULTURE_DISPLAY_NAMES,
  cultureMatchesSearch,
  getCultureSearchSet,
  normalizeCultureName,
} from "./culture-aliases";

export interface CultureScopedUsage {
  culture: string;
  condition?: string;
}

/**
 * Portées E-Phy vérifiées : arrêté du 12/04/2021, annexe 1 modifiée en 2025.
 * https://www.legifrance.gouv.fr/loda/id/JORFTEXT000043401456/
 * Fraisier relève des Cultures légumières. Traitements généraux couvre toutes
 * cultures, sous réserve des restrictions de CHAQUE ligne d'usage.
 *
 * Ne pas utiliser cet élargissement pour les décisions temporaires Article 53 :
 * leur propre liste de cultures et leurs conditions doivent rester déterminantes.
 * Les autres cultures conservent ici leur comportement existant.
 */
export function getEphyCultureSearchSet(culture: string): Set<string> {
  const candidates = getCultureSearchSet(culture);
  if (cultureMatchesSearch("Fraisier", culture)) {
    candidates.add("Traitements généraux");
  }
  return candidates;
}

const STRAWBERRY_WORD = /\bfrais(?:ier|iers|e|es)\b/;
const VEGETABLE_GROUP = /\bcultures? legumieres?\b/;
const GENERAL_GROUP = /\b(?:toutes cultures|traitements generaux)\b/;
const strawberryConditions = new WeakMap<CultureScopedUsage, boolean>();

// Ce lexique reconnaît seulement le sujet d'une restriction de culture.
// Ce n'est PAS une table d'équivalences : Pastèque et Fraisier restent distincts.
// En particulier « cultures hors sol » et « Spodoptera littoralis » n'en sont
// pas des entrées : il s'agit d'un mode de culture et d'un ravageur.
const CROP_SCOPE_NAMES = [
  ...Object.keys(CULTURE_ALIASES),
  ...Object.values(CULTURE_ALIASES).flat(),
  ...Object.keys(CULTURE_DISPLAY_NAMES),
  ...Object.values(CULTURE_DISPLAY_NAMES),
  "Vigne",
  "Forêt",
  "Arbre",
  "Conifère",
  "Courge",
  "Cultures florales",
  "Plantes ornementales",
  "Toutes cultures",
  "Traitements généraux",
].flatMap((name) => name.split(" - "));

const CROP_SCOPE_START = new RegExp(
  `^(?:${[...new Set(CROP_SCOPE_NAMES.map(normalizeCultureName))]
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "s?")
    .join("|")})(?:\\b|$)`,
);

function isExplicitCropList(text: string): boolean {
  const subject = text
    .replace(/["'()]/g, "")
    .trim()
    .replace(/^(?:les|le|la|des|du|de la|de l')\s+/, "")
    .replace(/\s+/g, " ");
  return CROP_SCOPE_START.test(subject);
}

function includesStrawberryScope(text: string): boolean {
  return (
    STRAWBERRY_WORD.test(text) ||
    VEGETABLE_GROUP.test(text) ||
    GENERAL_GROUP.test(text)
  );
}

/**
 * Garde-fous sur les restrictions textuelles explicites, pas un interpréteur
 * exhaustif des décisions d'AMM. Une condition non résolue reste à vérifier sur
 * E-Phy / l'étiquette : ce rapprochement n'est pas une validation d'emploi.
 */
function conditionAllowsStrawberry(usage: CultureScopedUsage): boolean {
  const cached = strawberryConditions.get(usage);
  if (cached !== undefined) return cached;

  const condition = normalizeCultureName(usage.condition ?? "").replace(
    /[’‘]/g,
    "'",
  );
  let allowed = true;

  const exclusions = condition.matchAll(
    /\b(?:sauf|hors|a l'exclusion d[eu]s?|ne pas (?:utiliser|appliquer|employer) sur|non autorise(?:e)? sur|usage non autorise sur)\s+([^.;:\n]+)/g,
  );
  for (const [, excluded] of exclusions) {
    if (includesStrawberryScope(excluded)) allowed = false;
  }

  const cropScopes: string[] = [];
  const appendCropScope = (text: string) => {
    if (isExplicitCropList(text)) cropScopes.push(text);
  };

  // « Uniquement vignes », « Uniquement sur tomate », mais aussi une seconde
  // permission « Également autorisé sur fraisier » dans une autre phrase.
  // Le sujet doit être une CULTURE : une restriction à une cible ou à la culture
  // hors sol ne doit jamais faire disparaître une ligne explicitement Fraisier.
  for (const [, scope] of condition.matchAll(
    /\b(?:uniquement|seulement|exclusivement|egalement autorise(?:e)?|aussi autorise(?:e)?)(?:\s+autorise(?:e)?)?(?:\s+sous abri|\s+en plein champ)?(?:\s+(?:sur|pour))?\s+([^.;:\n]+)/g,
  )) {
    appendCropScope(scope);
  }

  // Restrictions sans « uniquement », telles que les deux lignes CL de CENTIUM
  // 36 CS : « Sur pastèque et courge... » et « Sur courgette... ».
  for (const [, scope] of condition.matchAll(
    /(?:^|[.;:\n])\s*(?:-\s*)?sur\s+([^.;:\n]+)/g,
  )) {
    appendCropScope(scope);
  }

  // E-Phy utilise aussi « Pomme de terre: ... » comme en-tête de restriction.
  // Un en-tête technique « Intervalle minimum ... : 5 jours » est ignoré.
  const header = condition.match(/^\s*([^:\n]+):/);
  if (header) appendCropScope(header[1]);

  if (cropScopes.length > 0 && !cropScopes.some(includesStrawberryScope)) {
    allowed = false;
  }

  strawberryConditions.set(usage, allowed);
  return allowed;
}

export interface EphyCultureMatcher {
  readonly normalizedCultures: ReadonlySet<string>;
  matches: (usage: CultureScopedUsage) => boolean;
  allowsCondition: (usage: CultureScopedUsage) => boolean;
}

/** Prépare les clés une fois par culture, hors des boucles de produits. */
export function createEphyCultureMatcher(culture: string): EphyCultureMatcher {
  const normalizedCultures = new Set(
    Array.from(getEphyCultureSearchSet(culture), normalizeCultureName),
  );
  const isStrawberry = cultureMatchesSearch("Fraisier", culture);

  return {
    normalizedCultures,
    allowsCondition(usage) {
      return !isStrawberry || conditionAllowsStrawberry(usage);
    },
    matches(usage) {
      if (!normalizedCultures.has(normalizeCultureName(usage.culture))) {
        return false;
      }
      return !isStrawberry || conditionAllowsStrawberry(usage);
    },
  };
}

/** Garde-fou textuel sans élargir la liste des cultures d'une décision. */
export function cultureConditionAllowsSearch(
  condition: string,
  culture: string,
): boolean {
  return (
    !cultureMatchesSearch("Fraisier", culture) ||
    conditionAllowsStrawberry({ culture: "", condition })
  );
}
