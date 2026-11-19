// Exercise the production local and remote terminal renderers against one historical house without a listener.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { startHouse, localPorts } from "../../src/runtime/house-runtime.ts";
import { shopProgram, shopShown } from "./shop.ts";
import { mcpDoor } from "../../src/doors/mcp/mcp-handler.ts";
import { httpDoorFetch } from "./http-door-fetch.ts";
import { openRemoteTerminal, startTerminal } from "../../src/doors/terminal/public-terminal.ts";
import { houseRouter } from "../../src/surface/bridge/assembly/house-router.ts";
const [home, mode] = process.argv.slice(2);
if (!home) throw new Error("Missing fixture house");
const h = startHouse(home, {
  ...shopProgram,
  identities: true,
  by: "house",
  creation: { admin: "ana", assignments: [{ identity: "beto", tools: [] }] },
});
const door = mcpDoor(h, { name: "Audit", version: "1", limits: { recentLines: 20 } });
const transport = httpDoorFetch(door.handle);
writeFileSync(join(home, "invitation-id-fixture"), [...h.tools.state().house.doors.invitations.keys()][0] ?? "");
try {
  if (mode === "local") {
    const router = houseRouter(localPorts(h, "ana", { recentLines: 20 }), shopShown);
    try {
      await startTerminal(process.stdout, process.stdin, router);
    } finally {
      router.stop();
    }
  } else {
    globalThis.fetch = transport.send;
    await openRemoteTerminal(
      "http://localhost/mcp",
      "synthetic-upgrade-founder",
      { ...shopProgram, identities: true },
      shopShown,
    );
  }
} finally {
  transport.disconnect();
  await door.close();
  h.close();
}
