import { identityView, identityReader } from "./members.ts";
import { afterEach, expect, it } from "vitest";
import { effect } from "./facts.ts";
import { noticesOf } from "../surface/bridge/views/notices.ts";
import { startProgram } from "../tools/boundaries/tool-startup.ts";
import { houseActs } from "./scenes.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shopRegistry, salesTool, type Shop } from "../../tests/support/shop.ts";
import { zeroMind } from "../../tests/support/zero-mind.ts";
import { mutate } from "../../tests/support/state-mutations.ts";
import { stateResult } from "../journal/readonly-state.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
it("needs and surface metadata receive the same protected state", () => {
  const rig = shopRig();
  rigs.push(rig);
  let reads = 0;
  const tool = {
    ...salesTool,
    needs: (state: ReturnType<typeof rig.state>) => {
      expect(() => mutate(state.house.grants, "clear")).toThrow(TypeError);
      expect(() => Object.assign(state.house, { admin: "beto" })).toThrow(TypeError);
      reads++;
      return [];
    },
  };
  const ports = rig.ports("ana", Date.now);
  const notices = noticesOf(
    { ...ports, language: "es" as const, act: value => ports.act(value, ports.state().through) },
    tool,
    {
      name: "Ventas",
    },
  );
  expect(notices.notices().needs).toEqual([]);
  expect(reads).toBe(1);
  expect(rig.state().house.admin).toBe("ana");
});
it("rollback and two simultaneous houses do not let a retained view change current authority", async () => {
  const a = zeroMind(),
    b = zeroMind();
  const first = shopRig({ registry: [...shopRegistry, a.tool] });
  const second = shopRig({ registry: [...shopRegistry, b.tool] });
  rigs.push(first, second);
  const previous = a.startup().state();
  expect(() =>
    first.bus.together(() => {
      first.bus.emit(effect("kit-set", { holder: "mind:desk", tool: "desk", acts: null }, "ana"));
      expect(() => mutate(a.startup().state().house.kits, "clear")).toThrow(TypeError);
      throw new Error("rollback");
    }),
  ).toThrow("rollback");
  expect(() => mutate(previous.house.kits, "set", "mind:desk", new Map([["desk", null]]))).toThrow(TypeError);
  expect((await Promise.all([a.act(), b.act()])).map(r => r.status)).toEqual(["rejected", "rejected"]);
  expect(first.state().house.kits.size).toBe(0);
  expect(second.state().house.kits.size).toBe(0);
});
it("the standalone startup boundary also protects a raw reader", () => {
  const mind = zeroMind();
  const registry = [...shopRegistry, mind.tool];
  const rig = shopRig({ registry });
  rigs.push(rig);
  let called = false;
  const stop = startProgram(
    {
      ...mind.tool,
      start: ports => {
        expect(() => mutate(ports.state().house.kits, "clear")).toThrow(TypeError);
        called = true;
        return () => {};
      },
    },
    {
      bus: rig.bus,
      state: () => stateResult(rig.state()),
      registry,
      now: () => 10,
      live: () => true,
      process: () => false,
      own: state => houseActs<Shop>([])(state.by),
      secrets: { capture: () => {}, scrub: value => value },
    },
  );
  stop();
  expect(called).toBe(true);
});

it("an identity view protects even a raw input and its newly derived arrays", () => {
  const rig = shopRig();
  rigs.push(rig);
  const raw = stateResult(rig.state());
  const view = identityView(raw, "ana");
  expect(() => Object.assign(view, { by: "beto" })).toThrow(TypeError);
  expect(() => Object.assign(view.house, { admin: "beto" })).toThrow(TypeError);
  expect(() => mutate(view.entries, "push", {})).toThrow(TypeError);
  expect(() => mutate(view.attends, "push", "sales")).toThrow(TypeError);
  expect(raw.house.admin).toBe("ana");
});

it("reuses a protected identity snapshot and refreshes it after the next fact", () => {
  const rig = shopRig();
  rigs.push(rig);
  const read = identityReader(rig.state, "ana");
  const before = read();
  expect(read()).toBe(before);
  rig.bus.emit(effect("scene", { general: "Preparando" }, "beto"));
  const after = read();
  expect(after).not.toBe(before);
  expect(after.house.scenes.get("beto")?.data.general).toBe("Preparando");
  expect(before.house.scenes.has("beto")).toBe(false);
  expect(() => mutate(after.house.scenes, "clear")).toThrow(TypeError);
});
