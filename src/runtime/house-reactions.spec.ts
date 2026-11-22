// Reopens a reaction's real journal, recovers what is pending and keeps the confirmations.
import "../../tests/support/fixture-vault.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { effect } from "../house/facts.ts";
import { startHouse } from "./house-runtime.ts";
import { shop, shopRegistry, shopSlices, type ShopEvent } from "../../tests/support/shop.ts";
it("recovers from disk without thinking and does not notify again on rebuilding", async () => {
  const home = mkdtempSync(join(tmpdir(), "desert-reactions-"));
  const options = {
    by: "shop",
    projectionVersion: "shop/1",
    words: shop,
    registry: shopRegistry,
    slices: shopSlices,
    creation: { admin: "ana", assignments: [{ identity: "ana", tools: ["sales", "payments"] }] },
  };
  let house = startHouse(home, options);
  const entries = () => house.journal.replay<ShopEvent[]>([], (all, event) => [...all, event]);
  const notices = () =>
    entries().filter(e => e.kind === "tool-entry" && e.data.text === "Avisado · Pago sin venta · p1");
  try {
    house.bus.emit(effect("kit-set", { holder: "mind:payments", tool: "payments", acts: [] }, "ana"));
    house.bus.emit(shop.fact("payment-received", { payment: "p1", amount: 10 }, "ana"));
    await house.tools.recoverReactions();
    expect(house.tools.pendingReactions()[0]?.reason).toBe("fuera del kit");
    house.close();
    house = startHouse(home, options);
    expect(house.tools.pendingReactions()[0]?.reason).toBe("fuera del kit");
    house.bus.emit(effect("kit-set", { holder: "mind:payments", tool: "payments", acts: ["notice"] }, "ana"));
    // The runtime's scheduler, without an explicit recovery call, resumes the committed notice.
    await vi.waitFor(() => expect(notices()).toHaveLength(1));
    expect(notices()[0]?.by).toBe("mind:payments");
    house.close();
    house = startHouse(home, options);
    const count = entries().length;
    await house.tools.recoverReactions();
    expect(entries()).toHaveLength(count);
    expect(notices()).toHaveLength(1);
    expect(house.tools.pendingReactions()).toEqual([]);
  } finally {
    house.close();
    rmSync(home, { recursive: true, force: true });
  }
});
