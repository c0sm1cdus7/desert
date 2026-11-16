import "../../tests/support/upgrade-vault.ts";
import { afterEach, expect, it, vi } from "vitest";
import { home, open, program, seed } from "../../tests/support/upgrade-support.ts";
const versions = vi.hoisted(() => ({ base: "desert/1" }));
vi.mock("./projection-version.ts", async importOriginal => {
  const levers = await importOriginal<typeof import("./projection-version.ts")>();
  return {
    ...levers,
    get baseProjectionVersion() {
      return versions.base;
    },
  };
});
afterEach(() => {
  versions.base = "desert/1";
});

it("invalidates both projections when only the base calculation version changes", async () => {
  const path = home();
  await seed(path);
  versions.base = "desert/2";
  let folds = 0;
  const house = open(
    path,
    program("shop/1", 2, () => folds++),
  );
  try {
    expect(folds).toBe(1);
    expect(house.tools.state().tools.sales.get("s1")?.total).toBe(20);
  } finally {
    house.close();
  }
});
