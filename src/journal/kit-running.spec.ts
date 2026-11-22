import { afterEach, expect, it } from "vitest";
import { effect } from "../house/facts.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { runningRig, saved, settled } from "../../tests/support/kit-running.ts";
import { shop } from "../../tests/support/shop.ts";

const rigs: ReturnType<typeof runningRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const open = (reach: "house" | "world" = "house") => {
  const rig = runningRig(reach);
  rigs.push(rig);
  return rig;
};
const cut = { status: "interrupted", reason: "sacada" };

it.each(["beto", "mind:slow"])("cuts what %s has pending, rejects what is new and keeps the reading", async by => {
  const rig = open();
  const pending = rig.start(by);
  rig.kit(by);
  expect(rig.calls[0]?.context.signal?.aborted).toBe(true);
  expect(rig.start(by)).toMatchObject({ status: "rejected", reason: toolTexts.outsideKit });
  expect(rig.attend("beto", "slow").status).toBe("accepted");
  rig.calls[0]?.done.resolve({
    ...saved,
    private: "Recibo de prueba",
    effects: [shop.fact("slow-written", { sale: "late", total: 100 }, by)],
  });
  const done = await settled(pending);
  expect(done).toMatchObject(cut);
  expect(done.private).toBeUndefined();
  expect(rig.state().tools.sales.has("late")).toBe(false);
  expect(rig.facts().some(event => event.kind === "act-done")).toBe(false);
  expect(rig.state().entries).toEqual([]);
  expect(rig.state().processing.size).toBe(0);
});

it("keeps what went out to the world and leaves the reason beside the result", async () => {
  const rig = open("world");
  const pending = rig.start();
  rig.kit("beto");
  rig.calls[0]?.done.resolve(saved);
  expect(await settled(pending)).toMatchObject({ status: "accepted", reason: "sacada" });
  expect(rig.outside).toEqual(["hecho afuera"]);
  expect(rig.state().entries.at(-1)?.data.text).toBe(saved.text);
  expect(rig.facts().findLast(event => event.kind === "act-result")?.data).toMatchObject({ reason: "sacada" });
});

it("removes a single action between two simultaneous acts of the same actor", async () => {
  const rig = open();
  const first = rig.start(),
    second = rig.start("beto", "other");
  rig.kit("beto", ["other"]);
  expect(rig.calls.map(call => call.context.signal?.aborted)).toEqual([true, false]);
  rig.calls.forEach(call => call.done.resolve(saved));
  expect(await settled(first)).toMatchObject(cut);
  expect(await settled(second)).toMatchObject({ status: "accepted" });
  expect(rig.state().entries).toHaveLength(1);
});

it("granting again does not revive the cut act, but allows the next one", async () => {
  const rig = open();
  const pending = rig.start();
  rig.kit("beto");
  rig.kit("beto", null);
  rig.calls[0]?.done.resolve(saved);
  expect(await settled(pending)).toMatchObject(cut);
  const next = rig.start();
  rig.calls[1]?.done.resolve(saved);
  expect(await settled(next)).toMatchObject({ status: "accepted" });
});

it.each(["granted", "removed"] as const)("%s cuts every act of the identity", async kind => {
  const rig = open();
  const pending = rig.start();
  if (kind === "granted") rig.bus.emit(effect("granted", { identity: "beto", tools: [] }, "ana"));
  else rig.bus.emit(effect("removed", { identity: "beto" }, "ana"));
  rig.calls[0]?.done.resolve(saved);
  expect(await settled(pending)).toMatchObject(cut);
  expect(rig.state().entries).toEqual([]);
});

it("a kit written by someone who does not administer does not cut", async () => {
  const rig = open();
  const pending = rig.start();
  rig.bus.emit(effect("kit-set", { holder: "beto", tool: "slow", acts: [] }, "beto"));
  expect(rig.calls[0]?.context.signal?.aborted).toBe(false);
  rig.calls[0]?.done.resolve(saved);
  expect(await settled(pending)).toMatchObject({ status: "accepted" });
});

it("rebuilding triggers no cuts; boot closes the half-cut act only once", async () => {
  const rig = open();
  const pending = rig.start();
  rig.kit("beto");
  rig.kit("beto", null);
  rig.restart();
  expect(rig.state().processing.size).toBe(1);
  rig.boot();
  rig.calls[0]?.done.resolve(saved);
  await settled(pending);
  rig.restart();
  rig.boot();
  expect(rig.facts().filter(event => event.kind === "act-result" && event.data.status === "interrupted")).toHaveLength(
    1,
  );
  expect(rig.state().entries).toEqual([]);
  const next = rig.start();
  expect(rig.calls[1]?.context.signal?.aborted).toBe(false);
  rig.calls[1]?.done.resolve(saved);
  expect(await settled(next)).toMatchObject({ status: "accepted" });
});

it("if the cut arrives while writing, it keeps the batch already started and explains the closing", async () => {
  const rig = open();
  const pending = rig.start();
  const stop = rig.bus.on("act-done", () => rig.kit("beto"));
  rig.calls[0]?.done.resolve(saved);
  expect(await settled(pending)).toMatchObject({ status: "accepted", reason: "sacada" });
  expect(rig.state().entries.at(-1)?.data.text).toBe(saved.text);
  stop();
});

it("keeps the facts of a nested act that already wrote", async () => {
  const rig = open();
  rig.attend("beto", "sales");
  const pending = rig.start();
  await rig.calls[0]?.context.execute?.({ act: "register", target: "sales", input: { sale: "s1", total: 100 } });
  rig.kit("beto");
  rig.calls[0]?.done.resolve(saved);
  expect(await settled(pending)).toMatchObject(cut);
  expect(rig.state().tools.sales.has("s1")).toBe(true);
  expect(rig.state().entries.some(entry => entry.data.tool === "slow")).toBe(false);
});
