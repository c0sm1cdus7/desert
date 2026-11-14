// A tool whose zero mind is ordinary code: on its wake it asks the house to perform its declared act.
import { object } from "../../src/catalogs/acts.ts";
import { effect } from "../../src/journal/events.ts";
import { toolAct } from "../../src/tools/act-definition.ts";
import type { ToolStartup } from "../../src/tools/startup-contract.ts";
import type { Tool } from "../../src/tools/tool-contract.ts";
import { shop, type Shop } from "./shop.ts";
export function zeroMind(id = "desk", acts?: Tool<Shop>["acts"]) {
  let startup: ToolStartup<Shop> | undefined;
  const pending: ReturnType<ToolStartup<Shop>["act"]>[] = [];
  const writes = toolAct<Shop, ReturnType<typeof object>>(object({}), (_, { by }) => ({
    status: "accepted",
    text: "Anotado · Despertar",
    effects: [shop.fact("sale-registered", { sale: id, total: 100 }, by)],
  }));
  const read = () => {
    if (!startup) throw new Error("Mind has not started");
    return startup;
  };
  const tool: Tool<Shop> = {
    id,
    purpose: "Anotar al despertar",
    targets: () => [`${id}/page`],
    summary: () => "",
    view: () => "",
    acts: acts ?? { write: writes },
    start: ports => {
      startup = ports;
      return ports.bus.on("woke", event => {
        if (event.data.id === `zero:${id}`) pending.push(ports.act({ act: "write", target: id, input: {} }));
      });
    },
  };
  return {
    tool,
    pending,
    startup: read,
    schedule: (at: number | null) => read().bus.emit(effect("wake-at", { id: `zero:${id}`, at }, `mind:${id}`)),
    act: (act = "write", input: unknown = {}, target: string = id) => read().act({ act, input, target }),
  };
}
