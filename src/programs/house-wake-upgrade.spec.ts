import { afterEach, expect, it, vi } from "vitest";
import { zeroHouse } from "../../tests/support/zero-house.ts";
import { effect } from "../journal/events.ts";
import { baseProjectionVersion } from "../catalogs/levers.ts";
const version = vi.hoisted(() => ({ old: true }));
vi.mock("../catalogs/levers.ts", async importOriginal => {
  const original = await importOriginal<typeof import("../catalogs/levers.ts")>();
  return {
    ...original,
    get baseProjectionVersion() {
      return version.old ? "desert/3" : original.baseProjectionVersion;
    },
  };
});
afterEach(() => {
  version.old = true;
});
it("rebuilds desert/3 saved folds and retains the first owner of an old wake id", () => {
  const rig = zeroHouse();
  rig.house().bus.emit(effect("wake-at", { id: "old-name", at: null }, "mind:desk"));
  rig.house().close();
  version.old = false;
  expect(baseProjectionVersion).not.toBe("desert/3");
  rig.restart();
  expect(rig.house().tools.state().wakeOwners.get("old-name")).toBe("mind:desk");
  expect(rig.mind.startup().bus.emit({ layer: "house", kind: "wake-at", data: { id: "old-name", at: null } }).by).toBe(
    "mind:desk",
  );
});
