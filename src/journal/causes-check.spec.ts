import { expect, it } from "vitest";
import { journalCauses, closeWithCauses } from "../../tests/support/journal-causes.ts";

it("the full-journal check rejects absent causes for every author and kind", () => {
  for (const kind of ["woke", "act", "sale-registered", "tool-entry"]) {
    expect(() => journalCauses([{ id: "effect", kind, cause: ["absent"] }])).toThrow();
  }
  expect(() =>
    journalCauses([
      { id: "origin", kind: "boot", cause: [] },
      { id: "effect", kind: "woke", cause: ["origin"] },
    ]),
  ).not.toThrow();
});

it("closing checks once and releases the house even when a cause is absent", () => {
  let closed = 0;
  const close = closeWithCauses(
    () => closed++,
    () => [{ id: "effect", kind: "woke", cause: ["absent"] }],
  );
  expect(close).toThrow();
  expect(closed).toBe(1);
  close();
  expect(closed).toBe(1);
});
