// Exercise actual MCP envelopes, JSON text and JSON lines against a closed, reviewed English vocabulary.
import { randomUUID } from "node:crypto";
import { Type } from "@sinclair/typebox";
import { expect, it } from "vitest";
import { doorHouse, rpcRequest } from "../../../tests/support/door-house.ts";
import { distributionRig } from "../../../tests/support/distribution-rig.ts";
import { sampleBody, sampleMetadata, sampleOptions } from "../../../tests/support/installable-program.ts";
import { checkMcpVocabulary } from "../../../tests/support/mcp-vocabulary.ts";
import { mcpActions, mcpList, mcpResult, mcpRows } from "../../../tests/support/mcp-results.ts";
import { compose, type DistributionOf } from "../../runtime/distributions/compose.ts";
import { defineProgram } from "../../tools/installable/program.ts";
import { identitiesTool } from "../../tools/identities/identities.ts";
import { assignMindCard } from "../../tools/minds/mind-settings-actions.ts";
import { effect } from "../../house/facts.ts";
import { mcpDoor } from "./mcp-handler.ts";
import { requestDigest } from "../socket/requests/public-message.ts";

function fixture() {
  const personal = sampleBody.tools.personal;
  const notes = defineProgram(sampleMetadata, {
    ...sampleBody,
    tools: {
      ...sampleBody.tools,
      personal: {
        ...personal,
        needs: () => [{ target: "same", why: "Revisá la nota" }],
        acts: {
          ...personal.acts,
          add: { ...personal.acts.add, execution: { at: "either", tool: "notes", version: "1" } },
          edit: { ...personal.acts.edit, input: Type.Object({ value: Type.String({ secret: true }) }) },
        },
      },
    },
  });
  const composition = compose({ ...sampleOptions, programs: [notes] });
  const registry = composition.program.registry.map(tool => ({
    ...tool,
    acts: { ...tool.acts, "assign-mind-card": assignMindCard<DistributionOf<readonly [typeof notes]>>("notes") },
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
        mind: "mind:notes",
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
    if (program === "notes")
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
        action: "personal/edit",
        input: { type: "object", properties: { value: { type: "string", secret: true } }, required: ["value"] },
      }),
    );
    expect(mcpRows(offered)).toContainEqual(
      expect.objectContaining({
        program: "notes",
        tool: "notes/personal",
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
      program: "notes",
      action: "personal/add",
      target: "notes/personal",
      data: {},
      destination: { kind: "house" },
    });
    expect(accepted).toMatchObject({ isError: false, content: [{ text: "Anotada" }] });
    const overview = mcpRows(await call("read"));
    expect(overview).toMatchObject({
      identity: "ana",
      programs: [{ id: "notes", purpose: "Guardar notas" }, { id: "identities" }],
      scenes: [{ identity: "ana", general: "La casa abre", addressed: "Revisá las notas" }],
    });
    for (const program of ["notes", "identities"]) await readProgram(call, program);
    const target = "notes/personal/same";
    expect((await call("actions", { program: "notes", target })).isError).toBe(false);
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
      "secret",
    ])
      expect(seen.has(key), key).toBe(true);
  } finally {
    await door.close();
    rig.close();
  }
});

it.each(["new", "invite"])("reviews the real private %s receipt", async action => {
  const h = doorHouse(),
    door = h.door();
  try {
    const response = await door.handle(
      rpcRequest(h.founder, {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "act",
          arguments: {
            program: "identities",
            action,
            target: action === "new" ? "identities" : "identities/beto",
            data: action === "new" ? { identity: "luz", tools: [], language: "es" } : { door: "agent" },
          },
        },
      }),
    );
    expect(response.status).toBe(200);
    checkMcpVocabulary(JSON.parse(response.body));
    const result = mcpResult(response.body);
    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(2);
    expect(result.content[1]).toMatchObject({ type: "text" });
    expect(result.content[1]?.text).toMatch(/^Invitación: [2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4} · /u);
    expect(result.content[1]?.text).toContain("vence en 24 horas · compartila con la persona que va a entrar.");
  } finally {
    await door.close();
    h.close();
  }
});

it.each(["unknown", "ping", "tools/call"])("reviews the correlated %s envelope", async method => {
  const h = doorHouse(),
    door = h.door();
  try {
    const response = await door.handle(
      rpcRequest(h.founder, {
        jsonrpc: "2.0",
        id: h.founder,
        method,
        params: { name: "read", arguments: {} },
      }),
    );
    expect(response.status).toBe(200);
    const value: unknown = JSON.parse(response.body);
    const seen = checkMcpVocabulary(value);
    expect(value).toMatchObject({ jsonrpc: "2.0", id: requestDigest(h.founder), correlation: "sha256" });
    expect(seen.has("correlation")).toBe(true);
    if (method === "unknown") {
      expect(value).toMatchObject({ error: { code: -32601, message: "Ese método no está disponible." } });
      for (const key of ["error", "code", "message"]) expect(seen.has(key), key).toBe(true);
    } else if (method === "tools/call") {
      expect(mcpResult(response.body).isError).toBe(false);
      expect(mcpRows(mcpResult(response.body))).toMatchObject({ identity: "ana" });
      expect(seen.has("programs")).toBe(true);
      expect(seen.has("identity")).toBe(true);
    } else expect(value).toMatchObject({ result: {} });
    expect(response.body.includes(h.founder)).toBe(false);
  } finally {
    await door.close();
    h.close();
  }
});

it.each([
  "sceneList",
  "fragment",
  "toolName",
  "envelope",
  "purposeFor",
  "optionSet",
  "correlationKey",
  "programName",
  "sceneText",
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
