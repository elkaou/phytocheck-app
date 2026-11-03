/**
 * Table d'alias de cultures : quand l'utilisateur cherche une culture spécifique,
 * on inclut aussi les cultures génériques d'E-Phy qui la couvrent.
 * Ex: "Blé" → inclure aussi "Céréales à paille" et "Céréales"
 *
 * Utilisé dans :
 * - search.tsx : pour la recherche par culture (trouver les produits homologués)
 * - usages-modal.tsx : pour le filtre par culture initiale (afficher les usages pertinents)
 */
export const CULTURE_ALIASES: Record<string, string[]> = {
  // Céréales à paille
  Blé: ["Céréales à paille", "Céréales", "Grandes cultures"],
  Orge: ["Céréales à paille", "Céréales", "Grandes cultures"],
  Seigle: ["Céréales à paille", "Céréales", "Grandes cultures"],
  Avoine: ["Céréales à paille", "Céréales", "Grandes cultures"],
  Triticale: ["Céréales à paille", "Céréales", "Grandes cultures"],
  // Maïs
  Maïs: ["Céréales", "Grandes cultures"],
  "Maïs doux": ["Céréales", "Grandes cultures"],
  // Oléagineux
  Tournesol: ["Grandes cultures"],
  Colza: ["Crucifères oléagineuses", "Grandes cultures"],
  Lin: ["Grandes cultures"],
  Soja: ["Graines protéagineuses", "Grandes cultures"],
  // Légumineuses
  Pois: ["Graines protéagineuses", "Légumineuses potagères (sèches)"],
  Haricots: [
    "Haricots et Pois non écossés frais",
    "Haricots et Pois écossés frais",
    // Libellés usuels des décisions Article 53, distincts des libellés E-Phy.
    "Haricot vert",
    "Flageolet",
    "Haricot sec",
  ],
  // Fruits à pépins
  Pommier: ["Fruits à pépins", "Cultures fruitières"],
  Poirier: ["Fruits à pépins", "Cultures fruitières"],
  // Fruits à noyau
  "Pêcher - Abricotier": ["Fruits à noyau", "Cultures fruitières"],
  Cerisier: ["Fruits à noyau", "Cultures fruitières"],
  Prunier: ["Fruits à noyau", "Cultures fruitières"],
  // Fruits à coque
  Amandier: ["Fruits à coque", "Cultures fruitières"],
  Noyer: ["Fruits à coque", "Cultures fruitières"],
  Noisetier: ["Fruits à coque", "Cultures fruitières"],
  Pistachier: ["Fruits à coque", "Cultures fruitières"],
  // Petits fruits
  Kiwi: ["Cultures fruitières"],
  Groseillier: ["Cassissier", "Cultures fruitières"],
  Myrtillier: ["Cassissier", "Cultures fruitières"],
  "Sureau noir": ["Cassissier", "Cultures fruitières"],
  Mûrier: ["Cassissier", "Cultures fruitières"],
  Airelle: ["Cassissier", "Cultures fruitières"],
  "Églantier-cynorhodon": ["Cassissier", "Cultures fruitières"],
  Azérolier: ["Cassissier", "Cultures fruitières"],
  // Portée CL, et non CF : annexe 1 de l'arrêté du 12/04/2021,
  // modifiée le 31/03/2025. Le classement LMR « baies et petits fruits »
  // n'est pas une équivalence de portée des usages phytopharmaceutiques.
  Fraisier: ["Cultures légumières"],
  Framboisier: ["Petit fruits", "Petits fruits", "Cultures fruitières"],
  Cassissier: ["Petit fruits", "Petits fruits", "Cultures fruitières"],
  "Mûres (Rubus sp.)": ["Framboisier", "Cultures fruitières"],
  "Mûrier des haies": ["Framboisier", "Cultures fruitières"],
  // Agrumes
  Agrumes: ["Cultures fruitières"],
  // Légumes
  "Tomate - Aubergine": ["Cultures légumières", "Cultures maraîchères"],
  Poivron: ["Cultures légumières", "Cucurbitacées à peau comestible"],
  Laitue: ["Cultures légumières"],
  Carotte: ["Cultures légumières"],
  Oignon: ["Cultures légumières"],
  Poireau: ["Cultures légumières"],
  "Pomme de terre": ["Cultures légumières"],
  Artichaut: ["Cultures légumières"],
  Cardon: ["Artichaut", "Cultures légumières"],
  Asperge: ["Cultures légumières"],
  Epinard: ["Cultures légumières"],
  "Feuilles de bettes": ["Epinard", "Cultures légumières"],
  Pourpier: ["Epinard", "Cultures légumières"],
  Pissenlit: ["Chicorées - Production de chicons", "Cultures légumières"],
  "Barbe de capucin": [
    "Chicorées - Production de chicons",
    "Cultures légumières",
  ],
  "Céleri branche": ["Céleri-branche", "Cultures légumières"],
  Fenouil: ["Céleri-branche", "Cultures légumières"],
  Rhubarbe: ["Céleri-branche", "Cultures légumières"],
  "Céleri-rave": ["Carotte", "Cultures légumières"],
  Panais: ["Carotte", "Cultures légumières"],
  Raifort: ["Carotte", "Cultures légumières"],
  Topinambour: ["Carotte", "Cultures légumières"],
  "Persil à grosse racine": ["Carotte", "Cultures légumières"],
  Salsifis: ["Carotte", "Cultures légumières"],
  Scorsonère: ["Carotte", "Cultures légumières"],
  "Chou vert": ["Choux feuillus", "Cultures légumières"],
  "Chou chinois": ["Choux feuillus", "Cultures légumières"],
  "Chou de Bruxelles": ["Choux pommés", "Cultures légumières"],
  Brocoli: ["Choux à inflorescence", "Cultures légumières"],
  "Chou-fleur": ["Choux à inflorescence", "Cultures légumières"],
  Radis: ["Navet", "Cultures légumières"],
  Rutabaga: ["Navet", "Cultures légumières"],
  Ail: ["Oignon", "Cultures légumières"],
  Échalote: ["Oignon", "Cultures légumières"],
  "Oignon de printemps": ["Poireau", "Cultures légumières"],
  Piment: ["Poivron", "Cultures légumières"],
  // Cucurbitacées
  Concombre: ["Cucurbitacées à peau comestible", "Cultures légumières"],
  Courgette: ["Cucurbitacées à peau comestible", "Cultures légumières"],
  Melon: ["Cucurbitacées à peau non comestible", "Cultures légumières"],
  Pastèque: ["Cucurbitacées à peau non comestible", "Cultures légumières"],
  // Prairies et fourrages
  Prairies: ["Graminées fourragères", "Légumineuses fourragères"],
  "Gazons de graminées": ["Graminées fourragères"],
};

