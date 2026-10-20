import type { TestContext } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { compile } from "../../src/compile.ts";
import { Notebook } from "../../products/notebook/product.ts";
import { viewProgramModel } from "../../src/web/client/view-program.ts";
import { program, surface } from "./view-program.ts";

export async function until(predicate: () => boolean) {
  for (let count = 0; count < 200; count++) {
    if (predicate()) return;
    await delay(5);
  }
  throw new Error("VIEW_TEST_TIMEOUT");
}

/** Normalized web boundary witness, not provider or real-database qualification. */
export async function runtimeFixture(t: TestContext, options: {
  definition?: unknown; mode?: "review" | "submit"; loseAcceptance?: boolean;
} = {}) {
  const application = compile(Notebook);
  const exposed = { ...surface, commit: { ...surface.commit, [program.journeys[2].id]: options.mode ?? "submit" } };
  const records = [{ id: "existing", version: 1, facts: { title: "Existing note", body: "Existing body", state: "active" } }];
  const calls: { method: string; input: Record<string, unknown> }[] = [];
  const runs = new Map<string, Record<string, unknown>>();
  let pending: { title: string; body: string } | undefined;
  let lost = false, receipt: object | null = null;
  const ready = { contractDigest: exposed.contractDigest, journeys: Object.fromEntries(exposed.journeys.map(journey =>
    [journey.id, { dependenciesReady: true, blockers: [] }])) };
  t.mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    const method = url.split("/").at(-1)!;
    const input = typeof init?.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : {};
    calls.push({ method, input });
    let result: unknown;
    if (method === "availability") result = { snapshot: ready, validForMs: 5000 };
    else if (method === "begin") { const id = `run-${runs.size}`; runs.set(id, input); result = { id }; }
    else if (method === "read") {
      const subject = runs.get(String(input.runId))?.subject;
      result = subject ? records.filter(record => record.id === subject) : records;
    } else if (method === "offer") result = { eligible: true };
    else if (method === "prepare") {
      pending = input.input as { title: string; body: string };
      result = { id: "original-intent", runId: input.runId, journeyId: program.journeys[2].id,
        object: { id: "created", type: "note", expectedVersion: 0 },
        facts: { ...pending, state: "active" }, confirmationDigest: "original-confirmation" };
    } else if (method === "accept") {
      if (!receipt) records.push({ id: "created", version: 1, facts: { ...pending!, state: "active" } });
      receipt = { id: "original-intent", runId: "run-create", commandId: program.journeys[2].id,
        status: "completed", object: { id: "created", type: "note", version: 1 } };
      if (options.loseAcceptance && !lost) { lost = true; throw new Error("Response lost after acceptance"); }
      result = receipt;
    } else if (method === "receipt") result = receipt;
    else throw new Error(`Unexpected operation: ${method}`);
    return new Response(JSON.stringify(result));
  });
  const model = viewProgramModel(options.definition ?? program, exposed,
    (id, input) => application.validateInput(id, input).valid);
  t.after(() => model.stop());
  await model.start();
  await until(() => model.snapshot().state.availability.journeys[program.journeys[2].id]?.dependenciesReady === true);
  return { model, calls, records };
}
