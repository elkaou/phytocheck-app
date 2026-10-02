import { describe, expect, it } from "vitest";

import { EmergencyAuthorization } from "../lib/emergency-authorizations";
import {
  checkStockEmergencyAuthorizations,
  EmergencyAuthorizationAlertState,
} from "../lib/emergency-stock-check";
import type { StockItem } from "../lib/store";

const stock: StockItem[] = [
  {
    amm: "2260551",
    nom: "AVADEX FACTOR",
    classification: "homologue",
    dateAjout: "2026-09-01T00:00:00.000Z",
    titulaire: "Titulaire",
    fonctions: "Herbicide",
    etat: "AUTORISE",
    quantite: 2,
    unite: "L",
  },
];

const authorization: EmergencyAuthorization = {
  id: "article53-test-1",
  amm: "2260551",
  productName: "AVADEX FACTOR",
  cultures: "Céréales à paille",
  purpose: "Désherbage",
  activeSubstances: "Tri-allate",
  issuedAt: "2026-09-23",
  expiresAt: "2027-01-21",
  decisionPdfUrl: "https://agriculture.gouv.fr/telecharger/156224",
  sourcePageUrl: "https://agriculture.gouv.fr/exemple",
  sourceRetrievedAt: "2026-10-02T10:00:00Z",
};

const emptyState: EmergencyAuthorizationAlertState = {
  trackedAuthorizationIds: [],
  expiringNotifiedIds: [],
  expiredNotifiedIds: [],
};

describe("checkStockEmergencyAuthorizations", () => {
  it("signale une nouvelle décision puis son échéance et son expiration, une seule fois chacune", () => {
    const first = checkStockEmergencyAuthorizations(stock, [authorization], emptyState, new Date(2026, 9, 2));
    expect(first.changes.map((change) => change.type)).toEqual(["new"]);
    expect(first.state.trackedAuthorizationIds).toEqual([authorization.id]);

    const expiring = checkStockEmergencyAuthorizations(
      stock,
      [authorization],
      first.state,
      new Date(2027, 0, 10),
    );
    expect(expiring.changes.map((change) => change.type)).toEqual(["expiring"]);

    const expired = checkStockEmergencyAuthorizations(
      stock,
      [authorization],
      expiring.state,
      new Date(2027, 0, 22),
    );
    expect(expired.changes.map((change) => change.type)).toEqual(["expired"]);

    const repeated = checkStockEmergencyAuthorizations(
      stock,
      [authorization],
      expired.state,
      new Date(2027, 0, 23),
    );
    expect(repeated.changes).toEqual([]);
  });

  it("ne double pas une alerte de nouvelle décision déjà à moins de 14 jours de l’échéance", () => {
    const nearExpiry = { ...authorization, id: "article53-test-2", expiresAt: "2026-10-12" };
    const result = checkStockEmergencyAuthorizations(stock, [nearExpiry], emptyState, new Date(2026, 9, 2));

    expect(result.changes.map((change) => change.type)).toEqual(["new"]);
    expect(result.state.expiringNotifiedIds).toEqual([nearExpiry.id]);
  });

  it("ignore une décision qui ne concerne aucun produit du stock", () => {
    const unrelated = { ...authorization, amm: "1234567" };
    const result = checkStockEmergencyAuthorizations(stock, [unrelated], emptyState, new Date(2026, 9, 2));

    expect(result.changes).toEqual([]);
  });
});