/** Normalise les libellés E‑Phy pour les comparer sans casse ni accent. */
export function normalizeCultureName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Synonymes de saisie, distincts des groupes réglementaires directionnels. */
const CULTURE_SYNONYMS: Readonly<Record<string, string>> = {
  fraise: "Fraisier",
  fraises: "Fraisier",
  fraisiers: "Fraisier",
};

function getCultureAliasKey(culture: string): string | undefined {
  const normalizedCulture = normalizeCultureName(culture);
  const synonym = CULTURE_SYNONYMS[normalizedCulture];
  if (synonym) return synonym;
  return Object.keys(CULTURE_ALIASES).find(
    (key) => normalizeCultureName(key) === normalizedCulture,
  );
}

/**
 * Retourne l'ensemble des cultures à rechercher pour une culture donnée :
 * la culture elle-même + les portées plus larges explicitement renseignées.
 * La correspondance est directionnelle, sans inversion ni fermeture transitive :
 * Fraisier → Cultures légumières n'autorise pas Tomate → Fraisier.
 * Ce jeu de libellés ne valide pas les conditions d'un usage.
 */
export function getCultureSearchSet(culture: string): Set<string> {
  const key = getCultureAliasKey(culture);
  const set = new Set<string>([culture.trim()]);
  if (key) set.add(key);
  const aliases = key ? CULTURE_ALIASES[key] : [];
  aliases.forEach((a) => set.add(a));
  return set;
}

/**
 * Compare un libellé de culture E‑Phy avec une recherche utilisateur et ses
 * alias, sans être sensible aux différences de casse ou d’accent.
 */
export function cultureMatchesSearch(
  culture: string | undefined,
  searchCulture: string,
): boolean {
  if (!culture || !searchCulture.trim()) return false;
  const normalizedCulture = normalizeCultureName(
    CULTURE_SYNONYMS[normalizeCultureName(culture)] ?? culture,
  );
  return Array.from(getCultureSearchSet(searchCulture)).some(
    (candidate) => normalizeCultureName(candidate) === normalizedCulture,
  );
}

/**
 * Noms courants qui ne figurent pas tels quels dans E-Phy mais qui
 * correspondent à une culture E-Phy via CULTURE_ALIASES.
 * Clé = nom courant affiché à l'utilisateur
 * Valeur = culture E-Phy réelle utilisée pour la recherche
 *
 * Utilisé pour l'autocomplete : taper "Colza" propose "Crucifères oléagineuses"
 * avec le libellé "Colza (Crucifères oléagineuses)".
 */
