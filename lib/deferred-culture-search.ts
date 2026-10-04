import type { CultureSearchIndex } from "./culture-search";

type ScheduleWork = (work: () => void) => void;

/**
 * Retarde la construction de l'index culture jusqu'à son premier besoin.
 * La recherche par nom/AMM peut ainsi s'ouvrir sans parcourir les usages E‑Phy.
 */
export function createDeferredCultureSearchIndex(
  buildIndex: () => CultureSearchIndex,
  scheduleWork: ScheduleWork = (work) => setTimeout(work, 0),
) {
  let readyIndex: CultureSearchIndex | null = null;
  let pendingIndex: Promise<CultureSearchIndex> | null = null;

  return {
    isReady() {
      return readyIndex !== null;
    },
    getIfReady() {
      return readyIndex;
    },
    prepare() {
      if (readyIndex) return Promise.resolve(readyIndex);
      if (pendingIndex) return pendingIndex;

      pendingIndex = new Promise<CultureSearchIndex>((resolve) => {
        scheduleWork(() => {
          readyIndex = buildIndex();
          pendingIndex = null;
          resolve(readyIndex);
        });
      });
      return pendingIndex;
    },
  };
}
