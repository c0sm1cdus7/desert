import test from "node:test";
import assert from "node:assert/strict";
import { activityClientFixture } from "./fixtures/activity-client.ts";
import { activityModel } from "../src/web/client/activity-model.ts";
import { ActivityJournalVersion } from "../src/web/client/activity-host.ts";
import { dispatch } from "../src/web/dispatch.ts";
import type { ControllerTransport } from "../src/web/client/transport.ts";

for (const substituted of ["activityRead", "activityAnswer", "activityReopen", "activityPrepare"] as const) {
  test(`${substituted} cannot replace the active activity with another same-plan response`, async t => {
    const f = await activityClientFixture(t), first = await f.seed("Selected"), other = await f.seed("Not selected");
    const otherAnswered = await f.session.activityAnswer(other.activity.id, other.activity.revision, 1, { body: "Private other body" });
    const otherPrepared = await f.session.activityPrepare(otherAnswered.id, otherAnswered.revision);
    f.journal.save({ version: ActivityJournalVersion, journey: f.experience.id,
      occurrence: first.occurrence, activity: first.activity.id });
    let substitute = false;
    const transport: ControllerTransport = {
      async evidence() { throw new Error("Unused"); },
      async call(method, input) {
        if (substitute && method === substituted) return (method === "activityPrepare" ? otherPrepared
          : await f.session.activityRead(other.activity.id)) as never;
        return dispatch(f.session, method, input);
      },
    };
    const model = activityModel(f.surface, transport, () => {}, async () => {}, f.journal);
    t.after(() => model.dispose());
    await model.open(f.experience); substitute = true;
    model.edit("body", "Selected body");
    if (substituted === "activityReopen") await model.back(); else await model.next();
    assert.equal(model.snapshot().error, "INVALID_RESPONSE");
    assert.equal(model.snapshot().activity?.id, first.activity.id);
    assert.equal(f.journalEntry()?.activity, first.activity.id);
    assert.equal(JSON.stringify(model.snapshot()).includes("Private other body"), false);
  });
}
