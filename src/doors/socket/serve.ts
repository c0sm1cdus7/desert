// The running house already owns the writer lease. This composition adds its local door and signal lifecycle.
import type { RunningHouse } from "../../programs/house-runtime.ts";
import { openHouseSocket } from "../../programs/socket-listener.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { houseDoor } from "./house-door.ts";
import type { DoorKey } from "./socket-peer.ts";
export type { DoorKey } from "./socket-peer.ts";
const serving = new WeakSet<object>();
export async function serveHouse<X extends Program>(
  house: RunningHouse<X>,
  home: string,
  keys: ReadonlyMap<string, DoorKey>,
) {
  if (serving.has(house)) throw new Error("This house already has a socket server");
  house.journal.batch(() => undefined);
  serving.add(house);
  const door = houseDoor(house, keys, {
    shutdown: () => {
      void close();
    },
  });
  let socket: Awaited<ReturnType<typeof openHouseSocket>>;
  try {
    socket = await openHouseSocket(home, house.home, door.accept);
  } catch (error) {
    await door.close();
    serving.delete(house);
    throw error;
  }
  let closed: Promise<{ remaining: number }> | undefined;
  const close = () => {
    closed ??= stopServer(socket, door, signal).finally(() => serving.delete(house));
    return closed;
  };
  const signal = () => {
    void close();
  };
  socket.onFailure(signal);
  process.on("SIGINT", signal);
  process.on("SIGTERM", signal);
  return { path: socket.path, close };
}
async function stopServer(
  socket: Awaited<ReturnType<typeof openHouseSocket>>,
  door: ReturnType<typeof houseDoor>,
  signal: () => void,
) {
  const stopped = socket.stopAccepting();
  process.removeListener("SIGINT", signal);
  process.removeListener("SIGTERM", signal);
  try {
    const result = await door.close();
    await stopped;
    return result;
  } finally {
    socket.remove();
  }
}
