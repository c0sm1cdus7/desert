import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { compile } from "../../src/compile.ts";
import { openLocalController } from "../../src/local/controller.ts";
import { activityCatalog } from "../../src/activities/catalog.ts";
import { activityInputs } from "../../src/activities/authoring.ts";
import { Components, defineView } from "../../src/views/components.ts";
import { viewPorts } from "../../src/views/authoring-ports.ts";
import { Notebook } from "../../products/notebook/product.ts";
import { CreateNote } from "../../products/notebook/journeys.ts";
import type { postgresCluster } from "./postgres.ts";

export async function activityFixture(cluster: ReturnType<typeof postgresCluster>) {
  const application = compile(Notebook), database = await cluster.database();
  const ports = viewPorts({ inputs: { draft: "form", prepared: "context" }, outputs: [] });
  const Form = defineView({ name: "activity-form", content: [Components.Form({ input: ports.inputs.draft })] });
  const Review = defineView({ name: "activity-review", content: [Components.Context({ input: ports.inputs.prepared })] });
  const activities = activityCatalog(application, { journeys: [CreateNote], views: [Form, Review] });
  const inputs = activityInputs(CreateNote);
  const plan = activities.define({ journey: CreateNote, steps: [
    { view: Form, inputs: [inputs.title] },
    { view: Form, inputs: [inputs.body], when: { input: inputs.title, comparison: "equals", value: "Detailed" } },
    { view: Form, inputs: [inputs.body], when: { input: inputs.title, comparison: "not-equals", value: "Detailed" } },
  ], review: Review });
  const options = { ...database, roles: ["notes"], activities };
  const controller = await openLocalController(application, options);
  const identity = await controller.identities.issue("Alice");
  const session = controller.connect(identity.token, "human");
  const admin = new Pool({ host: database.socketDirectory, user: database.user, database: database.database });
  return { application, options, controller, identity, session, plan, admin,
    async prepared() {
      let state = await session.activityCreate(randomUUID(), plan);
      state = await session.activityAnswer(state.id, state.revision, 0, { title: "Simple" });
      state = await session.activityAnswer(state.id, state.revision, 2, { body: "Pending" });
      return session.activityPrepare(state.id, state.revision);
    },
    async close() { await admin.end(); await controller.close(); } };
}
