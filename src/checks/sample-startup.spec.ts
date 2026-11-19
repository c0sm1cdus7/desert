// The executable sample connects public composition and cloud APIs; only network listeners are replaced.
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, it, vi } from "vitest";
import { runSample } from "../../tests/support/shop-program.ts";
import * as socket from "../doors/socket/server/server-process.ts";
import * as http from "../doors/mcp/mcp-http.ts";
import { mcpResult } from "../../tests/support/mcp-results.ts";

it("starts the installable example through the public program and distribution constructors", async () => {
  const serve = vi.spyOn(socket, "runProgramServer").mockResolvedValue(undefined);
  try {
    await runSample("unused", ["--installable"], {});
    const composition = serve.mock.calls[0]?.[0];
    expect(composition?.registry.map(tool => tool.id)).toEqual(["notas"]);
    expect(composition?.slices.initial.notas).toEqual({ count: 0 });
    expect(serve.mock.calls[0]?.[1].creation).toEqual({ admin: "ana", assignments: [] });
  } finally {
    serve.mockRestore();
  }
});

it("starts the cloud example with persisted founder access and serves MCP without opening a port", async () => {
  const home = mkdtempSync(join(tmpdir(), "sample-cloud-"));
  const before = process.listeners("SIGTERM");
  const environment = {
    DESERT_ROOT_KEY: Buffer.alloc(32, 71).toString("hex"),
    DESERT_DOOR_KEY: Buffer.alloc(32, 79).toString("hex"),
  };
  let door: Parameters<typeof http.serveMcp>[0] | undefined;
  const serve = vi.spyOn(http, "serveMcp").mockImplementation((given, options) => {
    door = given;
    expect(options).toEqual({ host: "127.0.0.1", port: 8080 });
    return Promise.resolve({ address: null, close: given.close });
  });
  try {
    await runSample(home, ["--cloud", "127.0.0.1", "8080"], environment);
    expect(serve).toHaveBeenCalledOnce();
    if (!door) throw new Error("Missing cloud door");
    const reply = await door.handle({
      method: "POST",
      path: "/mcp",
      headers: { authorization: `Bearer ${environment.DESERT_DOOR_KEY}`, "content-type": "application/json" },
      body: () => [
        Buffer.from(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: {
              name: "actuar",
              arguments: { programa: "sales", accion: "register", datos: { sale: "cloud", total: 100 } },
            },
          }),
        ),
      ],
    });
    expect(mcpResult(reply.body)).toMatchObject({ isError: false, content: [{ text: "Registrada · cloud" }] });
  } finally {
    await door?.close();
    for (const listener of process.listeners("SIGTERM")) if (!before.includes(listener)) listener("SIGTERM");
    serve.mockRestore();
    rmSync(home, { recursive: true, force: true });
  }
});

it("rejects a missing cloud address before opening storage or listening", async () => {
  const serve = vi.spyOn(http, "serveMcp");
  try {
    await expect(runSample("unused", ["--cloud"], {})).rejects.toThrow("Missing cloud host and port");
    expect(serve).not.toHaveBeenCalled();
  } finally {
    serve.mockRestore();
  }
});
