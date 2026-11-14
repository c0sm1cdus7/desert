// The process can ask only as its own mind; every request waits until the current fact delivery has finished.
import { AsyncLocalStorage } from "node:async_hooks";
import { mindOf } from "../../house/house.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { execute, type Execution } from "../execute.ts";
import type { Program } from "../tool-contract.ts";
import type { ToolStartup } from "../startup-contract.ts";
export function startupMind<X extends Program>(tool: string, ports: Execution<X>) {
  const hearing = new AsyncLocalStorage<string>();
  let live = true;
  const act: ToolStartup<X>["act"] = async value => {
    const cause = hearing.getStore();
    const through = ports.state().through;
    // A microtask leaves the bus drain and its transaction before entering execute's own atomic write.
    await Promise.resolve();
    if (!live || !ports.live()) return { status: "rejected", reason: toolTexts.interrupted };
    const started = execute(ports, value, through, mindOf(tool), cause === undefined ? [] : [cause]);
    const done = started.status === "processing" ? await started.completion : started;
    return { status: done.status, ...(done.reason === undefined ? {} : { reason: done.reason }) };
  };
  return {
    act,
    hear: (id: string, listener: () => void) => hearing.run(id, listener),
    close: () => {
      live = false;
    },
  };
}
