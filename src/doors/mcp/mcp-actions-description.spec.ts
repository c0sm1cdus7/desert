// The catalog must explain the same kit restrictions that the caller sees in the action list.
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { distributionRig } from "../../../tests/support/distribution-rig.ts";
import { sampleOptions } from "../../../tests/support/installable-program.ts";
import { mcpActions, mcpCatalog, mcpResult } from "../../../tests/support/mcp-results.ts";
import { rpcRequest } from "../../../tests/support/door-house.ts";
import { componer } from "../../runtime/distributions/compose.ts";
import { effect } from "../../house/facts.ts";
import { mcpDoor } from "./mcp-handler.ts";

it("describes selection and disabled actions in tools/list for an identity without permission", async () => {
  const rig = distributionRig(componer(sampleOptions).program);
  rig
    .house()
    .bus.emit(effect("granted", { version: 2, identity: "martin", kit: { version: 2, selections: [] } }, "ana"));
  const credential = randomUUID();
  const door = mcpDoor(rig.house(), new Map([[credential, { identity: "martin", door: "agent" }]]), {
    name: "Prueba",
    version: "1",
    limits: { recentLines: 20 },
  });
  const send = async (method: string, params?: unknown) => {
    const response = await door.handle(rpcRequest(credential, { jsonrpc: "2.0", id: 1, method, params }));
    expect(response.status).toBe(200);
    return response.body;
  };
  try {
    const catalog = mcpCatalog(await send("tools/list"));
    const description = catalog.find(tool => tool.name === "actions")?.description;
    expect(description).toContain("program y target eligen qué acciones listar.");
    expect(description).toContain("reason marca las acciones que el kit no permite.");
    const call = async (name: string, args: unknown) => mcpResult(await send("tools/call", { name, arguments: args }));
    const program = "notas",
      target = "notas/personal";
    const all = await call("actions", { program });
    const selected = await call("actions", { program, target });
    expect(all.isError).toBe(false);
    expect(selected.isError).toBe(false);
    expect(mcpActions(all).length).toBeGreaterThan(1);
    expect(mcpActions(selected)).toEqual([
      expect.objectContaining({ program, target, action: "personal/add", reason: "fuera del kit" }),
    ]);
    expect(mcpActions(all)).toEqual(expect.arrayContaining(mcpActions(selected)));
    const before = rig.state().through;
    expect((await call("act", { program, target, action: "personal/add", data: {} })).isError).toBe(true);
    expect(rig.state().through).toBe(before);
    expect((await call("read", { program, target })).isError).toBe(false);
  } finally {
    await door.close();
    rig.close();
  }
});
