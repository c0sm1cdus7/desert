import { afterEach, expect, it, vi } from "vitest";
import { zeroHouse } from "../../tests/support/zero-house.ts";
import { effect } from "./facts.ts";
import { baseProjectionVersion } from "../runtime/projection-version.ts";
const version = vi.hoisted((): { old: string | undefined } => ({ old: "desert/3" }));
vi.mock("../runtime/projection-version.ts", async importOriginal => {
  const original = await importOriginal<typeof import("../runtime/projection-version.ts")>();
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
// Rebuild earlier folds, including desert/10 before English core values.
it.each(["desert/3", "desert/4", "desert/6", "desert/8", "desert/9", "desert/10"])(
  "rebuilds %s saved folds and retains the first owner of an old wake id",
  old => {
    version.old = old;
    const rig = zeroHouse();
    rig.house().bus.emit(effect("wake-at", { id: "old-name", at: null }, "mind:desk"));
    rig.house().close();
    version.old = undefined;
    expect(baseProjectionVersion).toBe("desert/12");
    rig.restart();
    expect(
      rig
        .house()
        .storageNotices()
        .map(notice => notice.reason.includes("calculation version changed")),
    ).toEqual([true, true]);
    expect(rig.house().tools.state().wakeOwners.get("old-name")).toBe("mind:desk");
    expect(rig.house().tools.state().house.doors).toEqual({
      initialized: false,
      keys: new Map(),
      invitations: new Map(),
    });
    expect(
      rig.mind.startup().bus.emit({ layer: "house", kind: "wake-at", data: { id: "old-name", at: null } }).by,
    ).toBe("mind:desk");
  },
);
