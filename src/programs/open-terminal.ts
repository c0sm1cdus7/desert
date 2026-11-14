// The program's public terminal composition: one router for both local and remote HousePorts.
import { terminalError } from "./terminal-error.ts";
import type { Composition } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import type { Shown } from "../surface/bridge/house-ports.ts";
import { connectTerminal } from "./terminal-client.ts";
import { socketPorts } from "../doors/socket/socket-ports.ts";
import { houseRouter } from "../surface/bridge/house-router.ts";
import { startTerminal } from "../doors/terminal/boot.ts";
export async function openProgramTerminal<X extends Program>(
  root: string,
  home: string,
  token: string,
  program: Composition<X>,
  shown: Shown<X>,
): Promise<void> {
  try {
    await runTerminal<X>(root, home, token, program, shown);
  } catch (error) {
    process.stderr.write(`${terminalError(error)}\n`);
    process.exitCode = 1;
  }
}
async function runTerminal<X extends Program>(
  root: string,
  home: string,
  token: string,
  program: Composition<X>,
  shown: Shown<X>,
) {
  const connection = await connectTerminal<X>(root, home, token);
  const router = houseRouter(
    socketPorts(connection, { registry: program.registry, limits: { recentLines: 40 } }),
    shown,
  );
  const stop = new AbortController();
  const unwatch = connection.watch(() => {
    if (connection.failure()) stop.abort();
  });
  try {
    await startTerminal(process.stdout, process.stdin, router, stop.signal);
    if (connection.failure()) throw new Error(connection.failure());
  } finally {
    unwatch();
    router.stop();
    connection.close();
  }
}
