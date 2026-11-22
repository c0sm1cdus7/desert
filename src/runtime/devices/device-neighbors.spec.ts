import { expect, it } from "vitest";
import { setup } from "../../../tests/support/device-house.ts";
import { effect } from "../../house/facts.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { requestBook } from "../../doors/socket/requests/request-book.ts";
import { mcpDoor } from "../../doors/mcp/mcp-handler.ts";
import { deviceTexts } from "../../texts/devices.texts.ts";

it("preserves the chosen destination through request deduplication, including replay", async () => {
  const rig = setup();
  rig.device("mac");
  rig.device("vm");
  const book = requestBook(rig.house);
  const request = {
    type: "act" as const,
    id: "same",
    act: "run",
    target: "agents",
    input: { command: "test" },
    through: 0,
    destination: { kind: "device" as const, device: "mac" },
  };
  try {
    expect(await book.act("beto", request)).toMatchObject({ status: "accepted" });
    expect(await book.act("beto", request)).toMatchObject({ status: "accepted" });
    expect(await book.act("beto", { ...request, destination: { kind: "device", device: "vm" } })).toMatchObject({
      type: "rejection",
    });
    expect(rig.requests.map(each => each.device)).toEqual(["mac"]);
  } finally {
    book.stop();
  }
  rig.house.close();
  const reopened = rig.open();
  const restored = requestBook(reopened);
  try {
    expect(await restored.act("beto", request)).toMatchObject({ status: "accepted" });
  } finally {
    restored.stop();
  }
});
it("offers connected destinations over MCP and sends the chosen machine through the common executor", async () => {
  const rig = setup();
  rig.device("mac");
  rig.device("vm");
  const door = mcpDoor(
    rig.house,
    new Map([["synthetic-identity-credential", { identity: "beto", door: "agent" as const }]]),
    { name: "test", version: "1", limits: { recentLines: 10 } },
  );
  const call = async (name: string, args: unknown) =>
    door.handle({
      method: "POST",
      path: "/mcp",
      headers: { authorization: "Bearer synthetic-identity-credential", "content-type": "application/json" },
      body: function* () {
        yield Buffer.from(
          JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
        );
      },
    });
  try {
    const listed = await call("actions", { program: "agents" });
    expect(listed.body).toContain("destinations");
    expect(listed.body).toContain("mac");
    expect(listed.body).toContain("vm");
    const result = await call("act", {
      program: "agents",
      action: "run",
      data: { command: "test" },
      destination: { kind: "device", device: "vm" },
    });
    expect(result.body).toContain('"isError":false');
    expect(rig.requests.map(each => each.device)).toEqual(["vm"]);
  } finally {
    await door.close();
  }
});
it("preserves journey, actor and action in the device execution and its causal history", async () => {
  const rig = setup();
  rig.device("mac");
  const kit = { version: 2 as const, selections: [{ kind: "program" as const, program: "agents" }] };
  rig.house.bus.emit(effect("kit-set", { version: 2, holder: "mind:agents", kit }, "ana"));
  const journey = rig.house.bus.emit(
    effect("journey-opened", { version: 2, goal: "Probar", kit }, "mind:agents", [], "journey-one"),
  );
  const result = await settle(
    rig.house.tools.act(
      { act: "run", target: "agents", input: { command: "test" }, destination: { kind: "device", device: "mac" } },
      0,
      "mind:agents",
      [journey.id],
    ),
  );
  expect(result.status).toBe("accepted");
  expect(rig.requests[0]).toMatchObject({
    actor: "mind:agents",
    journey: "journey-one",
    program: "agents",
    action: "run",
  });
  const execution = [...rig.house.tools.state().house.devices.executions.values()][0];
  expect(execution).toMatchObject({ actor: "mind:agents", journey: "journey-one", device: "mac", status: "accepted" });
  expect(rig.house.tools.state().house.journeys.get("journey-one")?.by).toBe("mind:agents");
});
it.each(["revoke", "close"])("keeps a dispatched unknown result unknown during %s", async mode => {
  const rig = setup();
  rig.device("mac", () => new Promise(() => {}));
  const pending = rig.act("mac");
  await Promise.resolve();
  if (mode === "close") rig.house.close();
  else
    rig.house.bus.emit(effect("kit-set", { version: 2, holder: "beto", kit: { version: 2, selections: [] } }, "ana"));
  const result = await settle(pending);
  expect(result.status).toBe("inconclusive");
  if (mode === "close") {
    const reopened = rig.open();
    expect([...reopened.tools.state().house.devices.executions.values()][0]?.status).toBe("unknown");
    expect(
      reopened.journal.replay<string[]>([], (all, event) =>
        event.layer === "house" && event.kind === "act-result" ? [...all, event.data.status] : all,
      ),
    ).toContain("inconclusive");
  } else expect(result.reason).toBe(deviceTexts.disconnected);
});
it("keeps simultaneous executions distinct and does not accept a stale connection's disconnect", async () => {
  const rig = setup();
  const mac = rig.device("mac");
  rig.device("vm");
  const results = await Promise.all([settle(rig.act("mac")), settle(rig.act("vm"))]);
  expect(results.map(each => each.value)).toEqual(["mac", "vm"]);
  expect(new Set(rig.requests.map(each => each.execution)).size).toBe(2);
  mac.connection.disconnect();
  mac.connection.disconnect();
  expect(rig.house.devices.available("agents", "run").map(each => each.id)).toEqual(["vm"]);
});
