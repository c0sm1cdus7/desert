import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { compile } from "../src/compile.ts";
import { openLocalController } from "../src/local.ts";
import { dispatch } from "../src/web/dispatch.ts";
import { humanState } from "../src/web/client/state.ts";
import { mutationFlow } from "../src/web/client/mutations.ts";
import { mutationPresentation } from "../src/web/client/presentation.ts";
import type { ApiMethods, HumanSurface } from "../src/web/types.ts";
import { Notebook } from "../products/notebook/product.ts";
import { postgresCluster } from "./fixtures/postgres.ts";
import { notebookScope } from "./fixtures/notebook-scope.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => { cluster?.dispose(); });

for (const mode of ["review", "confirm", "submit"] as const) {
  test(`changing only the contract to ${mode} governs the real creation flow`, async () => {
    const application = compile({ ...Notebook, surfaces: Notebook.surfaces.map(surface => surface.kind === "human"
      ? { ...surface, commit: { ...surface.commit, "create-note": mode } } : surface) });
    const host = await openLocalController(application, { ...await cluster.database(), roles: ["notes"] });
    try {
      const owner = await host.identities.issue("Owner");
      const session = host.connect(owner.token, "human");
      const availability = session.watchAvailability();
      const surface = application.surface("human") as HumanSurface;
      const scope = notebookScope(surface), store = humanState(surface, scope);
      availability.subscribe(snapshot => store.update({ availability: snapshot }));
      for (let retry = 0; retry < 100 && !store.get().availability.journeys["create-note"]?.dependenciesReady; retry++) await delay(10);
      assert.equal(store.get().availability.journeys["create-note"]?.dependenciesReady, true);
      const calls: string[] = [];
      const transport = {
        async connect() {}, async evidence() { return availability.evidence(); },
        async call<K extends keyof ApiMethods>(method: K, input: ApiMethods[K]["input"]): Promise<ApiMethods[K]["output"]> {
          calls.push(method);
          return await dispatch(session, method, input) as ApiMethods[K]["output"];
        },
      };
      const flow = mutationFlow(surface, store, transport, (id, input) => application.validateInput(id, input).valid, async () => {}, scope);
      const primary = mutationPresentation(surface, "create-note");
      store.update({ view: "create", draft: { title: "Incomplete" }, draftRevision: 1 });
      await flow.invoke(primary);
      assert.deepEqual(calls, []);
      store.update({ draft: { title: "Contract decides", body: "No special Notebook branch" }, draftRevision: 2 });
      await Promise.all([flow.invoke(primary), flow.invoke(primary)]);
      if (mode !== "submit") {
        assert.equal(store.get().view, "review");
        assert.deepEqual(calls, ["begin", "prepare"]);
        assert.deepEqual(await session.read((await session.begin("read-note")).id), []);
        await flow.accept();
      }
      assert.deepEqual(calls, ["begin", "prepare", "accept"]);
      assert.equal(store.get().view, "detail");
      assert.deepEqual(store.get().draft, {});
      const records = await session.read((await session.begin("read-note")).id);
      assert.equal(records.length, 1);
      assert.equal(records[0]!.facts.title, "Contract decides");
    } finally { await host.close(); }
  });
}
