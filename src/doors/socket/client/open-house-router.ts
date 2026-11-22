// A house router over a socket connection, with no TTY: what the terminal draws from and what the screen door draws.
import { coreRegistry } from "../../../tools/identities/identities.ts";
import type { Composition } from "../../../tools/promises.ts";
import type { Program, ViewLimits } from "../../../tools/tool-contract.ts";
import type { Shown } from "../../../surface/bridge/ports/house-ports.ts";
import { houseRouter } from "../../../surface/bridge/assembly/house-router.ts";
import type { Router } from "../../../surface/router/router.ts";
import type { SocketConnection } from "./socket-connection.ts";
import { socketPorts } from "./socket-ports.ts";
export interface OpenHouse {
  readonly router: Router;
  /** The house closed this for good: an unverifiable state, a revoked key, a refused hello. */
  readonly ended: () => boolean;
  /** Its catalogued reason, when the connection has one to give. */
  readonly failure: () => string | undefined;
  readonly watch: (changed: () => void) => () => void;
  /** Stops the router and closes the connection. */
  readonly close: () => void;
  /** Only the entry's: a code was accepted, so the host has a key now and the door asks it to open the house. */
  readonly admitted?: () => boolean;
}
/** The one way a door builds a house router: the program's registry over the connection, read with its words. */
export function openHouseRouter<X extends Program>(
  connection: SocketConnection<X>,
  program: Composition<X>,
  shown: Shown<X>,
  limits: Omit<ViewLimits, "now">,
): OpenHouse {
  const registry = coreRegistry(
    program.registry,
    "house",
    program.identities,
    program.minds?.assistants,
    program.minds?.programs,
  );
  const router = houseRouter(socketPorts(connection, { registry, limits }), shown);
  return {
    router,
    // A key the house cut closes the connection with no failure text: being disconnected is the ending then.
    ended: () => connection.failure() !== undefined || connection.status() === "disconnected",
    failure: connection.failure,
    watch: connection.watch,
    close: () => {
      router.stop();
      connection.close();
    },
  };
}