export const CULTURE_DISPLAY_NAMES: Record<string, string> = {
  // Oléagineux
  Colza: "Crucifères oléagineuses",
  Moutarde: "Crucifères oléagineuses",
  // Légumineuses / protéagineux
  Féverole: "Graines protéagineuses",
  Feverole: "Graines protéagineuses",
  "Pois chiche": "Légumineuses potagères (sèches)",
  Lentille: "Légumineuses potagères (sèches)",
  Lupin: "Graines protéagineuses",
  // Céréales à paille (déjà dans E-Phy, mais alias utiles pour la recherche)
  // Fruits
  Pomme: "Fruits à pépins",
  Poire: "Fruits à pépins",
  Pêche: "Fruits à noyau",
  Abricot: "Fruits à noyau",
  Cerise: "Fruits à noyau",
  Prune: "Fruits à noyau",
  Amande: "Fruits à coque",
  Noix: "Fruits à coque",
  Noisette: "Fruits à coque",
  Fraise: "Fraisier",
  Framboise: "Framboisier",
  Cassis: "Cassissier",
  Groseille: "Cassissier",
  Groseilles: "Cassissier",
  Groseillier: "Cassissier",
  Myrtille: "Cassissier",
  Pissenlit: "Chicorées - Production de chicons",
  "Barbe de capucin": "Chicorées - Production de chicons",
  // Légumes
  Tomate: "Tomate - Aubergine",
  Aubergine: "Tomate - Aubergine",
  Courgette: "Cucurbitacées à peau comestible",
  Concombre: "Cucurbitacées à peau comestible",
  Melon: "Cucurbitacées à peau non comestible",
  Pastèque: "Cucurbitacées à peau non comestible",
  Betterave: "Betterave industrielle et fourragère",
  Chou: "Choux",
  "Chou-fleur": "Choux à inflorescence",
  Brocoli: "Choux à inflorescence",
  "Chou de Bruxelles": "Choux feuillus",
  "Chou cabus": "Choux pommés",
  Chicorée: "Chicorées - Production de chicons",
  Endive: "Chicorées - Production de chicons",
  Celeri: "Céleris",
  Céleri: "Céleris",
  Persil: "Fines Herbes",
  Ciboulette: "Fines Herbes",
  Basilic: "Fines Herbes",
  Sauge: "Fines Herbes",
  Thym: "Fines Herbes",
  Menthe: "Fines Herbes",
  Navet: "Navet",
  // Vigne
  Raisin: "Vigne",
  // Grandes cultures
  Tournesol: "Tournesol",
  Lin: "Lin",
  Soja: "Soja",
  Chanvre: "Chanvre",
  Riz: "Riz",
  Sorgho: "Sorgho",
  Sarrasin: "Sarrasin",
};

/**
 * Type représentant une suggestion de culture dans l'autocomplete.
 * - `value` : la culture E-Phy réelle utilisée pour la recherche
 * - `label` : le libellé affiché à l'utilisateur (peut inclure le nom courant)
 */
export type CultureSuggestion = {
  value: string; // culture E-Phy réelle
  label: string; // libellé affiché
};

/**
 * Retourne les suggestions de cultures pour une saisie donnée.
 * Combine :
 * 1. Les cultures E-Phy directes (ex: "Blé", "Vigne")
 * 2. Les noms courants avec leur équivalent E-Phy (ex: "Colza" → "Crucifères oléagineuses")
 *
 * @param query - Saisie de l'utilisateur
 * @param allCultures - Liste des cultures E-Phy disponibles dans les données
 * @param limit - Nombre maximum de suggestions
 */
export function getCultureSuggestions(
  query: string,
  allCultures: string[],
  limit = 10,
): CultureSuggestion[] {
  if (!query.trim() || query.trim().length < 2) return [];

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const q = normalize(query);

  const results: CultureSuggestion[] = [];
  const seen = new Set<string>(); // éviter les doublons sur la valeur E-Phy

  // 1. Cultures E-Phy directes qui matchent la saisie
  for (const culture of allCultures) {
    if (normalize(culture).includes(q)) {
      if (!seen.has(culture)) {
        seen.add(culture);
        results.push({ value: culture, label: culture });
      }
    }
  }

  // 2. Noms courants qui matchent la saisie
  for (const [displayName, ePhyCulture] of Object.entries(
    CULTURE_DISPLAY_NAMES,
  )) {
    if (normalize(displayName).includes(q)) {
      // Vérifier que la culture E-Phy existe dans les données
      if (allCultures.includes(ePhyCulture) && !seen.has(ePhyCulture)) {
        seen.add(ePhyCulture);
        results.push({
          value: ePhyCulture,
          label: `${displayName} \u2192 ${ePhyCulture}`,
        });
      }
    }
  }

  return results.slice(0, limit);
}
