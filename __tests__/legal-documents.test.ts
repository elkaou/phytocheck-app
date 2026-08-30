import { describe, expect, it } from "vitest";

import { isValidLegalDocumentHtml, LEGAL_DOCUMENTS } from "../lib/legal-documents";

describe("legal documents", () => {
  it("uses the two GitHub Pages legal-document URLs", () => {
    expect(LEGAL_DOCUMENTS.terms.url).toBe("https://elkaou.github.io/phytocheck-app/terms-of-service.html");
    expect(LEGAL_DOCUMENTS.privacy.url).toBe("https://elkaou.github.io/phytocheck-app/privacy-policy.html");
  });

  it("accepts a complete HTML document and rejects invalid cached content", () => {
    expect(isValidLegalDocumentHtml("<html><body>" + "Texte légal ".repeat(20) + "</body></html>")).toBe(true);
    expect(isValidLegalDocumentHtml("Erreur réseau")).toBe(false);
    expect(isValidLegalDocumentHtml(null)).toBe(false);
  });
});
