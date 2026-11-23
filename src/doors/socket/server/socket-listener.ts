// The OS boundary of the local house door: private Unix socket, pid and filesystem cleanup after writer ownership.
import { meant } from "../../../fields/phrases.ts";
import { SocketOpeningError } from "../wire/socket-error.ts";
import { createServer, type Server } from "node:net";
import type { Duplex } from "node:stream";
import { chmodSync, lstatSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { privateFileMode, privateDirectoryMode } from "../../../storage/home.ts";
import { socketTexts } from "../../../texts/socket.texts.ts";
function prepareSocket(home: string, opened: string): string {
  const path = join(home, "house.sock");
  // macOS sockaddr_un.sun_path has 104 bytes including its trailing NUL.
  if (Buffer.byteLength(path) >= 104) throw new SocketOpeningError(meant(socketTexts.path(path)));
  if (realpathSync(home) !== realpathSync(opened)) throw new Error(meant(socketTexts.home));
  const directory = lstatSync(home);
  if (!directory.isDirectory() || directory.isSymbolicLink())
    throw new SocketOpeningError(meant(socketTexts.path(path)));
  chmodSync(home, privateDirectoryMode);
  rmSync(path, { force: true });
  return path;
}
async function listen(server: Server, path: string) {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(path, () => {
      server.removeListener("error", reject);
      resolve();
    });
  });
  chmodSync(path, privateFileMode);
}
export async function openHouseSocket(home: string, opened: string, accept: (stream: Duplex) => void) {
  const path = prepareSocket(home, opened);
  const pid = join(home, "house.pid");
  const server = createServer(accept);
  const stopAccepting = () => new Promise<void>(resolve => server.close(() => resolve()));
  const remove = () => {
    rmSync(path, { force: true });
    rmSync(pid, { force: true });
  };
  try {
    await listen(server, path);
    rmSync(pid, { force: true });
    writeFileSync(pid, `${process.pid}\n`, { mode: privateFileMode, flag: "wx" });
  } catch (error) {
    await stopAccepting();
    remove();
    throw error;
  }
  return {
    path,
    stopAccepting,
    remove,
    onFailure: (failed: () => void) => {
      server.on("error", failed);
    },
  };
}
