export type CultureSearchLoadingFilter =
  | "Tous"
  | "Herbicide"
  | "Fongicide"
  | "Insecticide"
  | "Acaricide";

/** Formule le libellé de l'écran affiché pendant une recherche par culture. */
export function getCultureSearchLoadingDescription(
  cultureName: string,
  typeFilter: CultureSearchLoadingFilter,
): string {
  const culture = cultureName.trim() || "la culture sélectionnée";

  if (typeFilter === "Tous") {
    return `Recherche des produits autorisés pour ${culture}`;
  }

  return `Recherche des ${typeFilter.toLocaleLowerCase("fr-FR")}s autorisés pour ${culture}`;
}
