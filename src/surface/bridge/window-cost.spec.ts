// A count, not a timer, holds the cost of naming many old things.
import { expect, it } from "vitest";
import { windowVolume } from "../../../tests/support/window-volume.ts";
it.each([false, true])("enumerates each tool once for 5,000 objects and 200 notices, ticking clock: %s", ticking => {
  const volume = windowVolume(5_000, 200, ticking);
  try {
    expect(volume.menu().title).toBe("Menú");
    expect(volume.calls).toEqual({ sales: 1, payments: 1 });
    expect(volume.menu().title).toBe("Menú");
    const count = ticking ? 2 : 1;
    expect(volume.calls).toEqual({ sales: count, payments: count });
  } finally {
    volume.close();
  }
});

it("shows the stored cents when reading an old object", () => {
  const volume = windowVolume(50, 0);
  try {
    const reading = JSON.stringify(volume.old());
    expect(reading).toContain("$ 15,00");
    expect(reading).toContain("$ 0,00");
  } finally {
    volume.close();
  }
});
