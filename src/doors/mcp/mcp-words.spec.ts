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
  door = mcpDoor(rig.house(), new Map([[credential, { identity: "ana", door: "agente" }]]), {
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
  const root = await call("leer", { programa: "notas" });
  expect(root.isError).toBe(false);
  expect(mcpList(root)).toMatchObject([{ id: "notas/notas" }]);
  const folder = await call("leer", { programa: "notas", objetivo: "notas/notas" });
  expect(mcpList(folder)).toMatchObject([{ id: "notas/notas/same" }, { id: "notas/notas/a%2Fb%23c" }]);
  const actions = mcpActions(await call("acciones", { programa: "notas" }));
  expect(actions).toMatchObject([
    { programa: "notas", herramienta: "notas/notas", accion: "notas/add", objetivo: "notas/notas" },
    { programa: "notas", herramienta: "notas/notas", accion: "notas/edit", objetivo: "notas/notas/same" },
    { programa: "notas", herramienta: "notas/notas", accion: "notas/edit", objetivo: "notas/notas/a%2Fb%23c" },
  ]);
  for (const action of actions) {
    const { programa, accion, objetivo } = action;
    expect((await call("actuar", { programa, accion, objetivo, datos: {} })).isError).toBe(false);
  }
  expect(mcpRows(await call("leer", { programa: "notas", objetivo: "notas/notas/same" }))).toEqual({ count: 3 });
});

it.each(["leer", "acciones", "actuar"])(
  "rejects herramienta in %s, even alongside programa, without effects",
  async name => {
    const before = rig.state().through;
    for (const herramienta of ["notas", null, 3]) {
      for (const selection of [{ herramienta }, { herramienta, programa: "notas" }]) {
        const response: unknown = JSON.parse(
          await send("tools/call", {
            name,
            arguments: { ...selection, ...(name === "actuar" ? { accion: "notas/add", datos: {} } : {}) },
          }),
        );
        expect(response).toMatchObject({
          error: {
            code: -32602,
            message: 'El parámetro "herramienta" ahora se llama "programa". Usá "programa".',
          },
        });
      }
    }
    expect(rig.state().through).toBe(before);
  },
);

it("publishes programa in schemas and teaches the program, tool and object vocabulary", async () => {
  const catalog = mcpCatalog(await send("tools/list"));
  for (const name of ["leer", "acciones", "actuar"]) {
    const tool = catalog.find(tool => tool.name === name);
    expect(tool?.inputSchema.properties.programa).toMatchObject({ type: "string" });
    expect(tool?.inputSchema.properties).not.toHaveProperty("herramienta");
    expect(tool?.inputSchema.required ?? []).toEqual(name === "actuar" ? ["programa", "accion", "datos"] : []);
    expect(tool?.description).toContain("programa");
    expect(tool?.description).not.toMatch(/con herramienta|repetí herramienta|herramienta elige el programa/u);
  }
  const initialized: unknown = JSON.parse(await send("initialize", { protocolVersion: "2025-11-25" }));
  expect(initialized).toHaveProperty("result.instructions", expect.stringContaining("identidades y programas"));
  expect(initialized).toHaveProperty("result.instructions", expect.stringContaining("notas/notas/<id>"));
});

it("reads system identities as a program and lists their action coordinates", async () => {
  const root = await call("leer", { programa: "identities" });
  expect(root.isError).toBe(false);
  expect(mcpList(root)).toContainEqual(expect.objectContaining({ id: "identities/ana" }));
  const identity = await call("leer", { programa: "identities", objetivo: "identities/ana" });
  expect(identity.isError).toBe(false);
  expect(mcpRows(identity)).toMatchObject({ identifier: "ana" });
  const actions = mcpActions(await call("acciones", { programa: "identities" }));
  expect(actions.length).toBeGreaterThan(0);
  expect(actions.every(action => action.programa === "identities" && action.herramienta === "identities")).toBe(true);
});

it("names programs in the house overview and their notices", async () => {
  const overview = mcpRows(await call("leer", {}));
  expect(overview).toHaveProperty("programas", expect.arrayContaining([expect.objectContaining({ id: "notas" })]));
  expect(overview).not.toHaveProperty("herramientas");
  expect(overview).toHaveProperty("avisos", expect.arrayContaining([expect.objectContaining({ programa: "notas" })]));
});
