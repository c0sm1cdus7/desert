import { mkdirSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { startHouse, localPorts } from "../../programs/house-runtime.ts";
import { shop, shopRegistry, shopSlices } from "../../../tests/support/shop.ts";
import { MemoryKeys } from "../../../tests/support/shop-rig.ts";
import { home, track } from "../../../tests/support/storage-rig.ts";

// This audit uses no secrets. Replace only the vault so no secrets.sqlite is opened.
vi.mock("../../adapters/secrets/secret-vault.ts", () => ({
  SecretVault: class {
    capture() {}
    scrub<T>(value: T): T {
      return value;
    }
    close() {}
  },
}));

it("A03: two accepted sales cannot reopen as only one sale", () => {
  const root = home();
  const real = join(root, "real");
  mkdirSync(real);
  const alias = join(root, "alias");
  symlinkSync(real, alias, "dir");
  const options = {
    by: "shop",
    creation: { admin: "ana", assignments: [{ identity: "ana", tools: ["sales", "payments"] }] },
    keys: new MemoryKeys(),
    words: shop,
    registry: shopRegistry,
    slices: shopSlices,
  };
  const time = { now: () => 1000, wait: () => () => {} };
  const first = track(startHouse(real, options, time));
  let second: typeof first | undefined;
  try {
    second = track(startHouse(alias, options, time));
  } catch (error) {
    expect(String(error)).toContain("already open");
  }
  const register = (running: typeof first, sale: string) => {
    const ports = localPorts(running, "ana", { recentLines: 20 });
    ports.act({ act: "attend", input: { target: "sales" } }, 0);
    const status = ports.act({ act: "register", target: "sales", input: { sale, total: 10 } }, 0).status;
    expect(status).toBe("accepted");
  };
  register(first, "left");
  if (second) register(second, "right");
  first.close();
  second?.close();
  const reopened = track(startHouse(real, options, time));
  const facts = reopened.journal.replay<string[]>([], (all, event) =>
    event.kind === "sale-registered" ? [...all, event.data.sale] : all,
  );
  const state = [...reopened.tools.state().tools.sales.keys()];
  console.log(JSON.stringify({ secondOpened: !!second, facts, state }));
  expect(state).toEqual(facts);
  expect(second).toBeUndefined();
});
