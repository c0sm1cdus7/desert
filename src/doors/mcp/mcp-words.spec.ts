import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, expect, it } from "vitest";
import { distributionRig } from "../../../tests/support/distribution-rig.ts";
import { sampleOptions, sampleBody, sampleMetadata } from "../../../tests/support/installable-program.ts";
import { mcpActions, mcpCatalog, mcpList, mcpResult, mcpRows } from "../../../tests/support/mcp-results.ts";
import { componer, type DistributionOf } from "../../runtime/distributions/compose.ts";
import { programa } from "../../tools/installable/program.ts";
import { identitiesTool } from "../../tools/identities/identities.ts";
import { mcpDoor } from "./mcp-handler.ts";

const notes = programa(sampleMetadata, {
  ...sampleBody,
  herramientas: { notas: sampleBody.herramientas.personal },
});
const composition = componer({ ...sampleOptions, programas: [notes] });
let rig: ReturnType<typeof distributionRig<DistributionOf<readonly [typeof notes]>>>;
let door: ReturnType<typeof mcpDoor>;
let credential: string;
beforeEach(() => {
  rig = distributionRig({
    ...composition.program,
    registry: [...composition.program.registry, identitiesTool(composition.program.registry, "ana", false)],
  });
  credential = randomUUID();
  door = mcpDoor(rig.house(), new Map([[credential, { identity: "ana", door: "agent" }]]), {
    name: "Prueba",
    version: "1",
    limits: { recentLines: 20 },
  });
});
afterEach(async () => {
  await door.close();
  rig.close();
});
const send = async (method: string, params?: unknown) =>
  (
    await door.handle({
      method: "POST",
      path: "/mcp",
      headers: { authorization: `Bearer ${credential}`, "content-type": "application/json" },
      body: () => [Buffer.from(JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }))],
    })
  ).body;
const call = async (name: string, args: unknown) => mcpResult(await send("tools/call", { name, arguments: args }));

it("reads a program, its tool folder and its object, then acts using the published program and action", async () => {
  const root = await call("read", { program: "notas" });
  expect(root.isError).toBe(false);
  expect(mcpList(root)).toMatchObject([{ id: "notas/notas" }]);
  const folder = await call("read", { program: "notas", target: "notas/notas" });
  expect(mcpList(folder)).toMatchObject([{ id: "notas/notas/same" }, { id: "notas/notas/a%2Fb%23c" }]);
  const actions = mcpActions(await call("actions", { program: "notas" }));
  expect(actions).toMatchObject([
    { program: "notas", tool: "notas/notas", action: "notas/add", target: "notas/notas" },
    { program: "notas", tool: "notas/notas", action: "notas/edit", target: "notas/notas/same" },
    { program: "notas", tool: "notas/notas", action: "notas/edit", target: "notas/notas/a%2Fb%23c" },
  ]);
  for (const offered of actions) {
    const { program, action, target } = offered;
    expect((await call("act", { program, action, target, data: {} })).isError).toBe(false);
  }
  expect(mcpRows(await call("read", { program: "notas", target: "notas/notas/same" }))).toEqual({ count: 3 });
});

it.each(["read", "actions", "act"])(
  "rejects herramienta in %s, even alongside program, without effects",
  async name => {
    const before = rig.state().through;
    for (const herramienta of ["notas", null, 3]) {
      for (const selection of [{ herramienta }, { herramienta, program: "notas" }]) {
        const response: unknown = JSON.parse(
          await send("tools/call", {
            name,
            arguments: { ...selection, ...(name === "act" ? { action: "notas/add", data: {} } : {}) },
          }),
        );
        expect(response).toMatchObject({
          error: {
            code: -32602,
            message: 'El parámetro "herramienta" ahora se llama "program". Usá "program".',
          },
        });
      }
    }
    expect(rig.state().through).toBe(before);
  },
);

it("publishes program in schemas and teaches the program, tool and object vocabulary", async () => {
  const catalog = mcpCatalog(await send("tools/list"));
  for (const name of ["read", "actions", "act"]) {
    const tool = catalog.find(tool => tool.name === name);
    expect(tool?.inputSchema.properties.program).toMatchObject({ type: "string" });
    expect(tool?.inputSchema.properties).not.toHaveProperty("herramienta");
    expect(tool?.inputSchema.required ?? []).toEqual(name === "act" ? ["program", "action", "data"] : []);
    expect(tool?.description).toContain("program");
    expect(tool?.description).not.toMatch(/con herramienta|repetí herramienta|herramienta elige el program/u);
  }
  const outputFields = {
    read: ["identity", "since", "scenes", "programs", "notices"],
    actions: ["tool", "action", "name", "subject", "purpose", "input", "choices", "reason"],
    wait: ["seq", "changed"],
  };
  for (const [name, fields] of Object.entries(outputFields)) {
    const description = catalog.find(tool => tool.name === name)?.description ?? "";
    for (const field of fields) expect(description).toMatch(new RegExp(`\\b${field}\\b`, "u"));
  }
  const initialized: unknown = JSON.parse(await send("initialize", { protocolVersion: "2025-11-25" }));
  expect(initialized).toHaveProperty("result.instructions", expect.stringContaining("identidades y programas"));
  expect(initialized).toHaveProperty("result.instructions", expect.stringContaining("notas/notas/<id>"));
});

it("reads system identities as a program and lists their action coordinates", async () => {
  const root = await call("read", { program: "identities" });
  expect(root.isError).toBe(false);
  expect(mcpList(root)).toContainEqual(expect.objectContaining({ id: "identities/ana" }));
  const identity = await call("read", { program: "identities", target: "identities/ana" });
  expect(identity.isError).toBe(false);
  expect(mcpRows(identity)).toMatchObject({ identifier: "ana" });
  const actions = mcpActions(await call("actions", { program: "identities" }));
  expect(actions.length).toBeGreaterThan(0);
  expect(actions.every(action => action.program === "identities" && action.tool === "identities")).toBe(true);
});

it("names programs in the house overview and their notices", async () => {
  const overview = mcpRows(await call("read", {}));
  expect(overview).toHaveProperty("programs", expect.arrayContaining([expect.objectContaining({ id: "notas" })]));
  expect(overview).not.toHaveProperty("herramientas");
  expect(overview).toHaveProperty("notices", expect.arrayContaining([expect.objectContaining({ program: "notas" })]));
});
