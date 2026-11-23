// The gate's shop derives its version from its calculations, including the base, with no manual evidence exemption.
import { join } from "node:path";
import { codeProjectionVersion } from "../../src/runtime/calculation-version.ts";
import { gateSample, gateSampleWords } from "./gate-sample.ts";
import { shopProgram, shopShown } from "./shop.ts";
export const program = {
  ...shopProgram,
  identities: true,
  registry: [...shopProgram.registry, gateSample],
  projectionVersion: codeProjectionVersion([
    join(import.meta.dirname, "../../src"),
    join(import.meta.dirname, "shop.ts"),
    join(import.meta.dirname, "shop-folds.ts"),
    join(import.meta.dirname, "shop-program.ts"),
    join(import.meta.dirname, "installable-body.ts"),
    join(import.meta.dirname, "gate-sample.ts"),
    join(import.meta.dirname, "gate-sample.texts.ts"),
  ]),
};
export const shown = { ...shopShown, words: { ...shopShown.words, sample: gateSampleWords } };

// Step 1 test credentials and custody remain entirely in memory; production pairing belongs to step 3.
import type { DoorKey } from "../../src/doors/socket/peers/socket-peer.ts";
import { MemoryHouseKeys } from "../../src/keychain/custody/house-keys.ts";
export const server = {
  by: "house",
  creation: {
    admin: "ana",
    language: "es" as const,
    assignments: ["ana", "beto"].map(identity => ({ identity, tools: ["sales", "payments"], language: "es" as const })),
  },
  keys: new Map<string, DoorKey>([
    ["ana-terminal", { identity: "ana", door: "terminal" }],
    ["beto-terminal", { identity: "beto", door: "terminal" }],
  ]),
  secretKeys: new MemoryHouseKeys(),
};

import { runProgramServer } from "../../src/doors/socket/server/server-process.ts";
import { defineProgram } from "../../src/tools/installable/program.ts";
import { compose } from "../../src/runtime/distributions/compose.ts";
import { sampleDefinition, sampleBody } from "./installable-body.ts";
import { startCloudHouse } from "../../src/runtime/cloud-house.ts";
import { founderDoorKeys } from "../../src/doors/socket/peers/environment-door-keys.ts";
import { mcpDoor } from "../../src/doors/mcp/mcp-handler.ts";
import { serveMcp } from "../../src/doors/mcp/mcp-http.ts";
import type { KeyEnvironment } from "../../src/runtime/environment-key.ts";
export async function runSample(home: string, args: readonly string[], environment: KeyEnvironment) {
  if (args[0] === "--installable") {
    const installed = compose({
      programs: [
        defineProgram({ ...sampleDefinition, code: [join(import.meta.dirname, "installable-body.ts")] }, sampleBody),
      ],
      identities: true,
      minds: { assistants: false, programs: [] },
      shown: { code: [import.meta.filename], locale: shopShown.locale },
    });
    await runProgramServer(
      installed.program,
      { ...server, creation: { admin: "ana", language: "es" as const, assignments: [] } },
      home,
    );
  } else if (args[0] === "--cloud") await runCloudSample(home, args, environment);
  else await runProgramServer(program, server, home);
}

async function runCloudSample(home: string, args: readonly string[], environment: KeyEnvironment) {
  // Explicit cloud example: the host supplies its address, port and environment; importing the gate reads none.
  const host = args[1];
  const port = Number(args[2]);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Missing cloud host and port");
  const cloud = startCloudHouse(
    {
      ...program,
      by: server.by,
      creation: server.creation,
      founderDoorKeys: founderDoorKeys(environment, [{ variable: "DESERT_DOOR_KEY", identity: "ana", door: "agent" }]),
    },
    home,
    environment,
    "DESERT_ROOT_KEY",
  );
  const listener = await serveMcp(mcpDoor(cloud.door, { name: "Almacén", version: "1", limits: { recentLines: 20 } }), {
    host,
    port,
  });
  const close = () => {
    process.removeListener("SIGINT", close);
    process.removeListener("SIGTERM", close);
    void listener.close();
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

if (import.meta.main) {
  const home = process.argv[2];
  if (!home) throw new Error("Missing house path");
  await runSample(home, process.argv.slice(3), process.env);
}
