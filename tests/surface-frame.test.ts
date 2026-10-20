import test from "node:test";
import assert from "node:assert/strict";
import { surfaceFrame, type SurfaceFrame } from "../src/interaction/surface-frame.ts";
import { toolbarAction } from "../src/interaction/toolbar.ts";
import { transientFrame } from "../src/interaction/transient-frame.ts";

const frame = {
  version: "desert.surface-frame/6", kind: "context",
  top: { title: "A note" }, content: { kind: "message", text: "Loading…" },
  bottom: {},
} satisfies SurfaceFrame;

test("surface slots are required, closed, serializable and immutable", () => {
  const accepted = surfaceFrame(frame);
  assert.ok(Object.isFrozen(accepted.content));
  assert.deepEqual(JSON.parse(JSON.stringify(accepted)), frame);
  for (const slot of ["top", "content", "bottom"]) {
    const invalid: Record<string, unknown> = structuredClone(frame);
    delete invalid[slot];
    assert.throws(() => surfaceFrame(invalid), /INVALID_SURFACE_FRAME/);
  }
  for (const extra of [{ children: "<div/>" }, { class: "p-0" }, { style: {} }]) {
    assert.throws(() => surfaceFrame({ ...frame, ...extra }), /INVALID_SURFACE_FRAME/);
  }
  assert.throws(() => surfaceFrame({ ...frame, top: { title: "" } }), /INVALID_SURFACE_FRAME/);
  assert.throws(() => surfaceFrame({ ...frame, content: { kind: "html", html: "<div/>" } }), /INVALID_SURFACE_FRAME/);
  assert.throws(() => surfaceFrame({ ...frame, content: { ...frame.content, padding: 0 } }), /INVALID_SURFACE_FRAME/);
});

test("destination actions cannot be substituted for toolbar commands", () => {
  assert.throws(() => surfaceFrame({ ...frame, bottom: { primary:
    { destination: "archive-note", label: "Archive", available: true },
  } }), /INVALID_SURFACE_FRAME/);
});

test("toolbar roles own hierarchy; icons are mandatory and closed", () => {
  const save = toolbarAction({ kind: "journey", journey: "save" }, "Save", "save");
  assert.doesNotThrow(() => surfaceFrame({ ...frame, kind: "journey", bottom: { primary: save } }));
  const { icon: _icon, ...withoutIcon } = save;
  for (const bottom of [{ actions: [save] }, { primary: withoutIcon },
    { primary: { ...save, icon: "arbitrary" } }, { primary: { ...save, emphasis: "secondary" } },
    { primary: save, secondary: save }]) {
    assert.throws(() => surfaceFrame({ ...frame, bottom }), /INVALID_SURFACE_FRAME/);
  }
  assert.throws(() => surfaceFrame({ ...frame, kind: "journey", content: { kind: "form", submit: "save", fields: [] },
    bottom: { secondary: save } }), /INVALID_SURFACE_FRAME_ACTIONS/);
});

test("task/dialog frames keep the same leading and bottom dismissal alongside their primary", () => {
  const primary = toolbarAction({ kind: "accept" }, "Finish", "confirm");
  for (const locked of [false, true]) {
    const drawer = transientFrame(surfaceFrame({ ...frame, kind: "journey", bottom: { primary } }), locked);
    const close = toolbarAction({ kind: "close" }, "Close", "close", !locked);
    assert.deepEqual(drawer.bottom, { primary, secondary: close });
    assert.deepEqual(drawer.top.leading, close);
    assert.equal(drawer.top.trailing, undefined);
    assert.deepEqual(transientFrame(drawer, locked), drawer);
  }
});

test("Back is reused as the sole transient navigation and locking disables both copies", () => {
  const back = toolbarAction({ kind: "back" }, "Back", "back");
  const utility = toolbarAction({ kind: "recover" }, "Check result", "search");
  const source = surfaceFrame({ ...frame, kind: "journey", top: { title: "Review", trailing: [utility] },
    bottom: { secondary: back, primary: toolbarAction({ kind: "accept" }, "Finish", "confirm") } });
  for (const locked of [false, true]) {
    const drawer = transientFrame(source, locked);
    assert.deepEqual(drawer.top.leading, { ...back, state: locked ? "unavailable" : "ready" });
    assert.deepEqual(drawer.top.leading, drawer.bottom.secondary);
    assert.deepEqual(drawer.top.trailing, [utility]);
    assert.equal(drawer.bottom.primary?.state, "ready");
  }
});

