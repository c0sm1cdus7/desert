import { afterEach, expect, it, vi } from "vitest";
import { effect } from "../../journal/events.ts";
import { zeroMind } from "../../../tests/support/zero-mind.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopRegistry } from "../../../tests/support/shop.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => {
  rigs.splice(0).forEach(rig => rig.close());
  vi.useRealTimers();
});
it("two simultaneous wakes keep their own causes, including a request after an asynchronous continuation", async () => {
  const a = zeroMind("a"),
    b = zeroMind("b");
  const rig = shopRig({ registry: [...shopRegistry, a.tool, b.tool] });
  rigs.push(rig);
  for (const tool of ["a", "b"])
    rig.bus.emit(effect("kit-set", { holder: `mind:${tool}`, tool, acts: ["write"] }, "ana"));
  const later: ReturnType<typeof a.act>[] = [];
  a.startup().bus.on("stimulus", event => {
    if (event.data.tool === "trigger") later.push(Promise.resolve().then(() => a.act()));
  });
  const first = rig.bus.emit(effect("woke", { id: "a:zero" }, "shop"));
  const second = rig.bus.emit(effect("woke", { id: "b:zero" }, "shop"));
  const third = rig.bus.emit(effect("stimulus", { tool: "trigger" }, "shop"));
  expect((await Promise.all([...a.pending, ...b.pending, ...later])).map(result => result.status)).toEqual([
    "accepted",
    "accepted",
    "accepted",
  ]);
  const acts = rig.facts().filter(event => event.kind === "act");
  expect(acts.map(event => [event.by, event.cause])).toEqual([
    ["mind:a", [first.id]],
    ["mind:b", [second.id]],
    ["mind:a", [third.id]],
  ]);
});
it("replacing or cancelling a wake before restarting leaves only the last live schedule", async () => {
  vi.useFakeTimers();
  const mind = zeroMind();
  const rig = shopRig({ registry: [...shopRegistry, mind.tool] });
  rigs.push(rig);
  mind.schedule(Date.now() + 10);
  mind.schedule(Date.now() + 20);
  mind.schedule(null);
  rig.restart();
  await vi.advanceTimersByTimeAsync(30);
  expect(mind.pending).toHaveLength(0);
  mind.schedule(Date.now() + 10);
  const last = mind.schedule(Date.now() + 20);
  rig.restart();
  await vi.advanceTimersByTimeAsync(10);
  expect(mind.pending).toHaveLength(0);
  await vi.advanceTimersByTimeAsync(10);
  expect(mind.pending).toHaveLength(1);
  expect(rig.facts().find(event => event.kind === "woke")?.cause).toEqual([last.id]);
});
it("a queued act checks the current kit, and an absent tool cannot act or write a scene", async () => {
  const mind = zeroMind();
  const registry = [...shopRegistry, mind.tool];
  const rig = shopRig({ registry });
  rigs.push(rig);
  rig.bus.emit(effect("kit-set", { holder: "mind:desk", tool: "desk", acts: ["write"] }, "ana"));
  const pending = mind.act();
  rig.bus.emit(effect("kit-set", { holder: "mind:desk", tool: "desk", acts: [] }, "ana"));
  expect(await pending).toMatchObject({ status: "rejected", reason: toolTexts.unassigned });
  registry.pop();
  expect(await mind.act()).toMatchObject({ status: "rejected", reason: toolTexts.unassigned });
  expect(await mind.act("scene", { general: "Ausente" }, "me")).toMatchObject({
    status: "rejected",
    reason: toolTexts.unassigned,
  });
});
it("a request from startup runs after house composition, with no invented cause", async () => {
  const mind = zeroMind();
  const pending: ReturnType<typeof mind.act>[] = [];
  const tool = {
    ...mind.tool,
    start: (ports: ReturnType<typeof mind.startup>) => {
      pending.push(ports.act({ act: "scene", input: { general: "Arranqué" } }));
      return () => {};
    },
  };
  const rig = shopRig({ registry: [...shopRegistry, tool] });
  rigs.push(rig);
  expect(await pending[0]).toMatchObject({ status: "accepted" });
  expect(rig.facts().find(event => event.kind === "act")).toMatchObject({ by: "mind:desk", cause: [] });
});
