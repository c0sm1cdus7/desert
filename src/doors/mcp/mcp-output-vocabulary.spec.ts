// Exercise actual MCP envelopes, JSON text and JSON lines against a closed, reviewed English vocabulary.
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { distributionRig } from "../../../tests/support/distribution-rig.ts";
import { sampleBody, sampleMetadata, sampleOptions } from "../../../tests/support/installable-program.ts";
import { checkMcpVocabulary } from "../../../tests/support/mcp-vocabulary.ts";
import { mcpActions, mcpList, mcpResult, mcpRows } from "../../../tests/support/mcp-results.ts";
import { componer, type DistributionOf } from "../../runtime/distributions/compose.ts";
import { programa } from "../../tools/installable/program.ts";
import { identitiesTool } from "../../tools/identities/identities.ts";
import { assignMindCard } from "../../tools/minds/mind-settings-actions.ts";
import { effect } from "../../house/facts.ts";
import { mcpDoor } from "./mcp-handler.ts";

function fixture() {
  const personal = sampleBody.herramientas.personal;
  const notes = programa(sampleMetadata, {
    ...sampleBody,
    herramientas: {
      ...sampleBody.herramientas,
      personal: {
        ...personal,
        needs: () => [{ target: "same", why: "Revisá la nota" }],
        acts: {
          ...personal.acts,
          add: { ...personal.acts.add, execution: { at: "either", tool: "notes", version: "1" } },
        },
      },
    },
  });
  const composition = componer({ ...sampleOptions, programas: [notes] });
  const registry = composition.program.registry.map(tool => ({
    ...tool,
    acts: { ...tool.acts, "assign-mind-card": assignMindCard<DistributionOf<readonly [typeof notes]>>("notas") },
  }));
  const rig = distributionRig({
    ...composition.program,
    registry: [...registry, identitiesTool(registry, "ana", false)],
  });
  const credential = randomUUID();
  const door = mcpDoor(rig.house(), new Map([[credential, { identity: "ana", door: "agent" }]]), {
    name: "Prueba",
    version: "1",
    limits: { recentLines: 20 },
  });
  return { rig, door, credential };
}

function populate(rig: ReturnType<typeof fixture>["rig"]) {
  const bus = rig.house().bus;
  bus.emit(effect("scene", { general: "La casa abre", to: { ana: "Revisá las notas", beto: "Otra parte" } }, "ana"));
  bus.emit(effect("device-registered", { id: "desktop", name: "Escritorio", publicKey: "fixture" }, "ana"));
  bus.emit(effect("device-accepted", { device: "desktop" }, "ana"));
  bus.emit(
    effect(
      "device-connected",
      {
        device: "desktop",
        connection: "fixture",
        inventory: [{ tool: "notes", version: "1", actions: ["personal/add"] }],
      },
      "ana",
    ),
  );
  bus.emit(
    effect(
      "mind-cards-published",
      {
        mind: "mind:notas",
        cards: [{ card: "approved", version: "1", capabilities: [] }],
      },
      "ana",
    ),
  );
}

async function readProgram(
  call: (name: string, args: unknown) => Promise<ReturnType<typeof mcpResult>>,
  program: string,
) {
  const root = await call("read", { program });
  expect(root.isError).toBe(false);
  for (const folder of mcpList(root)) {
    const reading = await call("read", { program, target: folder.id });
    expect(reading.isError).toBe(false);
    if (program === "notas")
      for (const object of mcpList(reading))
        expect((await call("read", { program, target: object.id })).isError).toBe(false);
  }
}

it("reviews every key returned by read, actions, act and wait on a populated program house", async () => {
  const { rig, door, credential } = fixture();
  const seen = new Set<string>();
  const called = new Set<string>();
  const call = async (name: string, args: unknown = {}) => {
    const response = await door.handle({
      method: "POST",
      path: "/mcp",
      headers: { authorization: `Bearer ${credential}`, "content-type": "application/json" },
      body: () => [
        Buffer.from(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name, arguments: args },
          }),
        ),
      ],
    });
    expect(response.status).toBe(200);
    const value: unknown = JSON.parse(response.body);
    checkMcpVocabulary(value, name, seen);
    called.add(name);
    return mcpResult(response.body);
  };
  try {
    populate(rig);
    const offered = await call("actions");
    expect(mcpActions(offered).length).toBeGreaterThan(0);
    expect(mcpRows(offered)).toContainEqual(
      expect.objectContaining({
        program: "notas",
        tool: "notas/personal",
        action: "personal/add",
        name: "anotar",
        subject: "tool",
        purpose: "guardar una nota",
        input: { type: "object", properties: {} },
        execution: { at: "either", tool: "notes", version: "1" },
        destinations: [{ kind: "house" }, { kind: "device", device: "desktop", name: "Escritorio" }],
      }),
    );
    const accepted = await call("act", {
      program: "notas",
      action: "personal/add",
      target: "notas/personal",
      data: {},
      destination: { kind: "house" },
    });
    expect(accepted).toMatchObject({ isError: false, content: [{ text: "Anotada" }] });
    const overview = mcpRows(await call("read"));
    expect(overview).toMatchObject({
      identity: "ana",
      programs: [{ id: "notas", purpose: "Guardar notas" }, { id: "identities" }],
      scenes: [{ identity: "ana", general: "La casa abre", addressed: "Revisá las notas" }],
    });
    for (const program of ["notas", "identities"]) await readProgram(call, program);
    const target = "notas/personal/same";
    expect((await call("actions", { program: "notas", target })).isError).toBe(false);
    expect(mcpRows(await call("wait", { since: 0, seconds: 0 }))).toEqual({
      seq: rig.state().through,
      changed: true,
    });
    expect(mcpRows(await call("wait", { since: rig.state().through, seconds: 0 }))).toEqual({
      seq: rig.state().through,
      changed: false,
    });
    for (const name of ["read", "actions", "act"])
      expect(
        (await call(name, { program: "missing", ...(name === "act" ? { action: "missing", data: {} } : {}) })).isError,
      ).toBe(true);
    expect([...called].sort()).toEqual(["act", "actions", "read", "wait"]);
    for (const key of [
      "addressed",
      "recipients",
      "needs",
      "news",
      "detail",
      "opens",
      "reason",
      "choices",
      "mind-cards",
      "value",
      "input",
      "properties",
      "execution",
      "destinations",
      "device",
      "count",
      "changed",
    ])
      expect(seen.has(key), key).toBe(true);
  } finally {
    await door.close();
    rig.close();
  }
});

it.each([
  "identidad",
  "desde",
  "escenas",
  "programas",
  "avisos",
  "parte",
  "herramienta",
  "nombre",
  "sobre",
  "para",
  "entrada",
  "opciones",
  "motivo",
  "cambio",
  "newUnreviewedField",
])("rejects the unreviewed key %s at every wire nesting", key => {
  const unexpected = { [key]: "Texto en castellano" };
  for (const value of [
    unexpected,
    { content: [{ type: "text", text: JSON.stringify({ scenes: [unexpected] }) }] },
    { content: [{ type: "text", text: `${JSON.stringify({ id: "first" })}\n${JSON.stringify(unexpected)}` }] },
    { input: { properties: { name: unexpected } } },
    { choices: { "mind-cards": [unexpected] } },
  ])
    expect(() => checkMcpVocabulary(value)).toThrow(`.${key}`);
});
