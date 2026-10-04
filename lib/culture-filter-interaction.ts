/**
 * Ferme le clavier avant une action culture afin qu'il ne consomme pas le
 * premier appui sur les filtres horizontaux Android.
 */
export function prepareCultureFilterInteraction(dismissKeyboard: () => void): void {
  dismissKeyboard();
}
