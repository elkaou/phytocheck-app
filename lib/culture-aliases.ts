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
