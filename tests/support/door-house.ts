// A temporary real journal, synthetic founders and a controllable clock for door lifecycle tests.
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { mcpDoor } from "../../src/doors/mcp/mcp-handler.ts";
import { liveDoorKeys } from "../../src/doors/socket/peers/live-door-keys.ts";
import { type FounderDoorKeys } from "../../src/runtime/door-access.ts";
import { startHouse } from "../../src/runtime/house-runtime.ts";
import { shopProgram } from "./shop.ts";
export function doorHouse(founders?: FounderDoorKeys) {
  const home = mkdtempSync("/tmp/desert-door-");
  let at = 1_800_000_000_000;
  const founder = randomBytes(32).toString("base64url");
  const options = doorOptions(founder, founders);
  const time = { now: () => at, wait: () => () => {} };
  let house = startHouse(home, options, time);
  const access = () => liveDoorKeys(house);
  const act = async (action: string, input: unknown, target = "identities", by = "ana") => {
    house.tools.act({ act: "attend", input: { target } }, house.tools.state().through, by);
    const result = house.tools.act({ act: action, target, input }, house.tools.state().through, by);
    return result.status === "processing" ? await result.completion : result;
  };
  return {
    home,
    founder,
    house: () => house,
    access,
    act,
    advance: (milliseconds: number) => {
      at += milliseconds;
    },
    reopen: () => {
      house.close();
      house = startHouse(home, options, time);
    },
    door: () => mcpDoor(house, { name: "Test", version: "1", limits: { recentLines: 20 } }),
    history: () => JSON.stringify(house.journal.replay<unknown[]>([], (events, event) => [...events, event])),
    close: () => {
      house.close();
      rmSync(home, { recursive: true, force: true });
    },
  };
}
export function invitationCode(result: { private?: string | undefined }): string {
  const code = result.private?.match(/[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}/)?.[0];
  if (!code) throw new Error("Missing invitation receipt");
  return code;
}
export function redemptionRequest(code: string) {
  return {
    method: "POST",
    path: "/door/invitations/redeem",
    headers: { "content-type": "application/json" },
    body: () => [Buffer.from(JSON.stringify({ code }))],
  };
}
export function rpcRequest(key: string, message: unknown = { jsonrpc: "2.0", id: 1, method: "ping" }) {
  return {
    method: "POST",
    path: "/mcp",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: () => [Buffer.from(JSON.stringify(message))],
  };
}

function doorOptions(founder: string, founders?: FounderDoorKeys) {
  return {
    ...shopProgram,
    identities: true,
    by: "house",
    creation: {
      admin: "ana",
      assignments: [
        { identity: "ana", tools: [] },
        { identity: "beto", tools: [] },
      ],
    },
    founderDoorKeys: founders ?? {
      read: () => new Map([[founder, { identity: "ana", door: "agente" as const }]]),
      present: () => false,
    },
  };
}
