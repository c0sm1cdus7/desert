// A test composition, not a terminal entry point; all keys exist only in this test's memory.
import { startHouse } from "../../src/runtime/house-runtime.ts";
import { serveHouse } from "../../src/doors/socket/server/serve.ts";
import { WriterAlreadyOpen } from "../../src/storage/writer-lease.ts";
import { MemoryHouseKeys } from "../../src/keychain/custody/house-keys.ts";
import { shopProgram } from "./shop.ts";
const home = process.argv[2];
if (!home) throw new Error("Missing house path");
try {
  const house = startHouse(home, {
    ...shopProgram,
    by: "house",
    secretKeys: new MemoryHouseKeys(),
    creation: { admin: "ana", assignments: [{ identity: "ana", tools: ["sales", "payments"] }] },
  });
  await serveHouse(house, home, new Map([["ana-terminal", { identity: "ana", door: "terminal" }]]));
  process.stdout.write("ready\n");
} catch (error) {
  if (error instanceof WriterAlreadyOpen) process.stderr.write(`${error.message}\n`);
  else {
    const code = error instanceof Error && "code" in error ? error.code : undefined;
    process.stderr.write(code === "EPERM" ? "House startup failed (EPERM)\n" : "House startup failed\n");
  }
  process.exitCode = 1;
}
