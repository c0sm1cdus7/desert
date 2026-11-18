import { expect, it } from "vitest";
import { setup } from "../../../tests/support/device-house.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { effect } from "../../house/facts.ts";
import type { DeviceResult } from "../../fields/device-protocol.ts";
it("registers, accepts, authenticates and runs on the chosen compatible device with the original actor", async () => {
  const rig = setup();
  rig.device("mac");
  rig.device("vm");
  expect(rig.house.devices.available("agents", "run").map(device => device.id)).toEqual(["mac", "vm"]);
  expect((await settle(rig.act("vm"))).value).toBe("vm");
  expect(rig.requests).toHaveLength(1);
  expect(rig.requests[0]).toMatchObject({ actor: "beto", program: "agents", action: "run", device: "vm" });
  const state = rig.house.tools.state().house;
  expect([...state.devices.executions.values()][0]).toMatchObject({
    actor: "beto",
    device: "vm",
    status: "accepted",
    reference: `result:${rig.requests[0]?.execution ?? ""}`,
  });
  expect(state.grants.has("vm")).toBe(false);
  expect(state.kits.has("vm")).toBe(false);
  expect(state.mindAssignments.has("vm")).toBe(false);
});
it("does not run without the action on any machine", async () => {
  const rig = setup();
  rig.device("mac");
  rig.device("vm");
  for (const id of ["mac", "vm"]) expect((await settle(rig.act(id, "sin"))).status).toBe("rejected");
  expect(rig.requests).toEqual([]);
});
it("reports disconnection as unknown and never switches machines or repeats", async () => {
  let finish: ((result: DeviceResult) => void) | undefined;
  const rig = setup();
  const mac = rig.device(
    "mac",
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  rig.device("vm");
  const pending = rig.act("mac");
  await Promise.resolve();
  mac.connection.disconnect();
  expect((await settle(pending)).status).toBe("inconclusive");
  expect([...rig.house.tools.state().house.devices.executions.values()][0]?.status).toBe("unknown");
  finish?.({ status: "accepted", reference: "late" });
  await Promise.resolve();
  await Promise.resolve();
  expect(rig.requests).toHaveLength(1);
  expect([...rig.house.tools.state().house.devices.executions.values()][0]?.status).toBe("unknown");
});
it("retires a device without inventing a result and prevents reconnection", async () => {
  const rig = setup();
  const mac = rig.device("mac", () => new Promise(() => {}));
  const pending = rig.act("mac");
  await Promise.resolve();
  rig.house.devices.retire("ana", "mac");
  expect((await settle(pending)).status).toBe("inconclusive");
  expect(() => rig.door.challenge("mac")).toThrow();
  expect((await settle(rig.act("mac"))).status).toBe("rejected");
  mac.connection.disconnect();
});
it("requires an explicit destination for an action admitting both places", async () => {
  const rig = setup();
  rig.device("mac");
  const run = (destination?: unknown) =>
    rig.house.tools.act(
      { act: "run", target: "agents", input: { command: "test" }, ...(destination ? { destination } : {}) },
      0,
      "beto",
    );
  expect((await settle(run())).status).toBe("rejected");
  expect((await settle(run({ kind: "house" }))).value).toBe("house");
  expect(rig.requests).toEqual([]);
});
it("reconstructs history without treating a previous connection as live", async () => {
  const rig = setup();
  rig.device("mac");
  await settle(rig.act("mac"));
  rig.house.close();
  const reopened = rig.open();
  expect(reopened.devices.available("agents", "run")).toEqual([]);
  expect(reopened.tools.state().house.devices.devices.get("mac")?.owner).toBe("ana");
  expect([...reopened.tools.state().house.devices.executions.values()][0]?.reference).toBeTruthy();
});
it("revokes device connectivity when its owner leaves", async () => {
  const rig = setup();
  rig.device("mac");
  rig.house.bus.emit(effect("handed", { to: "beto" }, "ana"));
  rig.house.bus.emit(effect("removed", { identity: "ana" }, "beto"));
  expect(rig.house.devices.available("agents", "run")).toEqual([]);
  expect((await settle(rig.act("mac"))).status).toBe("rejected");
});
