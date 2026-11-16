// A long batch costs one copy of the folds, not one per fact: each fact appended inside it is a nested batch that keeps
// its way back by reference, since a fold replaces its state and never changes the one it read.
import { afterEach, expect, it, vi } from "vitest";
import { join } from "node:path";
import { home, open, sale, watch } from "../../../tests/support/storage-rig.ts";
import { ProjectionCache } from "../../journal/projections.ts";
afterEach(() => vi.restoreAllMocks());
it("copies the folds once per outermost batch, whatever it appends, and a nested failure still restores them", () => {
  const journal = open(join(home(), "journal.sqlite"));
  const names = watch(journal);
  journal.restore();
  const marks = vi.spyOn(ProjectionCache.prototype, "mark");
  journal.batch(() => {
    for (let n = 0; n < 200; n++) journal.append(sale(`s${n}`), 100);
    expect(() =>
      journal.batch(() => {
        journal.append(sale("inner"), 100);
        throw new Error("inner");
      }),
    ).toThrow("inner");
  });
  expect(marks.mock.calls.length).toBeGreaterThan(200);
  expect(marks.mock.calls.filter(([copy]) => copy !== false)).toHaveLength(1);
  expect(names()).toHaveLength(200);
  expect(names()).not.toContain("inner");
  journal.close();
});
