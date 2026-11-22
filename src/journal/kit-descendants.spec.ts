import { afterEach, expect, it } from "vitest";
import { runningRig, saved, settled } from "../../tests/support/kit-running.ts";
import { shop } from "../../tests/support/shop.ts";

const rigs: ReturnType<typeof runningRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const cut = { status: "interrupted", reason: "sacada" };

it.each(["beto", "mind:slow"])("R2/R2m: %s cuts pending children without cutting independent acts", async by => {
  const rig = runningRig();
  rigs.push(rig);
  const parent = rig.start(by);
  const nested = rig.calls[0]?.context.execute?.({ act: "other", target: "slow", input: {} });
  const independent = rig.start(by, "other");
  expect(rig.calls).toHaveLength(3);
  rig.kit(by, ["other"]);
  expect(rig.calls.map(call => call.context.signal?.aborted)).toEqual([true, true, false]);
  rig.calls[1]?.done.resolve({
    ...saved,
    effects: [shop.fact("slow-written", { sale: "late", total: 1 }, by)],
  });
  expect(await nested).toMatchObject(cut);
  expect(rig.state().tools.sales.has("late")).toBe(false);
  rig.calls[0]?.done.resolve(saved);
  rig.calls[2]?.done.resolve(saved);
  expect(await settled(parent)).toMatchObject(cut);
  expect(await settled(independent)).toMatchObject({ status: "accepted" });
  expect(rig.state().entries).toHaveLength(1);
});

it("O1: the nested act already started keeps the contract's interrupted status", async () => {
  const rig = runningRig();
  rigs.push(rig);
  const parent = rig.start();
  const nested = rig.calls[0]?.context.execute?.({ act: "other", target: "slow", input: {} });
  rig.kit("beto");
  rig.calls[1]?.done.resolve(saved);
  expect(await nested).toMatchObject(cut);
  rig.calls[0]?.done.resolve(saved);
  expect(await settled(parent)).toMatchObject(cut);
});

it("R9: a cut parent returns a result even for an unknown target", async () => {
  const rig = runningRig();
  rigs.push(rig);
  const parent = rig.start();
  rig.kit("beto");
  rig.kit("beto", null);
  const before = rig.facts().length;
  for (const target of ["slow", "unknown"]) {
    await expect(rig.calls[0]?.context.execute?.({ act: "other", target, input: {} })).resolves.toMatchObject(cut);
  }
  expect(rig.facts()).toHaveLength(before);
  expect(rig.calls).toHaveLength(1);
  rig.calls[0]?.done.resolve(saved);
  expect(await settled(parent)).toMatchObject(cut);
});

it("the cut reaches grandchildren and granting again does not revive them", async () => {
  const rig = runningRig();
  rigs.push(rig);
  const parent = rig.start();
  const child = rig.calls[0]?.context.execute?.({ act: "other", target: "slow", input: {} });
  const grandchild = rig.calls[1]?.context.execute?.({ act: "other", target: "slow", input: { next: true } });
  expect(rig.calls).toHaveLength(3);
  rig.kit("beto", ["other"]);
  rig.kit("beto", null);
  expect(rig.calls.every(call => call.context.signal?.aborted)).toBe(true);
  rig.calls.forEach(call => call.done.resolve(saved));
  expect(await grandchild).toMatchObject(cut);
  expect(await child).toMatchObject(cut);
  expect(await settled(parent)).toMatchObject(cut);
  expect(rig.state().entries).toEqual([]);
});

it("a child that already finished keeps its write and its signal when the parent is cut", async () => {
  const rig = runningRig();
  rigs.push(rig);
  const parent = rig.start();
  const child = rig.calls[0]?.context.execute?.({ act: "other", target: "slow", input: {} });
  rig.calls[1]?.done.resolve({
    ...saved,
    effects: [shop.fact("slow-written", { sale: "earlier", total: 1 }, "beto")],
  });
  expect(await child).toMatchObject({ status: "accepted" });
  rig.kit("beto", ["other"]);
  expect(rig.calls[1]?.context.signal?.aborted).toBe(false);
  rig.calls[0]?.done.resolve(saved);
  expect(await settled(parent)).toMatchObject(cut);
  expect(rig.state().tools.sales.has("earlier")).toBe(true);
});

it("a world child receives the cut and keeps what it already did outside", async () => {
  const rig = runningRig("world");
  rigs.push(rig);
  const parent = rig.start();
  const child = rig.calls[0]?.context.execute?.({ act: "other", target: "slow", input: {} });
  rig.kit("beto", ["other"]);
  expect(rig.calls[1]?.context.signal?.aborted).toBe(true);
  rig.calls[1]?.done.resolve(saved);
  expect(await child).toMatchObject({ status: "accepted" });
  rig.calls[0]?.done.resolve(saved);
  expect(await settled(parent)).toMatchObject({ status: "accepted", reason: "sacada" });
  expect(rig.outside).toHaveLength(2);
  expect(rig.facts().filter(event => event.kind === "act-result" && event.data.reason === "sacada")).toHaveLength(2);
});
