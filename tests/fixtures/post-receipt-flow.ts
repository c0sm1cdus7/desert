import { compile } from "../../src/compile.ts";
import { Notebook } from "../../products/notebook/product.ts";
import { mutationFlow } from "../../src/web/client/mutations.ts";
import { humanState } from "../../src/web/client/state.ts";
import type { ApiMethods, HumanSurface, Prepared, Receipt } from "../../src/web/types.ts";
import type { ControllerTransport } from "../../src/web/client/transport.ts";
import { notebookScope } from "./notebook-scope.ts";

export function gate() {
  let release!: () => void, reject!: (error: Error) => void;
  const promise = new Promise<void>((resolve, fail) => { release = resolve; reject = fail; });
  return { promise, release, reject };
}

export function postReceiptFlow() {
  const surface = compile(Notebook).surface("human") as HumanSurface;
  const matched = surface.journeys.find(item => item.id === "create-note");
  if (matched?.kind !== "mutation") throw new Error("Expected creation");
  const journey = matched;
  const scope = notebookScope(surface), store = humanState(surface, scope);
  const control = { beforePrepare: undefined as (() => Promise<void>) | undefined,
    refresh: async () => {}, corruptReceipt: false };
  const prepared = new Map<string, Prepared>();
  const calls: string[] = [];
  let run = 0, refreshes = 0;
  const transport: ControllerTransport = {
    async evidence() { return { snapshot: store.get().availability, validForMs: 5000 }; },
    async call<K extends keyof ApiMethods>(method: K, input: ApiMethods[K]["input"]) {
      calls.push(method);
      let output: unknown;
      if (method === "begin") output = { id: `run-${++run}` };
      else if (method === "prepare") {
        await control.beforePrepare?.();
        const request = input as ApiMethods["prepare"]["input"];
        const value: Prepared = { id: `intent-${request.runId}`, runId: request.runId, journeyId: journey.id,
          object: { id: `record-${request.runId}`, type: journey.object, expectedVersion: 0 },
          facts: { ...request.input as Record<string, string>, state: "active" }, confirmationDigest: "confirmation" };
        prepared.set(value.id, value); output = value;
      } else if (method === "accept" || method === "receipt") {
        const request = input as ApiMethods["receipt"]["input"];
        const value = prepared.get(request.intentId)!;
        output = { id: control.corruptReceipt ? "wrong-intent" : value.id, runId: value.runId,
          commandId: journey.commandId, status: "completed",
          object: { id: value.object.id, type: journey.object, version: 1 } } satisfies Receipt;
      } else throw new Error(`Unexpected operation: ${method}`);
      return output as ApiMethods[K]["output"];
    },
  };
  const flow = mutationFlow(surface, store, transport, () => true, async () => { refreshes++; await control.refresh(); }, scope);
  store.update({ view: "create", draft: { title: "First", body: "Private body" },
    availability: { contractDigest: surface.contractDigest, journeys: {
      [journey.id]: { dependenciesReady: true, blockers: [] },
    } } });
  async function seedReview(uncertain = false) {
    const run = await transport.call("begin", { journeyId: journey.id });
    const value = await transport.call("prepare", { runId: run.id, input: store.get().draft });
    store.update({ prepared: value, mutationId: journey.id, view: uncertain ? "recovery" : "review", uncertain });
  }
  return { flow, store, journey, control, calls, seedReview, refreshes: () => refreshes };
}
