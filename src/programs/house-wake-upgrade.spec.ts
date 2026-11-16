import { afterEach, expect, it, vi } from "vitest";
import { zeroHouse } from "../../tests/support/zero-house.ts";
import { effect } from "../journal/events.ts";
import { baseProjectionVersion } from "../catalogs/levers.ts";
const version = vi.hoisted((): { old: string | undefined } => ({ old: "desert/3" }));
vi.mock("../catalogs/levers.ts", async importOriginal => {
  const original = await importOriginal<typeof import("../catalogs/levers.ts")>();
  return {
    ...original,
    get baseProjectionVersion() {
      return version.old ?? original.baseProjectionVersion;
    },
  };
});
afterEach(() => {
  version.old = "desert/3";
});
// desert/3 is the house before both; desert/4 the mind alone; desert/6 the kit alone. The union folds as desert/7.
it.each(["desert/3", "desert/4", "desert/6"])(
  "rebuilds %s saved folds and retains the first owner of an old wake id",
  old => {
    version.old = old;
    const rig = zeroHouse();
    rig.house().bus.emit(effect("wake-at", { id: "old-name", at: null }, "mind:desk"));
    rig.house().close();
    version.old = undefined;
    expect(baseProjectionVersion).toBe("desert/7");
    rig.restart();
    expect(
      rig
        .house()
        .storageNotices()
        .map(notice => notice.reason.includes("calculation version changed")),
    ).toEqual([true, true]);
    expect(rig.house().tools.state().wakeOwners.get("old-name")).toBe("mind:desk");
    expect(
      rig.mind.startup().bus.emit({ layer: "house", kind: "wake-at", data: { id: "old-name", at: null } }).by,
    ).toBe("mind:desk");
  },
);
