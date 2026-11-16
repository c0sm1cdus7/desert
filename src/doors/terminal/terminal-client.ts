// Reconnect to an existing house; only the first opening may launch it. No action is ever replayed here.
import { SocketOpeningError } from "../socket/wire/socket-error.ts";
import { connect } from "node:net";
import { resolve } from "node:path";
import type { Program } from "../../tools/tool-contract.ts";
import { socketConnection, type SocketConnection } from "../socket/client/socket-connection.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
import { launchHouse } from "./launch-house.ts";
async function dial(path: string) {
  const stream = connect(path);
  return new Promise<typeof stream>((yes, no) => {
    const timer = setTimeout(() => stream.destroy(new Error(socketTexts.startTimeout)), 5000);
    stream.once("connect", () => {
      clearTimeout(timer);
      yes(stream);
    });
    stream.once("error", error => {
      clearTimeout(timer);
      stream.destroy();
      no(error);
    });
  });
}
function absent(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error.code === "ENOENT" || error.code === "ECONNREFUSED" || error.code === "ENOTSOCK")
  );
}
export async function connectTerminal<X extends Program>(
  root: string,
  home: string,
  token: string,
): Promise<SocketConnection<X>> {
  const path = resolve(home, "casa.sock");
  if (Buffer.byteLength(path) >= 104) throw new SocketOpeningError(socketTexts.path(path));
  const connection = socketConnection<X>(token);
  try {
    const stream = await dial(path).catch(async (error: unknown) => {
      if (!absent(error)) throw error;
      await launchHouse(resolve(root), resolve(home));
      return dial(path);
    });
    await connection.attach(stream);
    reconnect(connection, path);
    return connection;
  } catch (error) {
    connection.close();
    throw error;
  }
}
function reconnect<X extends Program>(connection: SocketConnection<X>, path: string) {
  let retry: NodeJS.Timeout | undefined;
  const again = () => {
    if (connection.status() !== "signal-lost" || retry) return;
    retry = setTimeout(() => {
      retry = undefined;
      // Attaching immediately makes the attempted connection visible in the existing bar.
      void connection.attach(connect(path)).catch(() => again());
    }, 500);
  };
  connection.watch(() => {
    if (connection.status() === "disconnected") clearTimeout(retry);
    else again();
  });
}
