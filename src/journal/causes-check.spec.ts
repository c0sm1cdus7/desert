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

it("a socket act's request references are not facts; any other unknown cause still fails", () => {
  const act = { id: "act", kind: "act", cause: ['socket-request:["ana","a"]', `socket-content:${"0".repeat(64)}`] };
  expect(() => journalCauses([act])).not.toThrow();
  expect(() => journalCauses([{ ...act, cause: [...act.cause, "socket-other:x"] }])).toThrow();
});
