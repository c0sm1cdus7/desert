import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { setup } from "../../../tests/support/device-house.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { programAct } from "../../tools/promises.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { effect } from "../../house/facts.ts";

it("honors house-only and device-only declarations", async () => {
  const local = setup({ at: "house" });
  local.device("mac");
  expect((await settle(local.act("mac"))).status).toBe("rejected");
  expect(
    (await settle(local.house.tools.act({ act: "run", target: "agents", input: { command: "test" } }, 0, "beto")))
      .value,
  ).toBe("house");
  const remote = setup({ at: "device", tool: "shell", version: "1" });
  remote.device("mac");
  for (const destination of [undefined, { kind: "house" }])
    expect(
      (
        await settle(
          remote.house.tools.act(
            { act: "run", target: "agents", input: { command: "test" }, ...(destination ? { destination } : {}) },
            0,
            "beto",
          ),
        )
      ).status,
    ).toBe("rejected");
  expect((await settle(remote.act("mac"))).value).toBe("mac");
  expect(local.requests).toEqual([]);
  expect(remote.requests).toHaveLength(1);
});
it("retains execution metadata in program declarations and conservatively classifies device work as external", () => {
  const input = Type.Object({ command: Type.String() });
  const act = programAct<Program, typeof input>({
    input,
    execution: { at: "device", tool: "shell", version: "1" },
    name: "correr",
    enter: "correr",
    purpose: "correr una acción",
    key: "c",
    on: "tool",
    undoable: true,
    run: () => ({ status: "accepted", text: "Listo" }),
    cases: [{ promise: "Corre", input: { command: "test" }, then: { says: "Listo", facts: [] } }],
  });
  expect(act.execution).toEqual({ at: "device", tool: "shell", version: "1" });
  expect(act.reach).toBe("world");
});
it("rejects duplicate execution identifiers in the installed process without repeating work", async () => {
  const rig = setup();
  const mac = rig.device("mac");
  await settle(rig.act("mac"));
  const request = rig.requests[0];
  expect(request).toBeDefined();
  if (!request) throw new Error("missing request");
  await expect(mac.process.receive(request)).rejects.toThrow();
  expect(rig.requests).toHaveLength(1);
});
it("distinguishes an explicit rejection with receipt from an exception whose outcome is unknown", async () => {
  const rig = setup();
  rig.device("mac", () =>
    Promise.resolve({ status: "rejected", reason: "Comando rechazado", reference: "receipt:rejected" }),
  );
  rig.device("vm", () => Promise.reject(new Error("transport failed")));
  expect((await settle(rig.act("mac"))).status).toBe("rejected");
  expect((await settle(rig.act("vm"))).status).toBe("inconclusive");
  expect(
    [...rig.house.tools.state().house.devices.executions.values()].map(each => [each.status, each.reference]),
  ).toEqual([
    ["rejected", "receipt:rejected"],
    ["unknown", undefined],
  ]);
});
it("does not send when a connection disappears while the execution start is being recorded", async () => {
  const rig = setup();
  const mac = rig.device("mac");
  const stop = rig.house.bus.on(event => {
    if (event.kind === "device-execution-started") mac.connection.disconnect();
  });
  try {
    expect((await settle(rig.act("mac"))).status).toBe("inconclusive");
    expect(rig.requests).toEqual([]);
  } finally {
    stop();
  }
});
it("rejects invalid execution declarations before opening storage", () => {
  const rig = setup();
  rig.house.close();
  Object.assign(rig.options.registry[0]?.acts.run.execution ?? {}, { at: "somewhere" });
  expect(() => rig.open()).toThrow();
});
it("replays an unfinished attempt as unknown without dispatching it again", () => {
  const rig = setup();
  rig.device("mac");
  rig.house.bus.emit(
    effect(
      "device-execution-started",
      { execution: "lost", actor: "beto", program: "agents", action: "run", device: "mac", connection: "past" },
      "beto",
    ),
  );
  rig.house.close();
  const reopened = rig.open();
  expect(reopened.tools.state().house.devices.executions.get("lost")?.status).toBe("unknown");
  expect(rig.requests).toEqual([]);
});

it("keeps declared secret input out of the step-one device endpoint", async () => {
  const rig = setup();
  rig.device("mac");
  const input = rig.options.registry[0]?.acts.run.input;
  if (!input) throw new Error("missing action");
  Object.assign(input, { properties: { command: Type.String({ secret: true }) } });
  expect((await settle(rig.act("mac"))).status).toBe("rejected");
  expect(rig.requests).toEqual([]);
});
