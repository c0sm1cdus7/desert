import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import { buildHumanModule } from "../src/web/build.ts";
import { formFrame } from "../src/interaction/frame-presenters.ts";
import { surfaceFrame } from "../src/interaction/surface-frame.ts";
import { transientFrame } from "../src/interaction/transient-frame.ts";
import { toolbarAction } from "../src/interaction/toolbar.ts";
import { dispatchSurfaceIntent, surfaceIntent } from "../src/interaction/intent.ts";
import type { HumanSurface } from "../src/web/types.ts";

test("product journey names never share a dispatch namespace with renderer operations", async () => {
  for (const name of ["accept", "recover", "back", "close", "surface.close"]) {
    const definition = JSON.parse(JSON.stringify(Notebook).replaceAll("create-note", name));
    const application = compile(definition);
    const projected = application.surface("human");
    assert.ok(projected.language && projected.navigation && projected.connection && projected.commit);
    const surface: HumanSurface = { ...projected, language: projected.language, navigation: projected.navigation,
      connection: projected.connection, commit: projected.commit };
    assert.ok((await buildHumanModule(application, "human")).length > 0);
    const journey = surface.journeys.find(candidate => candidate.id === name);
    assert.ok(journey?.kind === "mutation");
    const frame = transientFrame(formFrame(surface, journey, { title: "A note", body: "Writing" }, {
      secondary: toolbarAction({ kind: "back" }, "Back", "back"),
      primary: toolbarAction({ kind: "journey", journey: name }, "Save", "save"),
    }), false);
    const observed: string[] = [];
    assert.ok(frame.bottom.primary);
    dispatchSurfaceIntent(frame.bottom.primary.intent, {
      journey: id => { observed.push(`journey:${id}`); },
      back: () => { observed.push("back"); }, accept: () => { observed.push("accept"); },
      recover: () => { observed.push("recover"); }, close: () => { observed.push("close"); },
    });
    assert.deepEqual(observed, [`journey:${name}`]);
  }
});

test("surface intents are runtime-closed, nonempty, immutable and not inferred from presentation", () => {
  for (const value of ["accept", {}, { kind: "unknown" }, { kind: "journey", journey: "" },
    { kind: "accept", journey: "accept" }, { kind: "journey", journey: "accept", action: "accept" }]) {
    assert.throws(() => surfaceIntent(value), /INVALID_SURFACE_INTENT/);
  }
  assert.ok(Object.isFrozen(surfaceIntent({ kind: "journey", journey: "accept" })));
  const source = { version: "desert.surface-frame/6", kind: "journey",
    top: { title: "Example" }, content: { kind: "message", text: "Details" }, bottom: {} };
  assert.throws(() => surfaceFrame({ ...source, bottom: {
    primary: { id: "accept", label: "Accept", icon: "confirm", state: "ready" },
  } }), /INVALID_SURFACE_FRAME/);
  const first = toolbarAction({ kind: "accept" }, "Save", "save");
  const second = toolbarAction({ kind: "accept" }, "Confirm", "confirm");
  assert.throws(() => surfaceFrame({ ...source, bottom: { primary: first, secondary: second } }), /INVALID_SURFACE_FRAME_ACTIONS/);
  assert.doesNotThrow(() => surfaceFrame({ ...source, bottom: { primary: first,
    secondary: toolbarAction({ kind: "journey", journey: "accept" }, "Save", "save") } }));
});

test("forms require their exact journey intent and transient navigation uses intent semantics", () => {
  const source = { version: "desert.surface-frame/6", kind: "journey",
    top: { title: "Example" }, content: { kind: "form", submit: "accept", fields: [] }, bottom: {} };
  for (const intent of [{ kind: "accept" }, { kind: "journey", journey: "another" }] as const) {
    assert.throws(() => surfaceFrame({ ...source, bottom: { primary: toolbarAction(intent, "Save", "save") } }),
      /INVALID_SURFACE_FRAME_ACTIONS/);
  }
  const back = toolbarAction({ kind: "back" }, "Return", "open");
  const input = surfaceFrame({ ...source, top: { ...source.top,
    leading: toolbarAction({ kind: "back" }, "Previous", "back") }, bottom: { secondary: back,
    primary: toolbarAction({ kind: "journey", journey: "accept" }, "Close", "close") } });
  const frame = transientFrame(input, false);
  assert.deepEqual(frame.top.leading, back);
  assert.equal(frame.bottom.primary?.intent.kind, "journey");
});
