import { afterEach, expect, it } from "vitest";
import { effect } from "../facts.ts";
import { runningRig, saved, settled } from "../../../tests/support/kit-running.ts";
const rigs: ReturnType<typeof runningRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const actor = "assistant:beto";
const open = () => {
  const rig = runningRig();
  rigs.push(rig);
  rig.bus.emit(effect("assistant-enabled", { owner: "beto", name: "Nora" }, "ana"));
  rig.bus.emit(effect("assistant-kit-set", { owner: "beto", kit: [{ tool: "slow", acts: ["run", "other"] }] }, "beto"));
  rig.bus.emit(effect("mind-card-assigned", { mind: actor, card: "test", version: "v1", capabilities: [] }, "ana"));
  return rig;
};
it.each(["delegate", "owner", "disable"])(
  "retiring %s cuts pending and nested acts without reviving them",
  async change => {
    const rig = open();
    const parent = rig.start(actor);
    expect(parent.status).toBe("processing");
    const child = rig.calls[0]?.context.execute?.({ target: "slow", act: "other", input: {} });
    expect(rig.calls).toHaveLength(2);
    if (change === "delegate") rig.bus.emit(effect("assistant-kit-set", { owner: "beto", kit: [] }, "beto"));
    if (change === "owner") rig.bus.emit(effect("removed", { identity: "beto" }, "ana"));
    if (change === "disable") rig.bus.emit(effect("assistant-disabled", { owner: "beto" }, "ana"));
    expect(rig.calls.every(call => call.context.signal?.aborted)).toBe(true);
    if (change === "owner") rig.bus.emit(effect("granted", { identity: "beto", tools: ["slow"] }, "ana"));
    if (change === "disable") rig.bus.emit(effect("assistant-enabled", { owner: "beto", name: "Nora" }, "ana"));
    rig.bus.emit(
      effect("assistant-kit-set", { owner: "beto", kit: [{ tool: "slow", acts: ["run", "other"] }] }, "beto"),
    );
    expect(rig.calls.every(call => call.context.signal?.aborted)).toBe(true);
    rig.calls.forEach(call => call.done.resolve(saved));
    expect(await child).toMatchObject({ status: "interrupted" });
    expect(await settled(parent)).toMatchObject({ status: "interrupted" });
    expect(rig.state().entries).toEqual([]);
    expect(
      rig
        .facts()
        .filter(event => event.kind === "act")
        .every(event => event.by === actor || event.by === "beto"),
    ).toBe(true);
  },
);
it("receives only its own scene, with no preferences or attention", () => {
  const rig = open();
  expect(rig.act(actor, "scene", { general: "Preparando" }).status).toBe("accepted");
  expect(rig.act(actor, "attend", { target: "slow" }).status).toBe("rejected");
  expect(rig.act(actor, "prefer", { hide: "off", on: true }).status).toBe("rejected");
});
it("trimming a delegation does not cut another act that still keeps permission", async () => {
  const rig = open();
  const first = rig.start(actor);
  const second = rig.start(actor, "other");
  rig.bus.emit(effect("assistant-kit-set", { owner: "beto", kit: [{ tool: "slow", acts: ["other"] }] }, "beto"));
  expect(rig.calls.map(call => call.context.signal?.aborted)).toEqual([true, false]);
  rig.calls.forEach(call => call.done.resolve(saved));
  expect(await settled(first)).toMatchObject({ status: "interrupted" });
  expect(await settled(second)).toMatchObject({ status: "accepted" });
  expect(rig.state().entries).toHaveLength(1);
  expect(rig.state().entries[0]?.data.author).toBe(actor);
});
