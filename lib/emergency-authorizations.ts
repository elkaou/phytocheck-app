import { getCultureSearchSet } from "./culture-aliases";

/**
 * Décision temporaire du ministère délivrée au titre de l'article 53
 * du règlement (CE) n°1107/2009. Une même AMM peut avoir plusieurs décisions.
 */
export interface EmergencyAuthorization {
  id: string;
  amm: string;
  productName: string;
  cultures: string;
  purpose: string;
  activeSubstances: string;
  issuedAt: string; // YYYY-MM-DD
  expiresAt: string; // YYYY-MM-DD, inclus
  decisionPdfUrl: string;
  sourcePageUrl: string;
  sourceRetrievedAt: string;
  /** Absence de ce champ = enregistrement ancien, considéré comme courant. */
  sourceStatus?: "current" | "historical";
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Les filtres proposés dans la recherche par culture. */
export type EmergencyAuthorizationOperation =
  | "Tous"
  | "Herbicide"
  | "Fongicide"
  | "Insecticide"
  | "Acaricide";

/**
 * Les décisions ministérielles Article 53 décrivent une finalité (ex. « Mildiou »)
 * et non une famille d'opération normalisée. Les mots-clés restent volontairement
 * prudents : une finalité non classable reste visible uniquement avec « Tous ».
 */
const PURPOSE_KEYWORDS_BY_OPERATION: Record<
  Exclude<EmergencyAuthorizationOperation, "Tous">,
  readonly string[]
> = {
  Herbicide: ["desherbage", "devitalisation"],
  Fongicide: [
    "mildiou",
    "oidium",
    "rouille",
    "tavelure",
    "cercosporio",
    "moniliose",
    "fusariose",
    "alternariose",
    "pourriture",
    "champignon",
    "maladie fong",
  ],
  Insecticide: [
    "chenille",
    "puceron",
    "mouche",
    "coleoptere",
    "cochenille",
    "cicadelle",
    "thrips",
    "balanin",
    "punaise",
    "longicorne",
    "phytophage",
    "insecte",
  ],
  Acaricide: ["acarien", "tetranyque", "eriophyide"],
};

function parseIsoDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function phraseMatches(source: string, candidate: string): boolean {
  const sourceNormalized = normalize(source);
  const candidateNormalized = normalize(candidate);
  if (!sourceNormalized || !candidateNormalized) return false;
  if (sourceNormalized.includes(candidateNormalized) || candidateNormalized.includes(sourceNormalized)) {
    return true;
  }

  // Les intitulés ministériels regroupent souvent plusieurs cultures séparées par
  // des virgules. Une correspondance par mots significatifs reste plus fiable
  // qu'une comparaison exacte pour « Pêcher - Abricotier » ou « Céréales à paille ».
  const significantTokens = candidateNormalized.split(" ").filter((token) => token.length >= 4);
  return significantTokens.length > 0 && significantTokens.every((token) => sourceNormalized.includes(token));
}

/** Vérifie que la finalité libre d'une décision correspond au filtre demandé. */
export function emergencyAuthorizationMatchesOperation(
  authorization: EmergencyAuthorization,
  operation: EmergencyAuthorizationOperation = "Tous",
): boolean {
  if (operation === "Tous") return true;
  const normalizedPurpose = normalize(authorization.purpose);
  return PURPOSE_KEYWORDS_BY_OPERATION[operation].some((keyword) =>
    normalizedPurpose.includes(keyword),
  );
}

/** Retourne vrai entre la délivrance et l'échéance incluses, selon le fuseau local. */
export function isEmergencyAuthorizationActive(
  authorization: EmergencyAuthorization,
  now: Date = new Date(),
): boolean {
  if (authorization.sourceStatus === "historical") return false;
  const issuedAt = parseIsoDay(authorization.issuedAt);
  const expiresAt = parseIsoDay(authorization.expiresAt);
  if (!issuedAt || !expiresAt) return false;

  const today = startOfLocalDay(now);
  return issuedAt <= today && today <= expiresAt;
}

/** Nombre de jours calendaires restant jusqu'à l'échéance, zéro le dernier jour. */
export function getEmergencyAuthorizationDaysRemaining(
  authorization: EmergencyAuthorization,
  now: Date = new Date(),
): number | null {
  const expiresAt = parseIsoDay(authorization.expiresAt);
  if (!expiresAt) return null;
  return Math.round((expiresAt.getTime() - startOfLocalDay(now).getTime()) / DAY_MS);
}

export function formatEmergencyAuthorizationDate(value: string): string {
  const date = parseIsoDay(value);
  return date
    ? date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : value;
}

export function getEmergencyAuthorizationsForAmm(
  authorizations: EmergencyAuthorization[],
  amm: string,
  now: Date = new Date(),
): EmergencyAuthorization[] {
  return authorizations
    .filter((authorization) => authorization.amm === amm && isEmergencyAuthorizationActive(authorization, now))
    .sort((left, right) => left.expiresAt.localeCompare(right.expiresAt));
}

/**
 * Recherche une décision Article 53 active par nom de produit ou numéro d’AMM.
 * Elle suit la même recherche partielle, sans casse ni accent, que la recherche
 * manuelle de produits E‑Phy afin de ne pas masquer un produit temporaire.
 */
export function searchEmergencyAuthorizations(
  authorizations: EmergencyAuthorization[],
  query: string,
  now: Date = new Date(),
): EmergencyAuthorization[] {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < 2) return [];

