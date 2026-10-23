import assert from "node:assert/strict";
import test from "node:test";
import { Components, defineView, view } from "../src/index.ts";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import { systemStatusContent } from "../src/web/client/system-status.ts";
import { validateJourneyViews } from "../src/views/program-views.ts";
import type { HumanSurface } from "../src/web/types.ts";
import type { AvailabilitySnapshot } from "../src/availability-types.ts";
import { humanState } from "../src/web/client/state.ts";
import { projectView } from "../src/web/client/view-projection.ts";
import { program } from "./fixtures/view-program.ts";

const surface = compile(Notebook).surface("human") as HumanSurface;
const state = (ready: boolean): AvailabilitySnapshot => ({ contractDigest: surface.contractDigest,
  journeys: Object.fromEntries(surface.journeys.map(journey => [journey.id, { dependenciesReady: ready,
    blockers: ready ? [] : journey.dependencies.map(dependency => ({ dependency, reason: "unknown" as const })) }])) });

test("System status is a closed SDK composition that cannot author a connection or custom state", () => {
  const definition = defineView({ name: "system", content: [Components.Header({ title: "System" }), Components.SystemStatus()] });
  assert.equal(definition.content[1].kind, "system-status");
  assert.equal(definition.content[1].id, "content.1");
  assert.throws(() => Reflect.apply(Components.SystemStatus, undefined, [{ connected: true }]), /INVALID_COMPONENT_PROPERTIES/);
  assert.throws(() => view({ ...definition, content: [{ ...definition.content[1], connected: true }] }), /INVALID_VIEW/);
  assert.doesNotThrow(() => validateJourneyViews({ id: "system", kind: "presentation", view: definition.id, outputs: [] }, [definition]));
  assert.throws(() => validateJourneyViews({ id: "system", kind: "presentation", view: definition.id, outputs: [] },
    [view({ ...definition, content: [definition.content[1]] })]), /INVALID_JOURNEY_SYSTEM_CONTENT/);
});

test("status derives current readiness from evidence, not from the registered operation inventory", () => {
  const unknown = systemStatusContent("content.1", surface, state(false));
  const connected = systemStatusContent("content.1", surface, state(true));
  assert.deepEqual(unknown[0], { kind: "stack", id: "content.1.dependencies", title: "Execution dependencies",
    items: [{ kind: "fact", label: "notes", value: "Not yet observed" }] });
  assert.deepEqual(connected[0], { ...unknown[0], items: [{ kind: "fact", label: "notes", value: "Available" }] });
  assert.equal(unknown[1]!.title, "Exposed operations");
  assert.equal(unknown[1]!.items.length, surface.journeys.length);
  assert.ok(unknown[1]!.items.every(item => item.kind === "fact" && item.value !== "Dependencies available"));
  assert.ok(connected[1]!.items.every(item => item.kind === "fact" && item.value === "Dependencies available"));
  assert.deepEqual(connected[2]!.items, [
    { kind: "fact", label: "Product", value: "notebook" },
    { kind: "fact", label: "Surface", value: "human" },
    { kind: "fact", label: "Interaction protocol", value: surface.protocol },
    { kind: "fact", label: "Visual catalog version", value: surface.catalog!.version },
    { kind: "fact", label: "Contract digest", value: surface.contractDigest },
  ]);
  assert.equal(JSON.stringify(connected).includes("identity"), false, "Unpublished identity is not invented");
});

test("expired, mismatched, missing and blocked evidence cannot claim connected status", () => {
  for (const reason of ["stale", "incompatible", "unreachable", "session-required", "unavailable", "disposed"] as const) {
    const availability: AvailabilitySnapshot = { contractDigest: surface.contractDigest,
      journeys: Object.fromEntries(surface.journeys.map(journey => [journey.id, {
        dependenciesReady: false, blockers: journey.dependencies.map(dependency => ({ dependency, reason })),
      }])) };
    const content = systemStatusContent("content.1", surface, availability);
    assert.ok(content[0]!.items.every(item => item.kind === "fact" && item.value !== "Available"), reason);
    assert.ok(content[1]!.items.every(item => item.kind === "fact" && item.value !== "Dependencies available"), reason);
  }
  for (const availability of [{ ...state(true), contractDigest: "other" }, { ...state(true), journeys: {} }]) {
    assert.ok(systemStatusContent("content.1", surface, availability)[0]!.items
      .every(item => item.kind === "fact" && item.value !== "Available"));
  }
});

test("the actual View projection expands live status into existing catalog pieces only", () => {
  const definition = defineView({ name: "system", content: [Components.Header({ title: "System" }), Components.SystemStatus()] });
  const journey = { id: "inspect-system", kind: "presentation", view: definition.id, outputs: [] } as const;
  const store = humanState(surface, { kind: "presentation" });
  const project = () => projectView(program, journey, definition, surface, store.get(), () => true, { kind: "presentation" });
  assert.deepEqual(project().view.content.map(item => item.kind), ["header", "stack", "stack", "stack"]);
  assert.ok(JSON.stringify(project().view.content).includes("Not yet observed"));
  store.update({ availability: state(true) });
  assert.ok(JSON.stringify(project().view.content).includes("Dependencies available"));
  store.update({ availability: state(false) });
  assert.equal(JSON.stringify(project().view.content).includes("Dependencies available"), false);
  assert.deepEqual(project().bindings, {});
  assert.deepEqual(project().top?.trailing, []);
});
