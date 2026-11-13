// Reproduction of the adversarial retry.mjs: a reducer mutates and then fails at the fourth fact.
import { join } from "node:path";
import { expect, it } from "vitest";
import { home, open, sale } from "../../../tests/support/storage-rig.ts";
it("restores the rollback mark by value and retries in the same instance without duplicating facts", () => {
  const file = join(home(), "journal.sqlite");
  const first = open(file);
  for (let n = 0; n < 5; n++) first.append(sale(`s${n}`), n);
  first.close();
  const journal = open(file);
  let failOnce = true;
  const state = journal.watch("list", { items: new Array<number>() }, (state, event) => {
    state.items.push(event.seq);
    if (event.seq === 4 && failOnce) {
      failOnce = false;
      throw new Error("transient");
    }
    return state;
  });
  expect(() => journal.restore()).toThrow("transient");
  expect(state()).toEqual({ items: [] });
  journal.append(sale("late"), 9);
  expect(state()).toEqual({ items: [1, 2, 3, 4, 5, 6] });
  expect(journal.replay(0, n => n + 1)).toBe(6);
  journal.close();
});

it("rolls back an in-place mutation during append after the instance already has state", () => {
  const file = join(home(), "journal.sqlite");
  const journal = open(file);
  let failOnce = true;
  const state = journal.watch("list", { items: new Array<number>() }, (state, event) => {
    state.items.push(event.seq);
    if (event.seq === 2 && failOnce) {
      failOnce = false;
      throw new Error("transient append");
    }
    return state;
  });
  journal.append(sale("first"), 0);
  expect(() => journal.append(sale("second"), 1)).toThrow("transient append");
  expect(state()).toEqual({ items: [1] });
  expect(journal.append(sale("second"), 1).seq).toBe(2);
  expect(state()).toEqual({ items: [1, 2] });
});