  return authorizations
    .filter(
      (authorization) =>
        isEmergencyAuthorizationActive(authorization, now) &&
        (normalize(authorization.productName).includes(normalizedQuery) ||
          normalize(authorization.amm).includes(normalizedQuery)),
    )
    .sort((left, right) => {
      const byName = left.productName.localeCompare(right.productName, "fr", { sensitivity: "base" });
      return byName || left.expiresAt.localeCompare(right.expiresAt);
    });
}

export interface EmergencyAuthorizationReminder {
  authorization: EmergencyAuthorization;
  daysRemaining: number;
  activeDecisionCount: number;
}

/** Retourne l’échéance active la plus proche pour une carte de stock. */
export function getEmergencyAuthorizationReminderForAmm(
  authorizations: EmergencyAuthorization[],
  amm: string,
  now: Date = new Date(),
): EmergencyAuthorizationReminder | null {
  const active = getEmergencyAuthorizationsForAmm(authorizations, amm, now);
  const authorization = active[0];
  if (!authorization) return null;

  const daysRemaining = getEmergencyAuthorizationDaysRemaining(authorization, now);
  if (daysRemaining === null || daysRemaining < 0) return null;
  return { authorization, daysRemaining, activeDecisionCount: active.length };
}

export function formatEmergencyAuthorizationRemainingDays(daysRemaining: number): string {
  if (daysRemaining <= 0) return "Expire aujourd’hui";
  if (daysRemaining === 1) return "Expire demain";
  return `Expire dans ${daysRemaining} jours`;
}

/**
 * Recherche les décisions actives couvrant une culture E-Phy ou l'un de ses alias.
 * La décision reste toujours affichée avec son libellé ministériel exact.
 */
export function getEmergencyAuthorizationsForCulture(
  authorizations: EmergencyAuthorization[],
  culture: string,
  operationOrNow: EmergencyAuthorizationOperation | Date = "Tous",
  now: Date = new Date(),
): EmergencyAuthorization[] {
  // Compatibilité avec la signature historique :
  // getEmergencyAuthorizationsForCulture(authorizations, culture, now).
  const operation = operationOrNow instanceof Date ? "Tous" : operationOrNow;
  const referenceDate = operationOrNow instanceof Date ? operationOrNow : now;
  const candidates = Array.from(getCultureSearchSet(culture));
  return authorizations
    .filter(
      (authorization) =>
        isEmergencyAuthorizationActive(authorization, referenceDate) &&
        emergencyAuthorizationMatchesOperation(authorization, operation) &&
        candidates.some((candidate) => phraseMatches(authorization.cultures, candidate)),
    )
    .sort((left, right) => left.expiresAt.localeCompare(right.expiresAt));
}
