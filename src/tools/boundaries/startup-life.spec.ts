import { afterEach, expect, it } from "vitest";
import { startProgram } from "./tool-startup.ts";
import { houseActs } from "../scenes.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { zeroMind } from "../../../tests/support/zero-mind.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopRegistry, type Shop } from "../../../tests/support/shop.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
for (const broken of [false, true])
  it(`tool ${broken ? "failed start" : "stop"} invalidates its port while the house stays live`, async () => {
    const mind = zeroMind();
    const registry = [...shopRegistry, mind.tool];
    const rig = shopRig({ registry });
    rigs.push(rig);
    const pending: ReturnType<typeof mind.act>[] = [];
    const borrowed: ReturnType<typeof mind.startup>[] = [];
    const tool = {
      ...mind.tool,
      start: (startup: ReturnType<typeof mind.startup>) => {
        borrowed.push(startup);
        pending.push(startup.act({ act: "scene", input: { general: "Tarde" } }));
        if (broken) throw new Error("start failed");
        return () => {};
      },
    };
    const ports = {
      bus: rig.bus,
      state: rig.state,
      registry,
      now: () => 10,
      live: () => true,
      process: () => false,
      own: (state: ReturnType<typeof rig.state>) => houseActs<Shop>([])(state.by),
      secrets: { capture: () => {}, scrub: <T>(value: T): T => value },
    };
    if (broken) expect(() => startProgram(tool, ports)).toThrow("start failed");
    else startProgram(tool, ports)();
    expect(await pending[0]).toMatchObject({ status: "rejected", reason: toolTexts.interrupted });
    expect(await borrowed[0]?.act({ act: "scene", input: { general: "Tarde" } })).toMatchObject({
      status: "rejected",
      reason: toolTexts.interrupted,
    });
    expect(rig.facts().filter(event => event.kind === "act")).toEqual([]);
  });
