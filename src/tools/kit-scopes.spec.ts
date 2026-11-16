import { Type } from "@sinclair/typebox";
import { afterEach, expect, it } from "vitest";
import { effect } from "../journal/events.ts";
import { ownAct, toolAct } from "./act-definition.ts";
import type { ActContext, ActResult, Tool } from "./tool-contract.ts";
import { deferred, saved, settled } from "../../tests/support/kit-running.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shopRegistry, type Shop } from "../../tests/support/shop.ts";

const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
function open() {
  const calls: { context: ActContext<Shop>; done: ReturnType<typeof deferred<ActResult<Shop>>> }[] = [];
  const body = (_: unknown, context: ActContext<Shop>) => {
    const done = deferred<ActResult<Shop>>();
    calls.push({ context, done });
    return done.promise;
  };
  const input = Type.Object({});
  const run = toolAct(input, body);
  const tool: Tool<Shop> = {
    id: "slow",
    purpose: "Prueba de alcance",
    targets: () => [],
    view: () => "",
    summary: () => "",
    acts: { run, other: run },
  };
  const offered = ownAct("slow", "own", { input, purpose: "Prueba de casa" }, body);
  // Since the mind (0c) every cause in a test house names a fact: the journey is the fact that opened it.
  let journey = "";
  const rig = shopRig({
    registry: [...shopRegistry, tool],
    own: () => [offered],
    process: (id, by) => id === journey && (by === undefined || by === "mind:slow"),
  });
  rigs.push(rig);
  journey = rig.bus.emit(effect("stimulus", { tool: "slow" }, "shop")).id;
  rig.attend("beto", "slow");
  const kit = (by: string, acts: string[] | null) =>
    rig.bus.emit(effect("kit-set", { holder: by, tool: "slow", acts }, "ana"));
  return { rig, calls, kit, journey };
}

it("el hijo ofrecido por la casa también corre por cuenta del padre", async () => {
  const { rig, calls, kit } = open();
  const parent = rig.act("beto", "run", {}, "slow");
  const child = calls[0]?.context.execute?.({ act: "own", target: "slow", input: {} });
  kit("beto", []);
  expect(calls[1]?.context.signal?.aborted).toBe(true);
  calls.forEach(call => call.done.resolve(saved));
  expect(await child).toMatchObject({ status: "interrupted", reason: "sacada" });
  expect(await settled(parent)).toMatchObject({ status: "interrupted", reason: "sacada" });
  expect(rig.state().entries).toEqual([]);
});

it("un journey de la mente corta su cadena y mantiene la procedencia en cada cierre", async () => {
  const { rig, calls, kit, journey } = open();
  kit("mind:slow", null);
  const parent = rig.tools().act({ act: "run", target: "slow", input: {} }, 0, "mind:slow", [journey]);
  const child = calls[0]?.context.execute?.({ act: "other", target: "slow", input: {} });
  kit("mind:slow", ["other"]);
  expect(calls.map(call => call.context.signal?.aborted)).toEqual([true, true]);
  calls.forEach(call => call.done.resolve(saved));
  expect(await child).toMatchObject({ status: "interrupted", reason: "sacada" });
  expect(await settled(parent)).toMatchObject({ status: "interrupted", reason: "sacada" });
  const results = rig.facts().filter(event => event.kind === "act-result" && event.by === "mind:slow");
  expect(results).toHaveLength(2);
  expect(results.every(event => event.process === journey)).toBe(true);
  expect(rig.state().entries).toEqual([]);
});
