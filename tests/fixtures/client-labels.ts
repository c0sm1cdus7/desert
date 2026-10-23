import type { TestContext } from "node:test";
import { humanProduct } from "../../src/web/client/model.ts";
import { webTransport } from "../../src/web/client/transport.ts";
import { presentFrame } from "../../src/web/client/frame.ts";
import type { Mutation } from "../../src/web/types.ts";
import { application, surface, scope, CreateItem, EditItem } from "./labels.ts";
import { until } from "./client-edit.ts";

export async function labelsClient(t: TestContext) {
  const validate = Object.assign((id: string, input: unknown) => application.validateInput(id, input).valid,
    { inspect: (id: string, input: unknown) => application.validateInput(id, input) });
  const model = humanProduct(surface, validate, { scope, transport: webTransport(surface.contractDigest, { kind: "developer" }), initialize: { [EditItem.id]: [
    { input: "title", fact: "title" }, { input: "projects", fact: "projects" },
  ] } });
  t.after(() => model.dispose());
  const ready = { contractDigest: surface.contractDigest, journeys: Object.fromEntries(surface.journeys.map(item =>
    [item.id, { dependenciesReady: true, blockers: [] }])) };
  const state = { facts: { title: "Saved item", projects: ["Original"] }, version: 1,
    beforeAccept: undefined as (() => Promise<void>) | undefined };
  const calls: { operation: string; body: Record<string, unknown> }[] = [];
  const runs = new Map<string, string>();
  let prepared: { journey: Mutation; input: typeof state.facts } | undefined;
  t.mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    const operation = url.split("/").at(-1)!;
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ operation, body });
    let result: unknown;
    if (operation === "availability") result = { snapshot: ready, validForMs: 1000 };
    else if (operation === "begin") {
      const id = `run-${runs.size}`; runs.set(id, body.journeyId); result = { id };
    } else if (operation === "read") result = [{ id: "item", version: state.version, facts: state.facts }];
    else if (operation === "offer") result = { journeyId: body.journeyId, subject: "item", version: state.version, eligible: true };
    else if (operation === "prepare") {
      const journey = surface.journeys.find(item => item.id === runs.get(body.runId)) as Mutation;
      prepared = { journey, input: body.input };
      result = { id: "intent", runId: body.runId, journeyId: journey.id,
        object: { id: "item", type: "labeled-item", expectedVersion: journey.subject ? state.version : 0 },
        confirmationDigest: "confirmation", facts: body.input };
    } else if (operation === "accept") {
      await state.beforeAccept?.();
      state.facts = prepared!.input; state.version = prepared!.journey.subject ? state.version + 1 : 1;
      result = { id: "intent", runId: calls.findLast(call => call.operation === "prepare")!.body.runId,
        commandId: prepared!.journey.commandId, status: "completed", object: { id: "item", type: "labeled-item", version: state.version } };
    } else throw new Error(`Unexpected ${operation}`);
    return new Response(JSON.stringify(result));
  });
  await model.start(); await until(() => model.snapshot().loaded);
  const mutation = (id: string) => surface.journeys.find(item => item.id === id) as Mutation;
  return { model, state, calls, create: mutation(CreateItem.id), edit: mutation(EditItem.id),
    frame: () => presentFrame(surface, model.snapshot(), validate, scope) };
}
