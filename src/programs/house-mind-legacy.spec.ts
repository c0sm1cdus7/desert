import "../../tests/support/fixture-vault.ts";
import { checkedHouse } from "../../tests/support/journal-causes.ts";
import { afterEach, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MemoryHouseKeys } from "../adapters/secrets/custody/house-keys.ts";
import { object } from "../catalogs/acts.ts";
import { effect } from "../journal/events.ts";
import { toolAct } from "../tools/act-definition.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { startHouse } from "./house-runtime.ts";
import { adapterProgram, imported, call } from "../../tests/support/declared-adapters.ts";
import { shop, shopRegistry, shopSlices, type ShopEvent } from "../../tests/support/shop.ts";
import { zeroMind } from "../../tests/support/zero-mind.ts";
const homes: string[] = [],
  houses: { close(): void }[] = [];
afterEach(() => {
  houses.splice(0).forEach(house => house.close());
  homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true }));
});
it("a prior identity named mind:vault leaves its credential to that mind when its kit is granted", async () => {
  const mind = zeroMind("vault", {
    use: toolAct(object({}), async (_, context) => {
      const current = context.credentials.current("signing");
      expect(current?.revision).toBe(1);
      expect(await call(context, "inspect", current?.refs)).toEqual({ valid: true });
      return { status: "accepted" };
    }),
  });
  const home = mkdtempSync(join(tmpdir(), "mind-legacy-"));
  homes.push(home);
  const options = {
    ...adapterProgram,
    by: "mind:vault",
    projectionVersion: "legacy-name/1",
    words: shop,
    slices: shopSlices,
    registry: [...shopRegistry, mind.tool],
    secretKeys: new MemoryHouseKeys(),
    creation: { admin: "ana", assignments: [{ identity: "mind:vault", tools: ["vault"] }] },
  };
  let bound: Promise<unknown> | undefined;
  // Seed the old record's exact actor/tool/target scope through real custody, without storing a fixture key.
  // These are the granted fact and credential a pre-mind identity left; today's fold ignores that grant.
  const legacy = {
    ...mind.tool,
    start: (ports: ReturnType<typeof mind.startup>) =>
      ports.bus.on("boot", () => {
        bound = imported(ports).then(refs => ports.bus.emit(ports.credentials.replace("signing", refs, 0)));
      }),
  };
  const previous = checkedHouse(startHouse(home, { ...options, registry: [...shopRegistry, legacy] }));
  houses.push(previous);
  await bound;
  previous.close();
  const current = checkedHouse(startHouse(home, options));
  houses.push(current);
  const facts = () => current.journal.replay<ShopEvent[]>([], (all, event) => [...all, event]);
  expect(facts().some(event => event.kind === "granted" && event.data.identity === "mind:vault")).toBe(true);
  expect(current.tools.state().house.grants.has("mind:vault")).toBe(false);
  expect(await mind.act("use")).toMatchObject({ status: "rejected", reason: toolTexts.unassigned });
  current.bus.emit(effect("kit-set", { holder: "mind:vault", tool: "vault", acts: ["use"] }, "ana"));
  expect(await mind.act("use")).toMatchObject({ status: "accepted" });
});
