import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock est remonté avant les imports : les données partagées doivent donc l’être aussi.
const mocks = vi.hoisted(() => {
  const fileBase = "file:///mock/";
  const mockStorage: Record<string, string> = {};
  const mockFiles: Record<string, string> = {};
  const mockDownloadAsync = vi.fn(async (url: string, destination: string) => {
    if (url.includes("products.json")) {
      mockFiles[destination] = JSON.stringify([{ amm: "123" }]);
    } else if (url.includes("risk-phrases.json")) {
      mockFiles[destination] = JSON.stringify({ "123": [{ code: "H300" }] });
    } else if (url.includes("usages.json")) {
      mockFiles[destination] = JSON.stringify({});
    } else if (url.includes("emergency-authorizations.json")) {
      mockFiles[destination] = JSON.stringify([]);
    }
    return { uri: destination, status: 200 };
  });
  return { fileBase, mockStorage, mockFiles, mockDownloadAsync };
});

const { fileBase: FILE_BASE, mockStorage, mockFiles, mockDownloadAsync } = mocks;
const PRODUCTS_PATH = `${FILE_BASE}phytocheck_products.json`;
const RISK_PHRASES_PATH = `${FILE_BASE}phytocheck_risk_phrases.json`;
const USAGES_PATH = `${FILE_BASE}phytocheck_usages.json`;

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mocks.mockStorage[key] ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      mocks.mockStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      delete mocks.mockStorage[key];
      return Promise.resolve();
    }),
  },
}));

vi.mock("expo-file-system/legacy", () => ({
  documentDirectory: mocks.fileBase,
  EncodingType: { UTF8: "utf8" },
  getInfoAsync: vi.fn((path: string) => Promise.resolve({ exists: path in mocks.mockFiles })),
  readAsStringAsync: vi.fn((path: string) => Promise.resolve(mocks.mockFiles[path] ?? "")),
  downloadAsync: mocks.mockDownloadAsync,
  moveAsync: vi.fn(({ from, to }: { from: string; to: string }) => {
    mocks.mockFiles[to] = mocks.mockFiles[from];
    delete mocks.mockFiles[from];
    return Promise.resolve();
  }),
  deleteAsync: vi.fn((path: string) => {
    delete mocks.mockFiles[path];
    return Promise.resolve();
  }),
}));

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  checkAndUpdateInBackground,
  clearDataCache,
  loadCachedData,
} from "@/lib/data-update-service";

function waitForBackgroundUpdate(bundleDate = "25/03/2026"): Promise<boolean> {
  return new Promise((resolve) => {
    checkAndUpdateInBackground(() => resolve(true), bundleDate);
    setTimeout(() => resolve(false), 3000);
  });
}

describe("data-update-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    Object.keys(mockFiles).forEach((key) => delete mockFiles[key]);
    mockFetch.mockReset();
  });

  it("ajoute un cache-buster au manifest et aux téléchargements E‑Phy", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        updated_at: "08/04/2026",
        products_count: 1,
        risks_count: 1,
      }),
    });

    expect(await waitForBackgroundUpdate()).toBe(true);

    expect(mockFetch.mock.calls[0][0]).toContain("manifest.json");
    expect(mockFetch.mock.calls[0][0]).toContain("_cb=");
    expect(mockDownloadAsync.mock.calls[0][0]).toContain("products.json");
    expect(mockDownloadAsync.mock.calls[0][0]).toContain("_cb=");
  });

  it("met à jour le cache quand la date distante est plus récente", async () => {
    mockStorage["@phytocheck/remote_version"] = "25/03/2026";
    mockStorage["@phytocheck/last_remote_update"] = "0";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        updated_at: "08/04/2026",
        products_count: 1,
        risks_count: 1,
      }),
    });

    expect(await waitForBackgroundUpdate()).toBe(true);
    expect(mockStorage["@phytocheck/remote_version"]).toBe("08/04/2026");
    expect(JSON.parse(mockFiles[PRODUCTS_PATH])).toEqual([{ amm: "123" }]);
  });

  it("ne télécharge pas E‑Phy quand la version et les fichiers locaux sont identiques", async () => {
    mockStorage["@phytocheck/remote_version"] = "08/04/2026";
    mockStorage["@phytocheck/last_remote_update"] = "0";
    mockFiles[PRODUCTS_PATH] = JSON.stringify([{ amm: "123" }]);
    mockFiles[USAGES_PATH] = JSON.stringify({});
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        updated_at: "08/04/2026",
        products_count: 1,
        risks_count: 1,
      }),
    });

    expect(await waitForBackgroundUpdate()).toBe(false);
    expect(mockDownloadAsync).not.toHaveBeenCalled();
  });

  it("charge les données E‑Phy depuis le cache de fichiers", async () => {
    mockStorage["@phytocheck/remote_version"] = "08/04/2026";
    mockFiles[PRODUCTS_PATH] = JSON.stringify([{ amm: "123" }]);
    mockFiles[RISK_PHRASES_PATH] = JSON.stringify({ "123": [] });
    mockFiles[USAGES_PATH] = JSON.stringify({ "123": [] });

    const result = await loadCachedData();

    expect(result).toMatchObject({ updatedAt: "08/04/2026" });
    expect(result?.products).toEqual([{ amm: "123" }]);
  });

  it("supprime les métadonnées et les fichiers réglementaires", async () => {
    mockStorage["@phytocheck/remote_version"] = "08/04/2026";
    mockStorage["@phytocheck/last_remote_update"] = "123";
    mockFiles[PRODUCTS_PATH] = "[]";

    await clearDataCache();

    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(3);
    expect(mockFiles[PRODUCTS_PATH]).toBeUndefined();
  });
});