test("transient navigation rejects conflicting or non-dismiss actions instead of losing them", () => {
  const journey = { ...frame, kind: "journey" as const };
  for (const source of [
    { ...journey, bottom: { secondary: toolbarAction({ kind: "recover" }, "Check result", "recover") } },
    { ...journey, bottom: { secondary: toolbarAction({ kind: "journey", journey: "back" }, "Back", "back") } },
    { ...journey, bottom: { secondary: { ...toolbarAction({ kind: "back" }, "Back", "back"), state: "pending" as const } } },
    { ...journey, top: { title: "Review", leading: toolbarAction({ kind: "back" }, "Close", "close") } },
  ]) assert.throws(() => transientFrame(surfaceFrame(source), false), /INVALID_TRANSIENT_NAVIGATION/);
  // These illegal roles now fail earlier, at the serializable frame boundary.
  for (const navigation of [toolbarAction({ kind: "close" }, "Close", "close"), toolbarAction({ kind: "back" }, "Back", "back")]) {
    assert.throws(() => surfaceFrame({ ...journey, bottom: { primary: navigation } }), /INVALID_SURFACE_FRAME/);
    assert.throws(() => surfaceFrame({ ...journey, top: { title: "Review", trailing: [navigation] } }), /INVALID_SURFACE_FRAME/);
  }
});

test("typed information preserves ordered facts and text without product markup or styling", () => {
  const content = { kind: "information", items: [{ kind: "text", text: "About this field" },
    { kind: "fact", label: "Unknown", value: null }, { kind: "fact", label: "Empty", value: "" }] };
  const source = { ...frame, kind: "specimen", content };
  assert.deepEqual(surfaceFrame(source).content, content);
  for (const invalid of [{ ...content, items: [] }, { ...content, class: "red" },
    { kind: "information", items: [{ kind: "html", text: "<b>hi</b>" }] },
    { kind: "information", items: [{ kind: "text", text: "hi", style: {} }] }]) {
    assert.throws(() => surfaceFrame({ ...source, content: invalid }), /INVALID_SURFACE_FRAME/);
  }
});

test("message severity is bounded semantic data, never an icon or style override", () => {
  for (const severity of ["warning", "error"]) {
    assert.doesNotThrow(() => surfaceFrame({ ...frame, top: { ...frame.top, face: { kind: "status", severity } } }));
  }
  for (const extra of [{ severity: "custom" }, { icon: "alert" }, { color: "red" }]) {
    assert.throws(() => surfaceFrame({ ...frame, top: { ...frame.top, face: { kind: "status", ...extra } } }), /INVALID_SURFACE_FRAME/);
  }
});

test("message frames admit only a message and dismissal, without claiming object-context semantics", () => {
  const message = { ...frame, kind: "message" };
  assert.deepEqual(transientFrame(surfaceFrame(message), false).bottom.secondary?.intent, { kind: "close" });
  for (const source of [{ ...message, content: { kind: "information", items: [{ kind: "text", text: "Info" }] } },
    { ...message, bottom: { primary: toolbarAction({ kind: "journey", journey: "save" }, "Save", "save") } }]) {
    assert.throws(() => surfaceFrame(source), /INVALID_SURFACE_FRAME/);
  }
});

test("an object context cannot carry a mutation form or command footer", () => {
  const save = toolbarAction({ kind: "journey", journey: "save" }, "Save", "save");
  for (const bottom of [{ primary: save }, { secondary: save }]) {
    assert.throws(() => surfaceFrame({ ...frame, bottom }), /INVALID_SURFACE_FRAME/);
  }
  assert.throws(() => surfaceFrame({ ...frame, content: { kind: "form", submit: "save", fields: [] } }), /INVALID_SURFACE_FRAME/);
  assert.deepEqual(transientFrame(frame, false).bottom.secondary?.intent, { kind: "close" });
});

test("a message face is typed header identity and cannot be placed in content", () => {
  const message = { ...frame, kind: "message", top: { title: "Not found", face: { kind: "status", severity: "warning" } },
    content: { kind: "message", text: "Your writing is preserved." } };
  assert.doesNotThrow(() => surfaceFrame(message));
  for (const invalid of [
    { ...message, top: { ...message.top, face: { kind: "status", severity: "custom" } } },
    { ...message, top: { ...message.top, face: { kind: "status", severity: "warning", size: 99 } } },
    { ...message, content: { ...message.content, severity: "warning" } },
    { ...message, content: { ...message.content, face: message.top.face } },
  ]) assert.throws(() => surfaceFrame(invalid), /INVALID_SURFACE_FRAME/);
});
