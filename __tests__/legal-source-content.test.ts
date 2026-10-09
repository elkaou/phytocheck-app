import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = resolve(__dirname, "..");
const legalFiles = [
  "TERMS_OF_SERVICE.md",
  "PRIVACY_POLICY.md",
  "docs/terms-of-service.html",
  "docs/privacy-policy.html",
  "app/terms-of-service.tsx",
  "app/privacy-policy.tsx",
];

function readProjectFile(relativePath: string) {
  return readFileSync(resolve(projectRoot, relativePath), "utf-8");
}

describe("sources et dates des documents légaux", () => {
  it("identifie les deux sources officielles dans chaque document légal", () => {
    for (const file of legalFiles) {
      const content = readProjectFile(file);
      expect(content, file).toMatch(/E[‑-]Phy|E-Phy/i);
      expect(content, file).toMatch(/agriculture\.gouv\.fr|Ministère de l(?:['’]|&apos;)Agriculture/i);
    }
  });

  it("affiche la date de révision du 9 octobre 2026 dans les documents", () => {
    for (const file of legalFiles) {
      expect(readProjectFile(file), file).toMatch(/9 octobre 2026/i);
    }
  });

  it("affiche les deux sources sur la carte À propos", () => {
    const about = readProjectFile("app/(tabs)/about.tsx");
    expect(about).toMatch(/E[‑-]Phy|E-Phy/i);
    expect(about).toContain("agriculture.gouv.fr");
  });
});
