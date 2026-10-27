import type { TestContext } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { compile } from "../../src/compile.ts";
import { Notebook } from "../../products/notebook/product.ts";
import { viewProgramModel } from "../../src/web/client/view-program.ts";
import { program, surface } from "./view-program.ts";
import type { NodeEvent } from "../../src/interaction/node-events.ts";
import { captureViewEvents } from "./owned-view-events.ts";
import { TransportError, webTransport, type ControllerTransport } from "../../src/web/client/transport.ts";

export async function until(predicate: () => boolean) {
  for (let count = 0; count < 200; count++) {
    if (predicate()) return;
    await delay(5);
  }
  throw new Error("VIEW_TEST_TIMEOUT");
}

/** Normalized web boundary witness, not provider or real-database qualification. */
export async function runtimeFixture(t: TestContext, options: {
  definition?: unknown; mode?: "review" | "submit"; loseAcceptance?: boolean; transport?: "port";
} = {}) {
  const application = compile(Notebook);
  const exposed = { ...surface, commit: { ...surface.commit, [program.journeys[2].id]: options.mode ?? "submit" } };
  const creation = exposed.journeys.find(journey => journey.id === program.journeys[2].id);
  if (creation?.kind !== "mutation") throw new Error("MISSING_CREATION_WITNESS");
  const commandId = creation.commandId;
  const records = [{ id: "existing", version: 1, facts: { title: "Existing note", body: "Existing body", state: "active" } }];
  const calls: { method: string; input: Record<string, unknown> }[] = [];
  const runs = new Map<string, Record<string, unknown>>();
  let pending: { title: string; body: string } | undefined;
  let preparedRun: string | undefined;
  let lost = false, receipt: object | null = null;
  const connection = { ready: true };
  const ready = { contractDigest: exposed.contractDigest, journeys: Object.fromEntries(exposed.journeys.map(journey =>
    [journey.id, { dependenciesReady: true, blockers: [] }])) };
  async function request(url: string, init?: RequestInit) {
    const method = url.split("/").at(-1)!;
    const input = typeof init?.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : {};
    calls.push({ method, input });
    let result: unknown;
    if (method === "availability") result = { snapshot: connection.ready ? ready : {
      contractDigest: exposed.contractDigest, journeys: Object.fromEntries(exposed.journeys.map(journey =>
        [journey.id, { dependenciesReady: false, blockers: journey.dependencies.map(dependency => ({ dependency, reason: "unreachable" })) }])),
    }, validForMs: 5000 };
    else if (method === "begin") { const id = `run-${runs.size}`; runs.set(id, input); result = { id }; }
    else if (method === "read") {
      const subject = runs.get(String(input.runId))?.subject;
      result = subject ? records.filter(record => record.id === subject) : records;
    } else if (method === "offer") result = { journeyId: input.journeyId, subject: input.subject,
      version: records.find(record => record.id === input.subject)?.version, eligible: true };
    else if (method === "prepare") {
      pending = input.input as { title: string; body: string };
      preparedRun = String(input.runId);
      result = { id: "original-intent", runId: input.runId, journeyId: program.journeys[2].id,
        object: { id: "created", type: "note", expectedVersion: 0 },
        facts: { ...pending, state: "active" }, confirmationDigest: "original-confirmation" };
    } else if (method === "accept") {
      if (!receipt) records.push({ id: "created", version: 1, facts: { ...pending!, state: "active" } });
      receipt = { id: "original-intent", runId: preparedRun, commandId,
        status: "completed", object: { id: "created", type: "note", version: 1 } };
      if (options.loseAcceptance && !lost) { lost = true; throw new Error("Response lost after acceptance"); }
      result = receipt;
    } else if (method === "receipt") result = receipt;
    else throw new Error(`Unexpected operation: ${method}`);
    return new Response(JSON.stringify(result));
  }
  const transport: ControllerTransport = options.transport === "port" ? {
    async evidence() { return await (await request("/api/availability")).json(); },
    async call(method, input) {
      try { return await (await request(`/api/${method}`, { body: JSON.stringify(input) })).json(); }
      catch { throw new TransportError("CONNECTION_LOST"); }
    },
  } : webTransport(exposed.contractDigest, { kind: "developer" });
  t.mock.method(globalThis, "fetch", options.transport === "port"
    ? async () => { throw new Error("Port interpreter must not use browser fetch"); } : request);
  const model = viewProgramModel(options.definition ?? program, exposed,
    (id, input) => application.validateInput(id, input).valid, transport);
  t.after(() => model.stop());
  await model.start();
  await until(() => model.snapshot().state.availability.journeys[program.journeys[2].id]?.dependenciesReady === true);
  const emit = (event: NodeEvent) => captureViewEvents(model)(event);
  return { model, calls, records, emit, connection };
}
