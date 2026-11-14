import { duplexPair } from "node:stream";
import { houseDoor } from "../../src/doors/socket/house-door.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { MemoryHouseKeys } from "../../src/adapters/secrets/custody/house-keys.ts";
import { startHouse } from "../../src/programs/house-runtime.ts";
import { serveHouse, type DoorKey } from "../../src/doors/socket/serve.ts";
import { shopProgram, paymentsTool } from "./shop.ts";
import { probe } from "./socket-probe.ts";
export const doorKeys: ReadonlyMap<string, DoorKey> = new Map([
  ["ana-terminal", { identity: "ana", door: "terminal" }],
  ["beto-terminal", { identity: "beto", door: "terminal" }],
  ["beto-agente", { identity: "beto", door: "agente" }],
  ["nadie-terminal", { identity: "nadie", door: "terminal" }],
  ["mente-terminal", { identity: "mind:payments", door: "terminal" }],
]);
function program(hold?: Promise<void>) {
  const receive = paymentsTool.acts.receive;
  if (!hold || !receive) return shopProgram;
  const delayed = {
    ...paymentsTool,
    acts: {
      receive: {
        ...receive,
        run: async (...args: Parameters<typeof receive.run>) => {
          await hold;
          return receive.run(...args);
        },
      },
    },
  };
  return { ...shopProgram, registry: [shopProgram.registry[0], delayed].filter(tool => tool !== undefined) };
}
function opening(hold?: Promise<void>) {
  const home = mkdtempSync("/tmp/casa-s-");
  const options = {
    ...program(hold),
    by: "house",
    secretKeys: new MemoryHouseKeys(),
    creation: {
      admin: "ana",
      assignments: ["ana", "beto"].map(identity => ({ identity, tools: ["sales", "payments"] })),
    },
  };
  const time = { now: () => 1_800_000_000_000, wait: () => () => {} };
  return { home, open: () => startHouse(home, options, time) };
}
export async function socketHouse(transport: "unix" | "stream" = "unix", hold?: Promise<void>) {
  const { home, open } = opening(hold);
  let house = open();
  let door = transport === "stream" ? houseDoor(house, doorKeys) : undefined;
  const listen = async () => (door ? { path: "", close: door.close } : serveHouse(house, home, doorKeys));
  let server: Awaited<ReturnType<typeof listen>>;
  try {
    server = await listen();
  } catch (error) {
    house.close();
    rmSync(home, { recursive: true, force: true });
    throw error;
  }
  const clients: Awaited<ReturnType<typeof probe>>[] = [];
  return {
    home,
    attach: (stream: import("node:stream").Duplex) => door?.accept(stream),
    house: () => house,
    server: () => server,
    openAgain: open,
    reopen: async () => {
      clients.forEach(client => client.socket.destroy());
      await server.close();
      house = open();
      door = transport === "stream" ? houseDoor(house, doorKeys) : undefined;
      server = await listen();
    },
    client: async (token?: string) => {
      const client = await clientOf(server.path, door, token);
      clients.push(client);
      return client;
    },
    close: () => clean(home, server, clients),
  };
}
async function clientOf(path: string, door: ReturnType<typeof houseDoor> | undefined, token?: string) {
  const pair = door ? duplexPair() : undefined;
  const client = await probe(pair?.[0] ?? path);
  if (pair) door?.accept(pair[1]);
  if (token) {
    client.hello(token);
    await client.until(() => client.messages.some(m => m.tipo === "bienvenida"));
  }
  return client;
}

async function clean(
  home: string,
  server: { close: () => Promise<{ remaining: number }> },
  clients: readonly Awaited<ReturnType<typeof probe>>[],
) {
  clients.forEach(client => client.socket.destroy());
  try {
    await server.close();
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}
