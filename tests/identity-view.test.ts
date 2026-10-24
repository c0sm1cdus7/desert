import assert from "node:assert/strict";
import { test } from "node:test";
import { Components, defineView, viewPorts } from "../src/index.ts";
import { validateJourneyOutputs } from "../src/views/program-outputs.ts";
import { validateJourneyViews } from "../src/views/program-views.ts";
import type { ViewJourney } from "../src/views/program-schema.ts";
import { fixtureText, compiledFixture } from "./fixtures/messages.ts";

test("Identity is a closed catalog composition; lock is a dedicated journey output, never another mutation", () => {
  const ports = viewPorts({ inputs: {}, outputs: ["lock"] });
  const declared = defineView({ name: "identity", outputs: ports.outputs,
    topDock: Components.Toolbar({ actions: [{ output: ports.output.lock, label: fixtureText.lock, icon: "lock" }] }),
    content: [Components.Header({ title: fixtureText.identity }), Components.Identity()] });
  const view = compiledFixture(declared);
  const journey: ViewJourney = { id: "identity", kind: "presentation", view: view.id,
    outputs: [{ view: view.id, output: ports.output.lock, action: { kind: "lock" } }] };
  assert.equal(view.content[1].kind, "identity");
  assert.throws(() => Reflect.apply(Components.Identity, undefined, [{ administrator: true }]), /INVALID_COMPONENT_PROPERTIES/);
  assert.doesNotThrow(() => validateJourneyViews(journey, [view]));
  assert.doesNotThrow(() => validateJourneyOutputs(journey, [view], new Map([[journey.id, journey]])));
  const other = { ...view, content: [view.content[0]] };
  assert.throws(() => validateJourneyOutputs(journey, [other], new Map([[journey.id, journey]])), /INVALID_IDENTITY_LOCK/);
});
