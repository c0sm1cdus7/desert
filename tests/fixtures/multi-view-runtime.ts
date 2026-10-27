import type { TestContext } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { openLocalController } from "../../src/local.ts";
import { viewProgramModel } from "../../src/web/client/view-program.ts";
import { webTransport } from "../../src/web/client/transport.ts";
import { blockedSnapshot } from "../../src/web/client/connection.ts";
import { postgresCluster } from "./postgres.ts";
import { storedObjects } from "../../src/testing/stored-objects.ts";
import { multiApplication, multiProgram, multiSurface } from "./multi-view-program.ts";
import type { NodeEvent } from "../../src/interaction/node-events.ts";
import { captureViewEvents } from "./owned-view-events.ts";

export async function until(predicate: () => boolean) {
  for (let attempt = 0; attempt < 500; attempt++) { if (predicate()) return; await delay(10); }
  throw new Error("MULTI_VIEW_EXPECTATION_TIMEOUT");
}

/** Normal browser transport boundary backed by a real admitted PostgreSQL controller. */
export async function multiViewRuntime(t: TestContext, definition: unknown = multiProgram) {
  const cluster = postgresCluster(), database = await cluster.database();
  const host = await openLocalController(multiApplication, { ...database, roles: ["notes"] });
  const identity = await host.identities.issue("Independent owner"), session = host.connect(identity.token, "human");
  const availability = session.watchAvailability({ pollIntervalMs: 100, validForMs: 1000 });
  const admin = new Pool({ host: database.socketDirectory, user: database.user, database: database.database });
  const control = { connected: true, lostAcceptance: false, delayRead: null as null | (() => Promise<void>) };
  const calls: { method: string; input: Record<string, any> }[] = [];
  const model = viewProgramModel(definition, multiSurface, (id, input) => multiApplication.validateInput(id, input).valid,
    webTransport(multiSurface.contractDigest, { kind: "developer" }));
  t.mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    const method = url.split("/").at(-1)!, input = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ method, input });
    try {
      let result: unknown;
      switch (method) {
        case "availability": result = control.connected ? availability.evidence()
          : { snapshot: blockedSnapshot(multiSurface, "unreachable"), validForMs: 1000 }; break;
        case "begin": result = await session.begin(input.journeyId, input.subject); break;
        case "read": result = await session.read(input.runId); await control.delayRead?.(); break;
        case "offer": result = await session.offer(input.journeyId, input.subject); break;
        case "prepare": result = await session.prepare(input.runId, input.input, input.options); break;
        case "accept": result = await session.accept(input.intentId, input.confirmationDigest);
          if (control.lostAcceptance) throw new TypeError("Response lost after durable acceptance"); break;
        case "receipt": result = await session.receipt(input.intentId); break;
        default: throw new Error(`Unexpected transport operation ${method}`);
      }
      return new Response(JSON.stringify(result));
    } catch (error) {
      if (error instanceof TypeError) throw error;
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "UNKNOWN" }), { status: 409 });
    }
  });
  t.after(async () => { model.stop(); availability.dispose(); await admin.end(); await host.close(); cluster.dispose(); });
  await model.start(); await until(() => model.snapshot().state.availability.journeys["create-card"]?.dependenciesReady === true);
  const emit = (event: NodeEvent) => captureViewEvents(model)(event);
  const output = (view: string, output: string, recordId?: string) => emit({ kind: "surface.invoke",
    intent: { kind: "view.output", view, output, ...(recordId ? { recordId } : {}) } });
  const invoke = (journey: string) => emit({ kind: "surface.invoke", intent: { kind: "journey", journey } });
  const input = (name: string, value: string) => emit({ kind: "input.change", name, value });
  const create = async (destination: "notes" | "cards", title: string, body: string) => {
    model.navigate(destination); await until(() => model.snapshot().state.loaded);
    output(destination, "create"); input("title", title); input("body", body);
    invoke(destination === "notes" ? "create-note" : "create-card");
    await until(() => model.snapshot().state.view === "detail" && !model.snapshot().state.busy && model.snapshot().state.detail?.facts.title === title);
    return model.snapshot().state.detail!;
  };
  return { model, session, control, calls, output, invoke, input, create, emit,
    persisted: async () => (await storedObjects(admin, multiApplication)).sort((left, right) =>
      left.object_type < right.object_type ? -1 : left.object_type > right.object_type ? 1 : 0),
    receipts: async () => Number((await admin.query("SELECT count(*) AS count FROM desert_receipts")).rows[0].count),
  };
}
