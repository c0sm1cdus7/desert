import "../../tests/support/upgrade-vault.ts";
import { expect, it } from "vitest";
import { home, open, program, seed, matches } from "../../tests/support/upgrade-support.ts";

it("keeps calculation rebuild notices with the house diagnostics, once and without an action failure", async () => {
  const path = home();
  await seed(path);
  const current = program("shop/2", 2);
  const house = open(path, current);
  const notices = () =>
    house.journal.replay<string[]>([], (all, event) =>
      event.kind === "tool-entry" && event.data.diagnostic?.startsWith("SAVED_FOLD_REBUILT")
        ? [...all, event.data.diagnostic]
        : all,
    );
  let count = 0;
  try {
    expect(notices()).toHaveLength(2);
    expect(notices().every(text => text.includes("calculation version changed"))).toBe(true);
    count = notices().length;
    matches(house, current);
  } finally {
    house.close();
  }
  const again = open(path, current);
  try {
    expect(
      again.journal.replay(
        0,
        (n, event) =>
          n + Number(event.kind === "tool-entry" && !!event.data.diagnostic?.startsWith("SAVED_FOLD_REBUILT")),
      ),
    ).toBe(count);
    matches(again, current);
  } finally {
    again.close();
  }
});
