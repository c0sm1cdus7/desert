// The existing HousePorts contract over the last complete view received from the house.
import { readonlyState } from "../../../journal/readonly-state.ts";
import { personalRegistry } from "../../../tools/personal/personal.ts";
import { rulesRegistry } from "../../../tools/rules/rules.ts";
import type { HousePorts } from "../../../surface/bridge/ports/house-ports.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import { toolTexts } from "../../../texts/tools.texts.ts";
import type { SocketConnection } from "./socket-connection.ts";
import { clientRequests } from "./client-requests.ts";
export function socketPorts<X extends Program>(
  connection: SocketConnection<X>,
  options: Pick<HousePorts<X>, "registry" | "limits" | "receipt">,
): HousePorts<X> {
  const observe = clientRequests(connection, true);
  return {
    ...options,
    registry: personalRegistry(rulesRegistry(options.registry)),
    me: connection.identity(),
    /** Read-only to the bottom, as the house hands it (law 256); the same view of the same state, never a copy. */
    state: () => readonlyState(connection.state()),
    now: connection.now,
    connection: connection.status,
    watch: connection.watch,
    act: clientRequests(connection),
    observe: value => observe(value, 0),
    defect: (_error, tool, target, option) => {
      if (connection.status() === "connected") connection.send({ type: "default", tool, target, option });
      return toolTexts.baseFailure;
    },
  };
}
