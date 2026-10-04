import { describe, expect, it, vi } from "vitest";

import { createDeferredCultureSearchIndex } from "@/lib/deferred-culture-search";
import type { CultureSearchIndex } from "@/lib/culture-search";

function createIndex(): CultureSearchIndex {
  return {
    cultures: ["Orge"],
    search: () => ({ products: [], ciblesByAmm: new Map() }),
  };
}

describe("deferred culture search index", () => {
  it("ne construit rien tant que la recherche culture n'est pas demandée", () => {
    const buildIndex = vi.fn(createIndex);
    const deferred = createDeferredCultureSearchIndex(buildIndex);

    expect(buildIndex).not.toHaveBeenCalled();
    expect(deferred.isReady()).toBe(false);
    expect(deferred.getIfReady()).toBeNull();
  });

  it("partage une seule préparation planifiée entre les premiers appels", async () => {
    const buildIndex = vi.fn(createIndex);
    const queue: Array<() => void> = [];
    const deferred = createDeferredCultureSearchIndex(buildIndex, (work) => queue.push(work));

    const first = deferred.prepare();
    const second = deferred.prepare();

    expect(queue).toHaveLength(1);
    expect(buildIndex).not.toHaveBeenCalled();

    queue.shift()?.();
    await expect(first).resolves.toBe(await second);
    expect(buildIndex).toHaveBeenCalledTimes(1);
    expect(deferred.isReady()).toBe(true);
    expect(deferred.getIfReady()?.cultures).toEqual(["Orge"]);
  });
});
