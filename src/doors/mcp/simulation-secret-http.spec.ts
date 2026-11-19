// Exercises simulation redaction through a real localhost HTTP port with generated test credentials.
import { request } from "node:http";
import { expect, it } from "vitest";
import { mcpHouse } from "../../../tests/support/mcp-house.ts";
import { shopRegistry } from "../../../tests/support/shop.ts";
import { simulationShapes, simulationMarker, publicLimit } from "../../../tests/support/simulation-house.ts";
import { rulesTool } from "../../tools/rules/rules.ts";
import { rulesTexts } from "../../texts/rules.texts.ts";
import { mcpResult } from "../../../tests/support/mcp-results.ts";
import { serveMcp } from "./mcp-http.ts";
it.each(["handler", "HTTP"])("never returns or records secret sample material received over %s", async transport => {
  const schema = simulationShapes[2];
  if (!schema) throw new Error("Missing union schema");
  const registry = shopRegistry.map(tool =>
    tool.id === "sales"
      ? {
          ...tool,
          acts: Object.fromEntries(
            Object.entries(tool.acts).map(([name, act]) => [
              name,
              name === "register" ? { ...act, input: schema } : act,
            ]),
          ),
        }
      : tool,
  );
  const h = mcpHouse([...registry, rulesTool(registry)]);
  let server: Awaited<ReturnType<typeof serveMcp>> | undefined;
  try {
    if (transport === "HTTP") server = await serveMcp(h.door, { host: "127.0.0.1", port: 0 });
    const call = async (action: string, input: unknown) => {
      if (transport === "handler") return (await h.call("act", { program: "rules", action: action, data: input })).body;
      const address = server?.address;
      if (!address || typeof address === "string") throw new Error("Missing localhost address");
      return new Promise<string>((resolve, reject) => {
        const outgoing = request(
          {
            host: "127.0.0.1",
            port: address.port,
            path: "/mcp",
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${h.ana}` },
          },
          response => {
            let text = "";
            response.setEncoding("utf8");
            response.on("data", chunk => {
              text += String(chunk);
            });
            response.on("end", () => resolve(text));
          },
        );
        outgoing.on("error", reject);
        outgoing.end(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name: "act", arguments: { program: "rules", action: action, data: input } },
          }),
        );
      });
    };
    const saved = await call("save", { ...publicLimit, action: { tool: "sales", act: "register" } });
    expect(mcpResult(saved).isError).toBe(false);
    expect(saved).toContain(rulesTexts.saved);
    for (const input of [
      { kind: "first", amount: 11, nested: { token: simulationMarker } },
      { kind: "first", amount: 11, nested: {} },
    ]) {
      const result = await call("simulate", {
        id: publicLimit.id,
        version: 1,
        samples: JSON.stringify([{ actor: "ana", now: 0, input }]),
      });
      expect(mcpResult(result).isError).toBe(false);
      expect(result).toContain("Frena");
      expect(result.includes(simulationMarker)).toBe(false);
    }
    h.rig.restart();
    expect(JSON.stringify(h.rig.facts()).includes(simulationMarker)).toBe(false);
    expect(h.rig.state().tools.sales.size).toBe(0);
  } finally {
    if (server) await server.close();
    await h.close();
  }
});
