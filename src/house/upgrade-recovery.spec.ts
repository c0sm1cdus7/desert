import "../../tests/support/upgrade-vault.ts";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { expect, it } from "vitest";
import { shop, shopSlices } from "../../tests/support/shop.ts";
import { snapshotEvery } from "../storage/journal-store.ts";
import { home, matches, open, program, seed } from "../../tests/support/upgrade-support.ts";

it("does not certify a failed rebuild and retries it from history", async () => {
  const path = home();
  await seed(path);
  const db = new DatabaseSync(join(path, "journal.sqlite"));
  try {
    db.exec("delete from snapshots");
  } finally {
    db.close();
  }
  const broken = program("shop/2", 2, () => {
    throw new Error("synthetic fold failure");
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    expect(
      () => {
        const house = open(path, broken);
        house.close();
      },
      `rebuild attempt ${attempt + 1}`,
    ).toThrow();
  }
  const fixed = program("shop/2", 2);
  const house = open(path, fixed);
  try {
    expect(house.tools.state().tools.sales.get("s1")?.total).toBe(20);
    matches(house, fixed);
  } finally {
    house.close();
  }
});

it.each(["absent", "partial", "damaged"])("rebuilds a %s snapshot set after updating", async mode => {
  const path = home();
  await seed(path);
  const db = new DatabaseSync(join(path, "journal.sqlite"));
  try {
    if (mode === "absent") db.exec("delete from snapshots");
    else if (mode === "partial") db.exec("delete from snapshots where name like 'clock%'");
    else db.prepare("update snapshots set state = ?").run(new Uint8Array([0, 1, 2]));
  } finally {
    db.close();
  }
  const current = program("shop/2", 2);
  const house = open(path, current);
  try {
    expect(house.tools.state().tools.sales.get("s1")?.total).toBe(20);
    matches(house, current);
  } finally {
    house.close();
  }
});

it.each([snapshotEvery - 1, snapshotEvery, snapshotEvery + 1])(
  "rebuilds both sides of the periodic snapshot boundary at event %i",
  count => {
    const path = home();
    const first = open(path);
    try {
      while (first.tools.state().through < count) {
        const sale = `s${first.tools.state().through + 1}`;
        first.journal.append(shop.fact("sale-registered", { sale, total: 10 }, "ana"), 1000);
      }
    } finally {
      first.close();
    }
    const current = program("shop/2", 2);
    const house = open(path, current);
    try {
      expect([...house.tools.state().tools.sales.values()].every(sale => sale.total === 20)).toBe(true);
      matches(house, current);
    } finally {
      house.close();
    }
  },
);

it("folds two dependent parts with the same new version", () => {
  const path = home();
  const first = open(path);
  try {
    first.journal.batch(() => {
      first.journal.append(shop.fact("sale-registered", { sale: "s1", total: 10 }, "ana"), 1000);
      first.journal.append(
        shop.fact(
          "payment-received",
          {
            sale: "s1",
            payment: "p1",
            amount: 3,
          },
          "ana",
        ),
        1000,
      );
    });
  } finally {
    first.close();
  }
  const doubled = program("shop/2", 2);
  const payments: typeof shopSlices.step.payments = (state, event, before) => {
    const next = shopSlices.step.payments(state, event, before);
    return event.kind === "payment-received" ? { ...next, received: next.received + event.data.amount } : next;
  };
  const current = { ...doubled, slices: { ...doubled.slices, step: { ...doubled.slices.step, payments } } };
  const house = open(path, current);
  try {
    expect(house.tools.state().tools.sales.get("s1")).toMatchObject({ total: 20, paid: 3 });
    expect(house.tools.state().tools.payments).toEqual({ received: 6, unmatched: [] });
    matches(house, current);
  } finally {
    house.close();
  }
});
