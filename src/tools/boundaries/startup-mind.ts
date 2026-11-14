// The mind keeps its listener's cause and write outcome, even across asynchronous continuations.
import { Value } from "@sinclair/typebox/value";
import { actEnvelope } from "../../catalogs/acts.ts";
import { AsyncLocalStorage } from "node:async_hooks";
import { mindOf } from "../../house/house.ts";
import { journalTexts } from "../../texts/journal.texts.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { execute, type Execution } from "../execute.ts";
import { defectReporter } from "../failures/defect-reporter.ts";
import type { Program } from "../tool-contract.ts";
import type { ToolStartup } from "../startup-contract.ts";
export function startupMind<X extends Program>(tool: string, ports: Execution<X>) {
  const hearing = new AsyncLocalStorage<{ id: string; confirmed: () => boolean }>();
  const chain = new AsyncLocalStorage<number>();
  let live = true;
  const act: ToolStartup<X>["act"] = async value => {
    try {
      const heard = hearing.getStore();
      const cause = heard?.id;
      const confirmed = ports.bus.confirmation();
      const depth = chain.getStore() ?? 0;
      const through = ports.state().through;
      // Snapshot while still at the program boundary: hostile getters and serialization never escape act.
      let input: unknown;
      try {
        input = mindInput(value);
      } catch {
        return { status: "rejected", reason: toolTexts.invalid };
      }
      // A new task lets people and the clock run between two acts of a self-caused chain.
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      if (!live) return { status: "rejected", reason: toolTexts.interrupted };
      if (!confirmed() || (heard && !heard.confirmed()))
        return { status: "rejected", reason: journalTexts.mindRolledBack };
      if (depth >= 32) return { status: "rejected", reason: journalTexts.mindChain };
      return await chain.run(depth + 1, async () => {
        const started = execute(ports, input, through, mindOf(tool), cause === undefined ? [] : [cause]);
        const done = started.status === "processing" ? await started.completion : started;
        return { status: done.status, ...(done.reason === undefined ? {} : { reason: done.reason }) };
      });
    } catch (error) {
      return failedMind(tool, ports, error);
    }
  };
  return {
    act,
    hear: (id: string, listener: () => void) => hearing.run({ id, confirmed: ports.bus.confirmation() }, listener),
    close: () => {
      live = false;
    },
  };
}

function failedMind<X extends Program>(tool: string, ports: Execution<X>, error: unknown) {
  try {
    const report = defectReporter(
      ports.registry,
      mindOf(tool),
      entry => ports.bus.emit(entry),
      value => ports.secrets.scrub(value),
    );
    report(error, tool, tool, "act");
  } catch {
    /* Even a broken diagnostic sink cannot reject the public promise. */
  }
  return { status: "rejected" as const, reason: toolTexts.baseFailure };
}

function mindInput(value: unknown): unknown {
  if (!Value.Check(actEnvelope, value)) throw new Error(toolTexts.invalid);
  return JSON.parse(
    JSON.stringify(value, (_key, item: unknown) => {
      if (
        item === undefined ||
        typeof item === "function" ||
        typeof item === "symbol" ||
        typeof item === "bigint" ||
        (typeof item === "number" && !Number.isFinite(item)) ||
        (item !== null && typeof item === "object" && Object.getOwnPropertySymbols(item).length > 0)
      )
        throw new Error(toolTexts.invalid);
      return item;
    }),
  );
}
