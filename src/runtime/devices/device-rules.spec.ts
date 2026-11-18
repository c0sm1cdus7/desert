// Mechanical rules stop remote actions through doors and after review waits.
import { expect, it, vi } from "vitest";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { setup } from "../../../tests/support/device-house.ts";
import { effect } from "../../house/facts.ts";
import { ruleField } from "../../house/rules/rule-schema.ts";
import { execute, type Execution } from "../../tools/execute.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { ReviewRequest, ReviewResult } from "../../tools/minds/mind-review.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { mcpDoor } from "../../doors/mcp/mcp-handler.ts";
import { rulesTexts } from "../../texts/rules.texts.ts";

const proposal = {
  act: "run",
  target: "agents",
  input: { command: "test" },
  destination: { kind: "device" as const, device: "mac" },
};
async function save(rig: ReturnType<typeof setup>, command: string) {
  await settle(rig.house.tools.act({ act: "attend", input: { target: "rules" } }, 0, "ana"));
  return settle(
    rig.house.tools.act(
      {
        act: "save",
        target: "rules",
        input: {
          id: "remote-stop",
          text: "No ejecutar este comando",
          action: { tool: "agents", act: "run" },
          condition: {
            operator: "equal",
            field: { source: "input", path: "command" },
            value: { kind: "text", value: command },
          },
          effect: "frena",
        },
      },
      0,
      "ana",
    ),
  );
}
function evaluations(rig: ReturnType<typeof setup>) {
  return rig.house.journal.replay<unknown[]>([], (all, event) =>
    event.kind === "rule-evaluated" ? [...all, event.data] : all,
  );
}

it.each(["ana", "beto"])("blocks a device action over MCP for %s and keeps the reason", async actor => {
  const rig = setup();
  rig.device("mac");
  expect((await save(rig, "test")).status).toBe("accepted");
  const door = mcpDoor(rig.house, new Map([["synthetic-credential", { identity: actor, door: "agente" as const }]]), {
    name: "test",
    version: "1",
    limits: { recentLines: 10 },
  });
  try {
    const response = await door.handle({
      method: "POST",
      path: "/mcp",
      headers: { authorization: "Bearer synthetic-credential", "content-type": "application/json" },
      body: () => [
        Buffer.from(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: {
              name: "actuar",
              arguments: {
                programa: "agents",
                accion: "run",
                datos: proposal.input,
                destination: proposal.destination,
              },
            },
          }),
        ),
      ],
    });
    expect(response.body).toContain('"isError":true');
    expect(response.body).toContain(rulesTexts.blocked);
    expect(rig.requests).toEqual([]);
    expect(rig.house.tools.state().house.devices.executions.size).toBe(0);
    expect(evaluations(rig)).toContainEqual({
      action: { tool: "agents", act: "run" },
      results: [{ id: "remote-stop", version: 1, outcome: "frena" }],
    });
  } finally {
    await door.close();
  }
});

it("rechecks the changed rule after review and before device dispatch", async () => {
  const rig = setup();
  rig.device("mac");
  expect((await save(rig, "other")).status).toBe("accepted");
  rig.house.bus.emit(effect("kit-set", { holder: "mind:agents", tool: "agents", acts: ["run"] }, "ana"));
  let request: ReviewRequest | undefined;
  let resume: (result: ReviewResult) => void = () => {};
  const dispatch = vi.fn(() => Promise.resolve({ status: "accepted" as const }));
  const ports: Execution<Program> = {
    bus: rig.house.bus,
    registry: rig.house.registry,
    state: rig.house.tools.state,
    own: () => [],
    process: () => true,
    live: () => true,
    now: () => 1000,
    secrets: { capture: () => {}, scrub: value => value },
    devices: dispatch,
    review: {
      review: value => {
        request = value;
        return new Promise(resolve => {
          resume = resolve;
        });
      },
    },
  };
  const pending = settle(execute(ports, proposal, 0, "mind:agents"));
  expect(request?.acts[0]?.destination).toEqual(proposal.destination);
  expect(dispatch).not.toHaveBeenCalled();
  expect((await save(rig, "test")).status).toBe("accepted");
  if (!request) throw new Error("Missing review request");
  resume({ proposal: request.id, through: request.through, rulesVersion: "1", outcome: "passed", text: "Sí" });
  expect(await pending).toMatchObject({ status: "rejected", reason: rulesTexts.blocked });
  expect(dispatch).not.toHaveBeenCalled();
  expect(evaluations(rig)).toEqual(
    expect.arrayContaining([
      { action: { tool: "agents", act: "run" }, results: [{ id: "remote-stop", version: 1, outcome: "passed" }] },
      { action: { tool: "agents", act: "run" }, results: [{ id: "remote-stop", version: 2, outcome: "frena" }] },
    ]),
  );
});

