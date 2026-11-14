// A detached relay bounds all child output, including native diagnostics, and lives until both pipes close.
import { spawn } from "node:child_process";
import { closeSync } from "node:fs";
import { boundedOutput } from "./bounded-output.ts";
const output = boundedOutput(4);
const child = spawn(process.execPath, process.argv.slice(2), { stdio: ["ignore", "pipe", "pipe", "ipc"] });
let failed: object | undefined;
child.stdout?.on("data", output);
child.stderr?.on("data", output);
child.on("message", (message: unknown) => {
  if (message && typeof message === "object" && "error" in message) failed = message;
  else if (message && typeof message === "object" && process.connected) process.send?.(message);
});
child.on("error", () => {
  process.exitCode = 1;
});
for (const signal of ["SIGTERM", "SIGINT"] as const) process.on(signal, () => child.kill(signal));
child.on("close", code => {
  closeSync(4);
  if (failed && process.connected) process.send?.(failed);
  if (process.connected) process.disconnect();
  process.exitCode = code ?? 1;
});
