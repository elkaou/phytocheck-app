import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  EmergencyAuthorization,
  getEmergencyAuthorizationDaysRemaining,
  isEmergencyAuthorizationActive,
} from "./emergency-authorizations";
import type { StockItem } from "./store";

const STORAGE_KEY = "@phytocheck/article53_stock_alert_state";
const EXPIRY_WARNING_DAYS = 14;

export type StockEmergencyAuthorizationChangeType = "new" | "expiring" | "expired";

export interface StockEmergencyAuthorizationChange {
  type: StockEmergencyAuthorizationChangeType;
  authorization: EmergencyAuthorization;
}

export interface EmergencyAuthorizationAlertState {
  trackedAuthorizationIds: string[];
  expiringNotifiedIds: string[];
  expiredNotifiedIds: string[];
}

const EMPTY_STATE: EmergencyAuthorizationAlertState = {
  trackedAuthorizationIds: [],
  expiringNotifiedIds: [],
  expiredNotifiedIds: [],
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

export async function getEmergencyAuthorizationAlertState(): Promise<EmergencyAuthorizationAlertState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY_STATE;
    const state = parsed as Partial<EmergencyAuthorizationAlertState>;
    return {
      trackedAuthorizationIds: asStringArray(state.trackedAuthorizationIds),
      expiringNotifiedIds: asStringArray(state.expiringNotifiedIds),
      expiredNotifiedIds: asStringArray(state.expiredNotifiedIds),
    };
  } catch {
    return EMPTY_STATE;
  }
}

export async function saveEmergencyAuthorizationAlertState(
  state: EmergencyAuthorizationAlertState,
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Le contrôle réglementaire reste disponible même si la mémorisation locale échoue.
  }
}

/**
 * Détecte les nouvelles décisions Article 53 concernant le stock, les échéances
 * à 14 jours et les décisions devenues expirées depuis la dernière consultation.
 */
export function checkStockEmergencyAuthorizations(
  stock: StockItem[],
  authorizations: EmergencyAuthorization[],
  previousState: EmergencyAuthorizationAlertState = EMPTY_STATE,
  now: Date = new Date(),
): { changes: StockEmergencyAuthorizationChange[]; state: EmergencyAuthorizationAlertState } {
  const stockAmms = new Set(stock.map((item) => item.amm));
  const relevant = authorizations.filter((authorization) => stockAmms.has(authorization.amm));
  const active = relevant.filter((authorization) => isEmergencyAuthorizationActive(authorization, now));
  const tracked = new Set(previousState.trackedAuthorizationIds);
  const expiringNotified = new Set(previousState.expiringNotifiedIds);
  const expiredNotified = new Set(previousState.expiredNotifiedIds);
  const changes: StockEmergencyAuthorizationChange[] = [];

  for (const authorization of active) {
    const isNewAuthorization = !tracked.has(authorization.id);
    if (isNewAuthorization) {
      changes.push({ type: "new", authorization });
    }

    const remainingDays = getEmergencyAuthorizationDaysRemaining(authorization, now);
    if (
      remainingDays !== null &&
      remainingDays >= 0 &&
      remainingDays <= EXPIRY_WARNING_DAYS &&
      !isNewAuthorization &&
      !expiringNotified.has(authorization.id)
    ) {
      changes.push({ type: "expiring", authorization });
    }
    // Une nouvelle décision déjà proche de son échéance comporte la date dans
    // l'alerte « nouvelle autorisation » : ne pas afficher une seconde alerte.
    if (isNewAuthorization && remainingDays !== null && remainingDays <= EXPIRY_WARNING_DAYS) {
      expiringNotified.add(authorization.id);
    }
    tracked.add(authorization.id);
  }

  for (const authorization of relevant) {
    const remainingDays = getEmergencyAuthorizationDaysRemaining(authorization, now);
    if (
      tracked.has(authorization.id) &&
      remainingDays !== null &&
      remainingDays < 0 &&
      !expiredNotified.has(authorization.id)
    ) {
      changes.push({ type: "expired", authorization });
    }
  }

  for (const change of changes) {
    if (change.type === "expiring") expiringNotified.add(change.authorization.id);
    if (change.type === "expired") expiredNotified.add(change.authorization.id);
  }

  const order: Record<StockEmergencyAuthorizationChangeType, number> = {
    new: 0,
    expiring: 1,
    expired: 2,
  };
  changes.sort(
    (left, right) =>
      order[left.type] - order[right.type] ||
      left.authorization.expiresAt.localeCompare(right.authorization.expiresAt),
  );

  return {
    changes,
    state: {
      trackedAuthorizationIds: Array.from(tracked),
      expiringNotifiedIds: Array.from(expiringNotified),
      expiredNotifiedIds: Array.from(expiredNotified),
    },
  };
}

export async function checkSavedStockEmergencyAuthorizations(
  stock: StockItem[],
  authorizations: EmergencyAuthorization[],
  now: Date = new Date(),
): Promise<StockEmergencyAuthorizationChange[]> {
  const previousState = await getEmergencyAuthorizationAlertState();
  const result = checkStockEmergencyAuthorizations(stock, authorizations, previousState, now);
  await saveEmergencyAuthorizationAlertState(result.state);
  return result.changes;
}
