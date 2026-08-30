export type LegalDocumentId = "terms" | "privacy";

export type LegalDocumentConfig = {
  id: LegalDocumentId;
  title: string;
  url: string;
  cacheKey: string;
};

const GITHUB_PAGES_BASE_URL = "https://elkaou.github.io/phytocheck-app";

export const LEGAL_DOCUMENTS: Record<LegalDocumentId, LegalDocumentConfig> = {
  terms: {
    id: "terms",
    title: "Conditions d’Utilisation",
    url: `${GITHUB_PAGES_BASE_URL}/terms-of-service.html`,
    cacheKey: "@phytocheck/legal-document/terms-v1",
  },
  privacy: {
    id: "privacy",
    title: "Politique de confidentialité",
    url: `${GITHUB_PAGES_BASE_URL}/privacy-policy.html`,
    cacheKey: "@phytocheck/legal-document/privacy-v1",
  },
};

/** Vérifie qu'une réponse distante peut être affichée en toute sécurité dans le lecteur HTML. */
export function isValidLegalDocumentHtml(value: string | null): value is string {
  if (!value || value.trim().length < 100) return false;
  return /<html\b/i.test(value) && /<body\b/i.test(value);
}
