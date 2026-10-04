import { describe, expect, it, vi } from "vitest";

import { prepareCultureFilterInteraction } from "@/lib/culture-filter-interaction";

describe("culture filter interaction", () => {
  it("ferme le clavier dans la même action que le filtre", () => {
    const dismissKeyboard = vi.fn();

    prepareCultureFilterInteraction(dismissKeyboard);

    expect(dismissKeyboard).toHaveBeenCalledTimes(1);
  });
});
