import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocks
import {
  checkAndUpdateInBackground,
  loadCachedData,
  clearDataCache,
} from "@/lib/data-update-service";

describe("data-update-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    mockFetch.mockReset();
  });

  describe("cache-busting URLs", () => {
    it("should add _cb parameter to manifest URL when fetching", async () => {
      // Setup: no cache, so it should always fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            updated_at: "08/04/2026",
            products_count: 17136,
            risks_count: 2485,
          }),
      });
      // Products fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ amm: "123" }]),
      });
      // Risk phrases fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ "123": [{ code: "H300" }] }),
      });

      await new Promise<void>((resolve) => {
        checkAndUpdateInBackground(() => {
          resolve();
        }, "25/03/2026");
        // Fallback timeout
        setTimeout(resolve, 3000);
      });

      // Verify manifest URL has cache-buster
      const manifestCall = mockFetch.mock.calls[0];
      expect(manifestCall[0]).toContain("manifest.json");
      expect(manifestCall[0]).toContain("_cb=");

      // Verify products URL has cache-buster
      if (mockFetch.mock.calls.length >= 2) {
        const productsCall = mockFetch.mock.calls[1];
        expect(productsCall[0]).toContain("products.json");
        expect(productsCall[0]).toContain("_cb=");
      }
    });
  });

  describe("date comparison", () => {
    it("should detect update when remote date is newer than cached date", async () => {
      // Simulate cached version from 25/03/2026
      mockStorage["@phytocheck/remote_version"] = "25/03/2026";
      mockStorage["@phytocheck/last_remote_update"] = "0"; // Force re-check

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            updated_at: "08/04/2026",
            products_count: 17136,
            risks_count: 2485,
          }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ amm: "test" }]),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      let updateCalled = false;
      await new Promise<void>((resolve) => {
        checkAndUpdateInBackground(() => {
          updateCalled = true;
          resolve();
        }, "25/03/2026");
        setTimeout(resolve, 3000);
      });

      expect(updateCalled).toBe(true);
      expect(mockStorage["@phytocheck/remote_version"]).toBe("08/04/2026");
    });

    it("should NOT trigger update when remote date equals cached date", async () => {
      mockStorage["@phytocheck/remote_version"] = "08/04/2026";
      mockStorage["@phytocheck/last_remote_update"] = "0"; // Force re-check

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            updated_at: "08/04/2026",
            products_count: 17136,
            risks_count: 2485,
          }),
      });

      let updateCalled = false;
      await new Promise<void>((resolve) => {
        checkAndUpdateInBackground(() => {
          updateCalled = true;
        }, "25/03/2026");
        setTimeout(resolve, 2000);
      });

      expect(updateCalled).toBe(false);
    });
  });

  describe("loadCachedData", () => {
    it("should return null when no cache exists", async () => {
      const result = await loadCachedData();
      expect(result).toBeNull();
    });

    it("should return cached data when available", async () => {
      mockStorage["@phytocheck/remote_products"] = JSON.stringify([{ amm: "123" }]);
      mockStorage["@phytocheck/remote_risk_phrases"] = JSON.stringify({ "123": [] });
      mockStorage["@phytocheck/remote_version"] = "08/04/2026";

      const result = await loadCachedData();
      expect(result).not.toBeNull();
      expect(result!.updatedAt).toBe("08/04/2026");
      expect(result!.products).toHaveLength(1);
    });
  });

  describe("clearDataCache", () => {
    it("should remove all cache keys", async () => {
      mockStorage["@phytocheck/remote_products"] = "data";
      mockStorage["@phytocheck/remote_risk_phrases"] = "data";
      mockStorage["@phytocheck/remote_version"] = "08/04/2026";
      mockStorage["@phytocheck/last_remote_update"] = "123";

      await clearDataCache();

      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(4);
    });
  });
});