it.each(["accepted", "unknown"])("keeps a dispatched %s result after a blocking rule becomes active", async outcome => {
  const rig = setup();
  const action = rig.house.registry.find(tool => tool.id === "agents")?.acts.run;
  if (!action) throw new Error("Missing remote action");
  Object.assign(action, { reach: "house" });
  let complete = () => {};
  const mac = rig.device(
    "mac",
    request =>
      new Promise(resolve => {
        complete = () => resolve({ status: "accepted", reference: request.execution });
      }),
  );
  const pending = settle(rig.act("mac"));
  await vi.waitFor(() => expect(rig.requests).toHaveLength(1));
  expect((await save(rig, "test")).status).toBe("accepted");
  if (outcome === "unknown") mac.connection.disconnect();
  else complete();
  expect(await pending).toMatchObject({ status: outcome === "unknown" ? "inconclusive" : "accepted" });
  expect(rig.requests).toHaveLength(1);
  expect([...rig.house.tools.state().house.devices.executions.values()][0]?.status).toBe(outcome);
});

it("still rechecks local effects after a wait when an action also supports devices", async () => {
  const rig = setup();
  const action = rig.house.registry.find(tool => tool.id === "agents")?.acts.run;
  if (!action) throw new Error("Missing action");
  let complete = () => {};
  Object.assign(action, {
    reach: "house",
    run: () =>
      new Promise(resolve => {
        complete = () => resolve({ status: "accepted" });
      }),
  });
  const pending = settle(rig.house.tools.act({ ...proposal, destination: { kind: "house" } }, 0, "beto"));
  expect((await save(rig, "test")).status).toBe("accepted");
  complete();
  expect(await pending).toMatchObject({ status: "rejected", reason: rulesTexts.blocked });
  expect(rig.requests).toEqual([]);
});

it("rechecks a rule changed while the device send is queued", async () => {
  const rig = setup();
  rig.device("mac");
  expect((await save(rig, "other")).status).toBe("accepted");
  const pending = settle(rig.act("mac"));
  const previous = rig.house.tools.state().house.rules.versions.get("remote-stop")?.at(0);
  if (!previous) throw new Error("Missing initial rule");
  rig.house.bus.emit(
    effect(
      "rule-versioned",
      {
        version: 2,
        previous: 1,
        definition: {
          ...previous.definition,
          condition: {
            operator: "equal",
            field: { source: "input", path: "command" },
            value: { kind: "text", value: "test" },
          },
        },
      },
      "ana",
    ),
  );
  expect(await pending).toMatchObject({ status: "rejected", reason: rulesTexts.blocked });
  expect(rig.requests).toEqual([]);
  const attempt = [...rig.house.tools.state().house.devices.executions.values()][0];
  expect(attempt).toMatchObject({ status: "rejected", reference: `core:${attempt?.execution}` });
  expect(evaluations(rig)).toContainEqual({
    action: { tool: "agents", act: "run" },
    results: [{ id: "remote-stop", version: 2, outcome: "frena" }],
  });
});

it("rejects declared remote secrets before capabilities or custody are opened", async () => {
  const rig = setup();
  const action = rig.house.registry.find(tool => tool.id === "agents")?.acts.run;
  if (!action) throw new Error("Missing action");
  Object.assign(action, { input: Type.Object({ command: Type.String({ secret: true }) }) });
  const capabilities = vi.fn(() => {
    throw new Error("Unexpected capability access");
  });
  const scope = vi.fn(() => {
    throw new Error("Unexpected custody access");
  });
  const dispatch = vi.fn(() => Promise.resolve({ status: "accepted" as const }));
  const ports: Execution<Program> = {
    bus: rig.house.bus,
    registry: rig.house.registry,
    state: rig.house.tools.state,
    own: () => [],
    process: () => true,
    live: () => true,
    now: () => 1000,
    secrets: { capture: () => {}, scrub: value => value, scope },
    capabilities,
    devices: dispatch,
  };
  expect(await settle(execute(ports, proposal, 0, "beto"))).toMatchObject({ status: "rejected" });
  expect(capabilities).not.toHaveBeenCalled();
  expect(scope).not.toHaveBeenCalled();
  expect(dispatch).not.toHaveBeenCalled();
});

it("does not expose an execution destination as a public rule field", () => {
  expect(Value.Check(ruleField, { source: "core", path: "destination" })).toBe(false);
  expect(Value.Check(ruleField, { source: "core", path: "destination.device" })).toBe(false);
});
