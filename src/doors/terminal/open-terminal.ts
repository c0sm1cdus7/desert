// The program's public terminal composition: one router for both local and remote HousePorts.
import { terminalError } from "./terminal-error.ts";
import type { Composition } from "../../tools/promises.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { Shown } from "../../surface/bridge/ports/house-ports.ts";
import { connectRemoteTerminal } from "./remote-terminal-client.ts";
import type { SocketConnection } from "../socket/client/socket-connection.ts";
import { connectTerminal } from "./terminal-client.ts";
import { openHouseRouter } from "../socket/client/open-house-router.ts";
import { startTerminal } from "./boot.ts";
export async function openProgramTerminal<X extends Program>(
  root: string,
  home: string,
  token: string,
  program: Composition<X>,
  shown: Shown<X>,
): Promise<void> {
  try {
    await runTerminal(await connectTerminal<X>(root, home, token), program, shown);
  } catch (error) {
    process.stderr.write(`${terminalError(error)}\n`);
    process.exitCode = 1;
  }
}
export async function openRemoteTerminal<X extends Program>(
  address: string,
  key: string,
  program: Composition<X>,
  shown: Shown<X>,
): Promise<void> {
  try {
    await runTerminal(await connectRemoteTerminal<X>(address, key), program, shown);
  } catch (error) {
    process.stderr.write(`${terminalError(error)}\n`);
    process.exitCode = 1;
  }
}
async function runTerminal<X extends Program>(
  connection: SocketConnection<X>,
  program: Composition<X>,
  shown: Shown<X>,
) {
  const house = openHouseRouter(connection, program, shown, { recentLines: 40 });
  const stop = new AbortController();
  const unwatch = house.watch(() => {
    if (house.failure()) stop.abort();
  });
  try {
    await startTerminal(process.stdout, process.stdin, house.router, stop.signal);
    if (house.failure()) throw new Error(house.failure());
  } finally {
    unwatch();
    house.close();
  }
}
