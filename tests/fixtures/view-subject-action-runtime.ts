import type { TestContext } from "node:test";
import type { NodeEvent } from "../../src/interaction/node-events.ts";
import { compile } from "../../src/compile.ts";
import { Notebook } from "../../products/notebook/product.ts";
import { viewProgramModel } from "../../src/web/client/view-program.ts";
import { webTransport } from "../../src/web/client/transport.ts";
import { captureViewEvents } from "./owned-view-events.ts";
import { until } from "./view-program-runtime.ts";
import { actionProgram, surface, ArchiveNote } from "./view-subject-actions.ts";

/** Normalized transport witness; it does not claim provider/database qualification. */
export async function subjectActionRuntime(t: TestContext, options: {
  mode?: "review" | "submit"; unavailable?: boolean; eligible?: boolean; staleOffer?: boolean;
  loseAcceptance?: boolean; wrongPreparedSubject?: boolean;
} = {}) {
  const application = compile(Notebook);
  const exposed = { ...surface, commit: { ...surface.commit, [ArchiveNote.id]: options.mode ?? "review" } };
  const mutation = exposed.journeys.find(item => item.id === ArchiveNote.id)!;
  if (mutation.kind !== "mutation") throw new Error("MISSING_ARCHIVE");
  const record = { id: "existing", version: 3, facts: { title: "Existing note", body: "Keep body", state: "active" } };
  const calls: { method: string; input: Record<string, any> }[] = [], runs = new Map<string, Record<string, any>>();
  let receipt: object | null = null, preparedRun = "", accepts = 0;
  const ready = { contractDigest: exposed.contractDigest, journeys: Object.fromEntries(exposed.journeys.map(item =>
    [item.id, { dependenciesReady: !(item.id === ArchiveNote.id && options.unavailable),
      blockers: item.id === ArchiveNote.id && options.unavailable
        ? item.dependencies.map(dependency => ({ dependency, reason: "unavailable" })) : [] }])) };
  t.mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    const method = url.split("/").at(-1)!;
    const input = typeof init?.body === "string" ? JSON.parse(init.body) : {};
    calls.push({ method, input });
    let result: unknown;
    if (method === "availability") result = { snapshot: ready, validForMs: 5000 };
    else if (method === "begin") { const id = `run-${runs.size}`; runs.set(id, input); result = { id }; }
    else if (method === "read") result = [structuredClone(record)];
    else if (method === "offer") result = { journeyId: input.journeyId, subject: input.subject,
      version: options.staleOffer ? record.version - 1 : record.version, eligible: options.eligible ?? record.facts.state === "active" };
    else if (method === "prepare") {
      preparedRun = input.runId;
      result = { id: "archive-intent", runId: preparedRun, journeyId: ArchiveNote.id,
        object: { id: options.wrongPreparedSubject ? "another-note" : record.id, type: "note", expectedVersion: record.version },
        facts: { ...record.facts, state: "archived" }, confirmationDigest: "archive-confirmation" };
    } else if (method === "accept") {
      accepts++;
      if (!receipt) { record.version++; record.facts.state = "archived"; }
      receipt = { id: "archive-intent", runId: preparedRun, commandId: mutation.commandId,
        status: "completed", object: { id: record.id, type: "note", version: record.version } };
      if (options.loseAcceptance && accepts === 1) throw new Error("Response lost after commit");
      result = receipt;
    } else if (method === "receipt") result = receipt;
    else throw new Error(`Unexpected operation: ${method}`);
    return new Response(JSON.stringify(result));
  });
  const model = viewProgramModel(actionProgram, exposed, (id, input) => application.validateInput(id, input).valid,
    webTransport(exposed.contractDigest, { kind: "developer" }));
  t.after(() => model.stop());
  await model.start();
  model.navigate("notes");
  await until(() => model.snapshot().state.loaded);
  const emit = (event: NodeEvent) => captureViewEvents(model)(event);
  const select = async () => {
    emit({ kind: "surface.invoke", intent: { kind: "view.output", view: "notes", output: "select", recordId: record.id } });
    await until(() => Boolean(model.snapshot().state.detail) && (options.unavailable || Boolean(model.snapshot().state.offers[ArchiveNote.id])));
  };
  const invoke = () => emit({ kind: "surface.invoke", intent: { kind: "journey", journey: ArchiveNote.id } });
  return { model, emit, select, invoke, calls, record };
}
