import { afterEach, expect, it, vi } from "vitest";
import { effect } from "../../journal/events.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { zeroMind } from "../../../tests/support/zero-mind.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shop, shopRegistry } from "../../../tests/support/shop.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => {
  rigs.splice(0).forEach(rig => rig.close());
  vi.useRealTimers();
});
function opened() {
  const mind = zeroMind();
  const other = zeroMind("other");
  const rig = shopRig({ registry: [...shopRegistry, mind.tool, other.tool] });
  rigs.push(rig);
  const kit = (acts: string[] | null) =>
    rig.bus.emit(effect("kit-set", { holder: "mind:desk", tool: "desk", acts }, "ana"));
  const wake = () => rig.bus.emit(effect("woke", { id: "desk:zero" }, "shop"));
  return { rig, mind, other, kit, wake };
}
it("a zero mind wakes without a kit, writes its scene, gains and loses its act", async () => {
  const { rig, mind, kit, wake } = opened();
  const before = rig.facts().length;
  wake();
  expect(await mind.pending.at(-1)).toMatchObject({ status: "rejected", reason: toolTexts.unassigned });
  expect(
    rig
      .facts()
      .slice(before)
      .map(event => event.kind),
  ).toEqual(["woke", "act", "act-result"]);
  expect(await mind.act("scene", { general: "Sólo cuento lo que pasó" }, "me")).toEqual({ status: "accepted" });
  expect(rig.state().house.scenes.get("mind:desk")?.data.general).toBe("Sólo cuento lo que pasó");
  kit(["write"]);
  const woke = wake();
  expect(await mind.pending.at(-1)).toMatchObject({ status: "accepted" });
  const act = rig.facts().find(event => event.kind === "act" && event.cause.includes(woke.id));
  expect(act).toMatchObject({ by: "mind:desk", data: { object: "desk", option: "write" }, cause: [woke.id] });
  expect(rig.facts().find(event => event.kind === "act-result" && event.cause.includes(act?.id ?? ""))).toMatchObject({
    by: "mind:desk",
    data: { status: "accepted" },
  });
  kit([]);
  wake();
  expect(await mind.pending.at(-1)).toMatchObject({ status: "rejected", reason: toolTexts.unassigned });
  const authored = rig
    .facts()
    .filter(event => ["act", "act-started", "act-result", "act-done", "sale-registered"].includes(event.kind));
  expect(authored.length).toBeGreaterThan(0);
  expect(authored.filter(event => event.by !== "mind:desk")).toHaveLength(0);
  const entries = rig.facts().filter(event => event.kind === "tool-entry" && event.data.tool === "desk");
  expect(entries.length).toBeGreaterThan(0);
  expect(
    entries.filter(
      event => event.by !== "mind:desk" || (event.kind === "tool-entry" && event.data.author !== "mind:desk"),
    ),
  ).toHaveLength(0);
});
it("the port cannot choose an actor or another tool, and preserves invalid-data refusals", async () => {
  const { rig, mind, kit } = opened();
  kit(null);
  expect(await mind.act("write", {}, "other")).toMatchObject({ status: "rejected", reason: toolTexts.unassigned });
  expect(await mind.act("write", { extra: true })).toMatchObject({ status: "rejected", reason: toolTexts.invalid });
  expect(await mind.startup().act({ act: "write", target: "desk", input: {}, by: "ana" })).toMatchObject({
    status: "rejected",
    reason: toolTexts.invalid,
  });
  expect(rig.facts().filter(event => event.kind === "sale-registered")).toHaveLength(0);
});
it("a wake act and everything its listeners write roll back before the mind hears its rejection", async () => {
  const { rig, mind, kit, wake } = opened();
  kit(["write"]);
  rig.bus.on("sale-registered", event => {
    rig.bus.emit(shop.fact("payment-received", { payment: "listener", amount: 1 }, event.by));
  });
  rig.bus.on("payment-received", () => {
    throw new Error("listener failed after writing");
  });
  wake();
  expect(await mind.pending.at(-1)).toMatchObject({ status: "rejected" });
  expect(rig.facts().filter(event => event.layer === "program")).toEqual([]);
  expect(rig.state().tools.sales.size).toBe(0);
  expect(rig.state().tools.payments.received).toBe(0);
});
it("scheduled wakes survive restart and are delivered once, and the wake causes the mind act", async () => {
  vi.useFakeTimers();
  const { rig, mind, kit } = opened();
  kit(["write"]);
  const request = mind.schedule(Date.now() + 50);
  rig.restart();
  await vi.advanceTimersByTimeAsync(51);
  expect(await mind.pending.at(-1)).toMatchObject({ status: "accepted" });
  rig.restart();
  await vi.advanceTimersByTimeAsync(51);
  const wakes = rig.facts().filter(event => event.kind === "woke" && event.data.id === "desk:zero");
  expect(wakes).toHaveLength(1);
  expect(wakes[0]?.cause).toEqual([request.id]);
  expect(rig.facts().filter(event => event.kind === "act" && event.cause.includes(wakes[0]?.id ?? ""))).toHaveLength(1);
});
it("a closed process cannot act through a retained or already queued port", async () => {
  const { rig, mind, kit } = opened();
  kit(["write"]);
  const previous = mind.startup();
  const pending = previous.act({ act: "write", target: "desk", input: {} });
  rig.restart();
  expect(await pending).toMatchObject({ status: "rejected", reason: toolTexts.interrupted });
  expect(await previous.act({ act: "write", target: "desk", input: {} })).toMatchObject({
    status: "rejected",
    reason: toolTexts.interrupted,
  });
  expect(rig.facts().filter(event => event.kind === "act")).toHaveLength(0);
});
