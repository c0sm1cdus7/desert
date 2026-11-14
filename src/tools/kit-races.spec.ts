import { afterEach, expect, it } from "vitest";
import { effect } from "../journal/events.ts";
import { programResult } from "../surface/bridge/execution/program-result.ts";
import { runningRig, saved, settled } from "../../tests/support/kit-running.ts";
import { startState, toolsStep } from "./tools.ts";
import { shopSlices, type Shop } from "../../tests/support/shop.ts";

const rigs: ReturnType<typeof runningRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const open = (reach: "house" | "world" = "house") => {
  const rig = runningRig(reach);
  rigs.push(rig);
  return rig;
};

it("no pierde un corte y una devolución encolados desde el mismo oyente", async () => {
  const rig = open();
  const pending = rig.start();
  const stop = rig.bus.on("stimulus", () => {
    rig.kit("beto");
    rig.kit("beto", null);
  });
  rig.bus.emit(effect("stimulus", { tool: "slow" }, "ana"));
  stop();
  expect(rig.calls[0]?.context.signal?.aborted).toBe(true);
  rig.calls[0]?.done.resolve(saved);
  expect(await settled(pending)).toMatchObject({ status: "interrupted", reason: "sacada" });
});

it("corta antes del cuerpo si se saca al oír que empezó", async () => {
  const rig = open("world");
  const stop = rig.bus.on("act-started", event => {
    if (event.data.object === "slow") rig.kit("beto");
  });
  const pending = rig.start();
  stop();
  expect(rig.outside).toEqual([]);
  expect(await settled(pending)).toMatchObject({ status: "interrupted", reason: "sacada" });
});

it("plegar la historia mientras hay un acto vivo no le toca la señal", async () => {
  const rig = open();
  const old = rig.start();
  rig.kit("beto");
  rig.kit("beto", null);
  rig.calls[0]?.done.resolve(saved);
  await settled(old);
  const next = rig.start();
  const rebuilt = rig
    .facts()
    .reduce((state, event) => toolsStep<Shop>(state, event, shopSlices), startState<Shop>(shopSlices, "shop"));
  expect(rebuilt.processing.size).toBe(1);
  expect(rig.calls[1]?.context.signal?.aborted).toBe(false);
  rig.calls[1]?.done.resolve(saved);
  expect(await settled(next)).toMatchObject({ status: "accepted" });
});

it.each(["house", "world"] as const)("la pantalla explica el resultado pendiente de alcance %s", async reach => {
  const rig = open(reach);
  const ports = rig.ports("beto", () => 5000);
  const shown = programResult({ ...ports, act: value => ports.act(value, rig.state().through) }, "slow", "run", {});
  await Promise.resolve();
  expect(rig.calls).toHaveLength(1);
  rig.kit("beto");
  rig.calls[0]?.done.resolve(saved);
  expect(await shown).toMatchObject(
    reach === "house" ? { ok: false, reason: "sacada" } : { ok: true, text: "Resultado tardío · sacada" },
  );
});
