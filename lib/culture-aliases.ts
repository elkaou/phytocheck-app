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
  "Blé":        ["Céréales à paille", "Céréales", "Grandes cultures"],
  "Orge":       ["Céréales à paille", "Céréales", "Grandes cultures"],
  "Seigle":     ["Céréales à paille", "Céréales", "Grandes cultures"],
  "Avoine":     ["Céréales à paille", "Céréales", "Grandes cultures"],
  "Triticale":  ["Céréales à paille", "Céréales", "Grandes cultures"],
  // Maïs
  "Maïs":       ["Céréales", "Grandes cultures"],
  "Maïs doux":  ["Céréales", "Grandes cultures"],
  // Oléagineux
  "Tournesol":  ["Grandes cultures"],
  "Colza":      ["Crucifères oléagineuses", "Grandes cultures"],
  "Lin":        ["Grandes cultures"],
  "Soja":       ["Graines protéagineuses", "Grandes cultures"],
  // Légumineuses
  "Pois":       ["Graines protéagineuses", "Légumineuses potagères (sèches)"],
  "Haricots":   ["Haricots et Pois non écossés frais", "Haricots et Pois écossés frais"],
  // Fruits à pépins
  "Pommier":    ["Fruits à pépins", "Cultures fruitières"],
  "Poirier":    ["Fruits à pépins", "Cultures fruitières"],
  // Fruits à noyau
  "Pêcher - Abricotier": ["Fruits à noyau", "Cultures fruitières"],
  "Cerisier":   ["Fruits à noyau", "Cultures fruitières"],
  "Prunier":    ["Fruits à noyau", "Cultures fruitières"],
  // Fruits à coque
  "Amandier":   ["Fruits à coque", "Cultures fruitières"],
  "Noyer":      ["Fruits à coque", "Cultures fruitières"],
  "Noisetier":  ["Fruits à coque", "Cultures fruitières"],
  "Pistachier": ["Fruits à coque", "Cultures fruitières"],
  // Petits fruits
  "Kiwi":       ["Cultures fruitières"],
  "Fraisier":   ["Petit fruits", "Petits fruits", "Cultures fruitières"],
  "Framboisier":["Petit fruits", "Petits fruits", "Cultures fruitières"],
  "Cassissier": ["Petit fruits", "Petits fruits", "Cultures fruitières"],
  // Agrumes
  "Agrumes":    ["Cultures fruitières"],
  // Légumes
  "Tomate - Aubergine": ["Cultures légumières", "Cultures maraîchères"],
  "Poivron":    ["Cultures légumières", "Cucurbitacées à peau comestible"],
  "Laitue":     ["Cultures légumières"],
  "Carotte":    ["Cultures légumières"],
  "Oignon":     ["Cultures légumières"],
  "Poireau":    ["Cultures légumières"],
  "Pomme de terre": ["Cultures légumières"],
  "Artichaut":  ["Cultures légumières"],
  "Asperge":    ["Cultures légumières"],
  "Epinard":    ["Cultures légumières"],
  // Cucurbitacées
  "Concombre":  ["Cucurbitacées à peau comestible", "Cultures légumières"],
  "Courgette":  ["Cucurbitacées à peau comestible", "Cultures légumières"],
  "Melon":      ["Cucurbitacées à peau non comestible", "Cultures légumières"],
  // Prairies et fourrages
  "Prairies":   ["Graminées fourragères", "Légumineuses fourragères"],
  "Gazons de graminées": ["Graminées fourragères"],
};

/**
 * Retourne l'ensemble des cultures à rechercher pour une culture donnée :
 * la culture elle-même + tous ses alias génériques.
 */
export function getCultureSearchSet(culture: string): Set<string> {
  const set = new Set<string>([culture]);
  const aliases = CULTURE_ALIASES[culture] || [];
  aliases.forEach(a => set.add(a));
  return set;
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
  "Colza":             "Crucifères oléagineuses",
  "Moutarde":          "Crucifères oléagineuses",
  // Légumineuses / protéagineux
  "Féverole":          "Graines protéagineuses",
  "Feverole":          "Graines protéagineuses",
  "Pois chiche":       "Légumineuses potagères (sèches)",
  "Lentille":          "Légumineuses potagères (sèches)",
  "Lupin":             "Graines protéagineuses",
  // Céréales à paille (déjà dans E-Phy, mais alias utiles pour la recherche)
  // Fruits
  "Pomme":             "Fruits à pépins",
  "Poire":             "Fruits à pépins",
  "Pêche":             "Fruits à noyau",
  "Abricot":           "Fruits à noyau",
  "Cerise":            "Fruits à noyau",
  "Prune":             "Fruits à noyau",
  "Amande":            "Fruits à coque",
  "Noix":              "Fruits à coque",
  "Noisette":          "Fruits à coque",
  "Fraise":            "Fraisier",
  "Framboise":         "Framboisier",
  "Cassis":            "Cassissier",
  // Légumes
  "Tomate":            "Tomate - Aubergine",
  "Aubergine":         "Tomate - Aubergine",
  "Courgette":         "Cucurbitées à peau comestible",
  "Concombre":         "Cucurbitées à peau comestible",
  "Melon":             "Cucurbitées à peau non comestible",
  "Pastèque":          "Cucurbitées à peau non comestible",
  "Betterave":         "Betterave industrielle et fourragère",
  "Chou":              "Choux",
  "Chou-fleur":        "Choux à inflorescence",
  "Brocoli":           "Choux à inflorescence",
  "Chou de Bruxelles": "Choux feuillus",
  "Chou cabus":        "Choux pommés",
  "Chicorée":          "Chicorées - Production de chicons",
  "Endive":            "Chicorées - Production de chicons",
  "Celeri":            "Céleris",
  "Céleri":            "Céleris",
  "Persil":            "Fines herbes",
  "Ciboulette":        "Fines herbes",
  "Basilic":           "Fines herbes",
  "Navet":             "Navet",
  // Vigne
  "Raisin":            "Vigne",
  // Grandes cultures
  "Tournesol":         "Tournesol",
  "Lin":               "Lin",
  "Soja":              "Soja",
  "Chanvre":           "Chanvre",
  "Riz":               "Riz",
  "Sorgho":            "Sorgho",
  "Sarrasin":          "Sarrasin",
};

/**
 * Type représentant une suggestion de culture dans l'autocomplete.
 * - `value` : la culture E-Phy réelle utilisée pour la recherche
 * - `label` : le libellé affiché à l'utilisateur (peut inclure le nom courant)
 */
export type CultureSuggestion = {
  value: string;  // culture E-Phy réelle
  label: string;  // libellé affiché
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
  limit = 10
): CultureSuggestion[] {
  if (!query.trim() || query.trim().length < 2) return [];

  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
  for (const [displayName, ePhyCulture] of Object.entries(CULTURE_DISPLAY_NAMES)) {
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
