// Reconnect the terminal to one remote house; recover request identifiers without resending any action.
import type { Program } from "../../tools/tool-contract.ts";
import { socketConnection } from "../socket/client/socket-connection.ts";
import { httpStream } from "../socket/client/http-stream.ts";
import { SocketOpeningError } from "../socket/wire/socket-error.ts";
export async function connectRemoteTerminal<X extends Program>(
  address: string,
  key: string,
  send?: Parameters<typeof httpStream>[3],
) {
  const connection = socketConnection<X>("http");
  const controller = new AbortController();
  const dial = () => httpStream(address, key, controller.signal, send);
  let retry: NodeJS.Timeout | undefined;
  const again = () => {
    if (connection.status() !== "signal-lost" || retry) return;
    retry = setTimeout(() => {
      retry = undefined;
      void dial()
        .then(stream => connection.attach(stream))
        .catch((error: unknown) => {
          if (error instanceof SocketOpeningError) connection.close();
          else again();
        });
    }, 500);
  };
  connection.watch(() => {
    if (connection.status() === "disconnected") {
      clearTimeout(retry);
      controller.abort();
    } else again();
  });
  try {
    await connection.attach(await dial());
    return connection;
  } catch (error) {
    connection.close();
    throw error;
  }
}
