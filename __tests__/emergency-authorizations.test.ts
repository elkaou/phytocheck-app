import { describe, expect, it } from "vitest";

import {
  EmergencyAuthorization,
  getEmergencyAuthorizationDaysRemaining,
  getEmergencyAuthorizationsForAmm,
  getEmergencyAuthorizationsForCulture,
  isEmergencyAuthorizationActive,
} from "../lib/emergency-authorizations";

const authorization: EmergencyAuthorization = {
  id: "article53-test-1",
  amm: "2260551",
  productName: "AVADEX FACTOR",
  cultures: "Céréales à paille (orge, blé, triticale, seigle, avoine)",
  purpose: "Désherbage",
  activeSubstances: "Tri-allate",
  issuedAt: "2026-09-23",
  expiresAt: "2027-01-21",
  decisionPdfUrl: "https://agriculture.gouv.fr/telecharger/156224",
  sourcePageUrl: "https://agriculture.gouv.fr/exemple",
  sourceRetrievedAt: "2026-10-02T10:00:00Z",
};

describe("emergency authorizations", () => {
  it("considère la délivrance et l'échéance comme des jours inclusifs", () => {
    expect(isEmergencyAuthorizationActive(authorization, new Date(2026, 8, 22))).toBe(false);
    expect(isEmergencyAuthorizationActive(authorization, new Date(2026, 8, 23))).toBe(true);
    expect(isEmergencyAuthorizationActive(authorization, new Date(2027, 0, 21))).toBe(true);
    expect(isEmergencyAuthorizationActive(authorization, new Date(2027, 0, 22))).toBe(false);
    expect(getEmergencyAuthorizationDaysRemaining(authorization, new Date(2027, 0, 21))).toBe(0);
  });

  it("trouve une décision par AMM uniquement pendant sa période de validité", () => {
    expect(getEmergencyAuthorizationsForAmm([authorization], "2260551", new Date(2026, 9, 2))).toEqual([
      authorization,
    ]);
    expect(getEmergencyAuthorizationsForAmm([authorization], "2260551", new Date(2027, 1, 1))).toEqual([]);
  });

  it("n'affiche plus une décision retirée de la publication ministérielle", () => {
    const historical = { ...authorization, sourceStatus: "historical" as const };

    expect(isEmergencyAuthorizationActive(historical, new Date(2026, 9, 2))).toBe(false);
    expect(getEmergencyAuthorizationsForAmm([historical], "2260551", new Date(2026, 9, 2))).toEqual([]);
  });

  it("trouve les cultures détaillées et leurs alias E-Phy", () => {
    expect(getEmergencyAuthorizationsForCulture([authorization], "Blé", new Date(2026, 9, 2))).toEqual([
      authorization,
    ]);
    expect(getEmergencyAuthorizationsForCulture([authorization], "Orge", new Date(2026, 9, 2))).toEqual([
      authorization,
    ]);
    expect(getEmergencyAuthorizationsForCulture([authorization], "Vigne", new Date(2026, 9, 2))).toEqual([]);
  });
});
