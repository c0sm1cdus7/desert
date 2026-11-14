// The existing HousePorts contract over the last complete view received from the house.
import type { HousePorts } from "../../surface/bridge/house-ports.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { failureEntry } from "../../tools/boundaries/failure-entry.ts";
import type { SocketConnection } from "./socket-connection.ts";
import { clientRequests } from "./client-requests.ts";
export function socketPorts<X extends Program>(
  connection: SocketConnection<X>,
  options: Pick<HousePorts<X>, "registry" | "limits" | "receipt">,
): HousePorts<X> {
  return {
    ...options,
    me: connection.identity(),
    state: connection.state,
    now: connection.now,
    connection: connection.status,
    watch: connection.watch,
    act: clientRequests(connection),
    defect: (error, tool, target, option) => {
      const declared = options.registry.find(t => t.id === tool)?.acts[option];
      const entry = failureEntry(error, connection.identity(), tool, target, option, declared);
      // The public text never trusts an exception's reason, message, target or input.
      const text = failureEntry(new Error(), connection.identity(), tool, target, option, declared).data.text;
      if (connection.status() === "connected") connection.send({ tipo: "defecto", entrada: { ...entry.data, text } });
      return text;
    },
  };
}
