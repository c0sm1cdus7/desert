// A tool whose zero mind is ordinary code: on its wake it asks the house to perform its declared act.
// Since the kit, a tool writes only the program facts it declares, and each fact has one owner: the zero mind
// owns `mind-noted` unless a second mind in the same house is given no facts (it then notes nothing of its own).
import { object } from "../../src/fields/visible-text.ts";
import { toolAct } from "../../src/tools/act-definition.ts";
import type { ToolStartup } from "../../src/tools/startup-contract.ts";
import type { Tool, Slices } from "../../src/tools/tool-contract.ts";
import { shop, shopSlices, type Shop } from "./shop.ts";
export function zeroMind(id = "desk", acts?: Tool<Shop>["acts"], facts: readonly "mind-noted"[] = ["mind-noted"]) {
  let startup: ToolStartup<Shop> | undefined;
  const pending: ReturnType<ToolStartup<Shop>["act"]>[] = [];
  const writes = toolAct<Shop, ReturnType<typeof object>>(object({}), (_, { by }) => ({
    status: "accepted",
    text: "Anotado · Despertar",
    effects: facts.map(kind => shop.fact(kind, { sale: id, total: 100 }, by)),
  }));
  const read = () => {
    if (!startup) throw new Error("Mind has not started");
    return startup;
  };
  const tool: Tool<Shop> = {
    id,
    facts,
    purpose: "Anotar al despertar",
    targets: () => [`${id}/page`],
    summary: () => "",
    view: () => "",
    acts: acts ?? { write: writes },
    start: ports => {
      startup = ports;
      if (ports.state().tools.desk?.has(id)) pending.push(ports.act({ act: "write", target: id, input: {} }));
      return ports.bus.on("woke", event => {
        if (event.data.id === `${id}:zero`) pending.push(ports.act({ act: "write", target: id, input: {} }));
      });
    },
  };
  return {
    tool,
    pending,
    startup: read,
    schedule: (at: number | null) =>
      read().bus.emit({ layer: "house", kind: "wake-at", data: { id: `${id}:zero`, at } }),
    act: (act = "write", input: unknown = {}, target: string = id) => read().act({ act, input, target }),
  };
}

/** Business work survives a consumed wake until its act actually writes the result. */
export const zeroSlices: Slices<Shop> = {
  initial: { ...shopSlices.initial, desk: new Map() },
  step: {
    ...shopSlices.step,
    desk: (kept = new Map(), event) => {
      const next = new Map(kept);
      if (event.kind === "woke" && event.data.id.endsWith(":zero")) next.set(event.data.id.slice(0, -5), event.id);
      if (event.kind === "mind-noted" && event.by === `mind:${event.data.sale}`) next.delete(event.data.sale);
      return next;
    },
  },
};
