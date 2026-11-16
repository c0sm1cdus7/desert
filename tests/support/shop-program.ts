// The gate's shop derives its version from its calculations, including the base, with no manual evidence exemption.
import { join } from "node:path";
import { codeProjectionVersion } from "../../src/runtime/calculation-version.ts";
import { shopProgram, shopShown } from "./shop.ts";
export const program = {
  ...shopProgram,
  projectionVersion: codeProjectionVersion([
    join(import.meta.dirname, "../../src"),
    join(import.meta.dirname, "shop.ts"),
    join(import.meta.dirname, "shop-folds.ts"),
    join(import.meta.dirname, "shop-program.ts"),
  ]),
};
export const shown = shopShown;

// Step 1 test credentials and custody remain entirely in memory; production pairing belongs to step 3.
import { MemoryHouseKeys } from "../../src/keychain/custody/house-keys.ts";
import type { DoorKey } from "../../src/doors/socket/peers/socket-peer.ts";
export const server = {
  by: "house",
  creation: {
    admin: "ana",
    assignments: ["ana", "beto"].map(identity => ({ identity, tools: ["sales", "payments"] })),
  },
  keys: new Map<string, DoorKey>([
    ["ana-terminal", { identity: "ana", door: "terminal" }],
    ["beto-terminal", { identity: "beto", door: "terminal" }],
  ]),
  secretKeys: new MemoryHouseKeys(),
};

import { runProgramServer } from "../../src/doors/socket/server/server-process.ts";
if (import.meta.main) {
  const home = process.argv[2];
  if (!home) throw new Error("Missing house path");
  await runProgramServer(program, server, home);
}
