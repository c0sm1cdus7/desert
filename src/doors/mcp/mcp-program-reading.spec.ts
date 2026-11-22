import { mcpResult, mcpList, mcpRows as rows, mcpActions, mcpCatalog } from "../../../tests/support/mcp-results.ts";
import { randomUUID } from "node:crypto";
import { request } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { distributionRig } from "../../../tests/support/distribution-rig.ts";
import { sampleOptions, sampleBody } from "../../../tests/support/installable-program.ts";
import { compose, type DistributionOf } from "../../runtime/distributions/compose.ts";
import { defineProgram } from "../../tools/installable/program.ts";
import { effect } from "../../house/facts.ts";
import { houseTools } from "../../surface/bridge/assembly/house-tools.ts";
import { localPorts } from "../../runtime/house-runtime.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { mcpTexts } from "../../texts/mcp.texts.ts";
import { mcpDoor } from "./mcp-handler.ts";
import { serveMcp } from "./mcp-http.ts";
import type { DoorKey } from "../socket/peers/socket-peer.ts";
const archive = defineProgram(
  {
    id: "archivo",
    version: "1.0.0",
    desert: 1,
    code: [import.meta.filename],
    facts: [],
    initial: () => 0,
  },
  {
    purpose: "Leer el archivo",
    words: { ...sampleBody.words, name: "Archivo", key: "r" },
    skill: sampleBody.skill,
    tools: {
      notes: {
        purpose: "Leer notas archivadas",
        words: sampleBody.words,
        acts: {},
        targets: () => ["same"],
        view: () => JSON.stringify({ id: "same", text: "Otra nota" }),
        summary: () => "Archivadas",
      },
    },
    fold: own => own,
    summary: () => "Archivo",
  },
);
const options = { ...sampleOptions, programs: [...sampleOptions.programs, archive] } as const;
describe.each(["handler", "HTTP"])("installed program reading through MCP %s", transport => {
  const composition = compose(options);
  let rig: ReturnType<typeof distributionRig<DistributionOf<typeof options.programs>>>;
  let door: ReturnType<typeof mcpDoor>;
  let replayCredential = "";
  let server: Awaited<ReturnType<typeof serveMcp>> | undefined;
  let send: (method: string, params?: unknown, identity?: string) => Promise<string>;
  beforeEach(async () => {
    rig = distributionRig(composition.program);
    rig
      .house()
      .bus.emit(effect("granted", { version: 2, identity: "martin", kit: { version: 2, selections: [] } }, "ana"));
    const keys = new Map<string, DoorKey>();
    const credentials = new Map(
      ["ana", "martin"].map(identity => {
        const key = randomUUID();
        keys.set(key, { identity, door: "agent" });
        return [identity, key];
      }),
    );
    replayCredential = credentials.get("martin") ?? "";
    door = mcpDoor(rig.house(), keys, { name: "Prueba", version: "1", limits: { recentLines: 20 } });
    if (transport === "HTTP") server = await serveMcp(door, { host: "127.0.0.1", port: 0 });
    send = async (method, params, identity = "ana") => {
      const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
      const headers = { authorization: `Bearer ${credentials.get(identity)}`, "content-type": "application/json" };
      if (!server)
        return (await door.handle({ method: "POST", path: "/mcp", headers, body: () => [Buffer.from(body)] })).body;
      const address = server.address;
      if (!address || typeof address === "string") throw new Error("Missing TCP address");
      return new Promise<string>((resolve, reject) => {
        const outgoing = request(
          { host: "127.0.0.1", port: address.port, path: "/mcp", method: "POST", headers },
          response => {
            let text = "";
            response.setEncoding("utf8");
            response.on("data", chunk => {
              text += String(chunk);
            });
            response.on("end", () =>
              response.statusCode === 200 ? resolve(text) : reject(new Error(`HTTP ${response.statusCode}`)),
            );
          },
        );
        outgoing.on("error", reject);
        outgoing.end(body);
      });
    };
  });
  afterEach(async () => {
    if (server) await server.close();
    server = undefined;
    await door.close();
    rig.close();
  });
  const call = async (name: string, args: unknown, identity?: string) => {
    return mcpResult(await send("tools/call", { name, arguments: args }, identity));
  };
  const read = (target?: string, identity?: string) =>
    call("read", { program: "notes", ...(target === undefined ? {} : { target }) }, identity);
  const access = () => ({ rig, door, send, call, read, composition, replayCredential });
  readingCases(access);
  actionCases(access);
  replayCases(access);
});
type Context = Readonly<{
  replayCredential: string;
  rig: ReturnType<typeof distributionRig<DistributionOf<typeof options.programs>>>;
  door: ReturnType<typeof mcpDoor>;
  send: (method: string, params?: unknown, identity?: string) => Promise<string>;
  call: (name: string, args: unknown, identity?: string) => Promise<ReturnType<typeof mcpResult>>;
  read: (target?: string, identity?: string) => Promise<ReturnType<typeof mcpResult>>;
  composition: ReturnType<typeof compose<typeof options>>;
}>;
function readingCases(access: () => Context) {
  it("publishes optional targets and explains how to descend using returned ids", async () => {
    const { send } = access();
    const catalog = mcpCatalog(await send("tools/list"));
    for (const name of ["read", "actions"]) {
      const tool = catalog.find(tool => tool.name === name);
      expect(tool?.inputSchema.properties.target).toMatchObject({ type: "string" });
      expect(tool?.inputSchema.required ?? []).not.toContain("target");
    }
    const description = catalog.find(tool => tool.name === "read")?.description ?? "";
    for (const word of ["program", "herramienta", "objeto", "target", "id"]) expect(description).toContain(word);
  });
  it("reads program, both folders and objects with terminal destinations and current data", async () => {
    const { rig, read, call, composition } = access();
    const root = await read();
    expect(root.isError).toBe(false);
    const folders = mcpList(root);
    expect(folders.map((folder: { id: string }) => folder.id)).toEqual(["notes/personal", "notes/shared"]);
    const terminal = houseTools(rig.ports(), composition.shown).find(tool => tool.id === "notes");
    for (const folder of folders) {
      const reading = await read(folder.id);
      expect(reading.isError).toBe(false);
      const objects = mcpList(reading);
      expect(objects.map((object: { id: string }) => object.id)).toEqual(
        terminal
          ?.view(folder.id)
          .flatMap(stack => stack.rows)
          .map(row => row.opens),
      );
      for (const object of objects) expect(rows(await read(object.id))).toEqual({ count: 0 });
    }
    expect(
      (await call("act", { program: "notes", action: "personal/add", target: folders[0]?.id, data: {} })).isError,
    ).toBe(false);
    expect(rows(await read("notes/personal/same"))).toEqual({ count: 1 });
    expect(await read("notes")).toEqual(await read());
  });
  it.each(["notes/missing", "notes/personal/missing", "archivo", "archivo/notes/same"])(
    "rejects foreign or missing target %s clearly",
    async target => {
      const { rig, call } = access();
      const before = rig.state().through;
      for (const name of ["read", "actions"]) {
        expect(await call(name, { program: "notes", target: target })).toEqual({
          content: [{ type: "text", text: mcpTexts.action }],
          isError: true,
        });
      }
      expect(rig.state().through).toBe(before);
    },
  );
}
function actionCases(access: () => Context) {
  it("lists only each action's own destinations, reusable for reading and acting", async () => {
    const { read, call } = access();
    const actions = mcpActions(await call("actions", { program: "notes" }));
    expect(actions.map(action => [action.action, action.target])).toEqual([
      ["personal/add", "notes/personal"],
      ["personal/edit", "notes/personal/same"],
      ["personal/edit", "notes/personal/a%2Fb%23c"],
      ["shared/add", "notes/shared"],
      ["shared/edit", "notes/shared/same"],
      ["shared/edit", "notes/shared/a%2Fb%23c"],
    ]);
    for (const action of actions) {
      expect((await read(action.target)).isError).toBe(false);
      expect(
        (
          await call("act", {
            program: action.program,
            action: action.action,
            target: action.target,
            data: {},
          })
        ).isError,
      ).toBe(false);
    }
    expect(rows(await call("actions", { program: "notes", target: "notes/personal" }))).toHaveLength(1);
    expect(rows(await call("actions", { program: "notes", target: "notes/shared/same" }))).toHaveLength(1);
    expect(rows(await call("actions", { program: "notes", target: "notes" }))).toEqual([]);
  });
  it("lets an identity without the program read all levels, with actions disabled just like the terminal", async () => {
    const { rig, read, call, composition } = access();
    const terminal = houseTools(localPorts(rig.house(), "martin", { recentLines: 20 }), composition.shown).find(
      tool => tool.id === "notes",
    );
    for (const target of ["notes", "notes/personal", "notes/shared", "notes/personal/same", "notes/shared/a%2Fb%23c"]) {
      expect(await read(target, "martin")).toEqual(await read(target));
      const actions = mcpActions(await call("actions", { program: "notes", target: target }, "martin"));
      for (const action of actions) {
        expect(action.reason).toBe(toolTexts.kitRefusal("notes"));
        expect(terminal?.actsOn?.[action.action]?.off?.(target)).toBe(action.reason);
        const before = rig.state().through;
        expect(
          (await call("act", { program: "notes", action: action.action, target: target, data: {} }, "martin")).isError,
        ).toBe(true);
        expect(rig.state().through).toBe(before);
      }
    }
  });
  it("rejects a target without its program and malformed targets", async () => {
    const { send } = access();
    for (const name of ["read", "actions"]) {
      for (const args of [
        { target: "notes/personal" },
        { program: "notes", target: "" },
        { program: "notes", target: 4 },
      ]) {
        expect(JSON.parse(await send("tools/call", { name, arguments: args }))).toMatchObject({
          error: { code: -32602 },
        });
      }
    }
  });
}
function replayCases(access: () => Context) {
  it("keeps reading after a partial grant, revocation and replay without restoring write permission", async () => {
    const { rig, door, call, replayCredential } = access();
    rig.house().bus.emit(
      effect(
        "kit-set",
        {
          version: 2,
          holder: "martin",
          kit: { version: 2, selections: [{ kind: "action", program: "notes", tool: "personal", action: "add" }] },
        },
        "ana",
      ),
    );
    const granted = mcpActions(await call("actions", { program: "notes" }, "martin"));
    expect(granted.filter((action: { reason?: string }) => action.reason === undefined)).toMatchObject([
      { action: "personal/add", target: "notes/personal" },
    ]);
    expect(
      (await call("act", { program: "notes", action: "personal/add", target: "notes/personal", data: {} }, "martin"))
        .isError,
    ).toBe(false);
    rig
      .house()
      .bus.emit(effect("kit-set", { version: 2, holder: "martin", kit: { version: 2, selections: [] } }, "ana"));
    await door.close();
    rig.restart();
    const replayKey = replayCredential;
    const reopened = mcpDoor(
      rig.house(),
      new Map<string, DoorKey>([[replayKey, { identity: "martin", door: "agent" }]]),
      { name: "Prueba", version: "1", limits: { recentLines: 20 } },
    );
    try {
      for (const name of ["read", "actions"]) {
        const response = await reopened.handle({
          method: "POST",
          path: "/mcp",
          headers: { authorization: `Bearer ${replayKey}`, "content-type": "application/json" },
          body: () => [
            Buffer.from(
              JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: { name, arguments: { program: "notes", target: "notes/personal/same" } },
              }),
            ),
          ],
        });
        const result = mcpResult(response.body);
        expect(result.isError).toBe(false);
        if (name === "read") expect(rows(result)).toEqual({ count: 1 });
        else expect(rows(result)).toMatchObject([{ action: "personal/edit", reason: toolTexts.kitRefusal("notes") }]);
      }
    } finally {
      await reopened.close();
    }
  });
}
