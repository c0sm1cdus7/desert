import test from "node:test";
import assert from "node:assert/strict";
import { surfaceFrame } from "../src/interaction/surface-frame.ts";
import { toolbarAction } from "../src/interaction/toolbar.ts";
import { dispatchSurfaceIntent } from "../src/interaction/intent.ts";
import { controlNode, applyControlEvent } from "../src/interaction/control-nodes.ts";

const base = { version: "desert.surface-frame/6", kind: "context", top: { title: "Object" },
  content: { kind: "message", text: "Reading" }, bottom: {} };
const close = toolbarAction({ kind: "close" }, "Close", "close");
const recover = toolbarAction({ kind: "recover" }, "Check result", "recover");
const save = toolbarAction({ kind: "journey", journey: "save" }, "Save", "save");

test("context headers expose semantic journeys without acceptance or navigation impersonation", () => {
  assert.doesNotThrow(() => surfaceFrame({ ...base, top: { ...base.top, leading: close, trailing: [save, recover] } }));
  assert.throws(() => surfaceFrame({ ...base, top: { ...base.top, leading: save } }), /INVALID_SURFACE_FRAME/);
  for (const action of [toolbarAction({ kind: "accept" }, "Accept", "confirm")]) {
    for (const top of [{ ...base.top, leading: action }, { ...base.top, trailing: [action] }]) {
      assert.throws(() => surfaceFrame({ ...base, top }), /INVALID_SURFACE_FRAME/);
    }
  }
});

test("message headers admit dismissal without command or recovery bypass", () => {
  for (const action of [save, recover, toolbarAction({ kind: "accept" }, "Accept", "confirm")]) {
    for (const top of [{ ...base.top, leading: action }, { ...base.top, trailing: [action] }]) {
      assert.throws(() => surfaceFrame({ ...base, kind: "message", top }), /INVALID_SURFACE_FRAME/);
    }
  }
  assert.doesNotThrow(() => surfaceFrame({ ...base, kind: "message", top: { ...base.top, leading: close } }));
});

test("navigation has only leading and secondary roles, never primary or trailing", () => {
  for (const action of [close, toolbarAction({ kind: "back" }, "Back", "back")]) {
    assert.throws(() => surfaceFrame({ ...base, kind: "journey", bottom: { primary: action } }), /INVALID_SURFACE_FRAME/);
    assert.throws(() => surfaceFrame({ ...base, kind: "journey", top: { ...base.top, trailing: [action] } }), /INVALID_SURFACE_FRAME/);
  }
  assert.doesNotThrow(() => surfaceFrame({ ...base, kind: "journey", bottom: { primary: save, secondary: close } }));
});

test("form identity is unique independently of labels, values, or input type", () => {
  const field = { name: "title", label: "Title", value: "", required: true, primitive: "input.text" };
  const frame = { ...base, kind: "journey", content: { kind: "form", submit: "save", fields: [field] },
    bottom: { primary: save } };
  assert.doesNotThrow(() => surfaceFrame(frame));
  assert.throws(() => surfaceFrame({ ...frame, content: { ...frame.content, fields: [field,
    { ...field, label: "Other title", value: "different", primitive: "input.multiline" }] } }), /INVALID_SURFACE_FRAME_FIELDS/);
  assert.doesNotThrow(() => surfaceFrame({ ...frame, content: { ...frame.content, fields: [field, { ...field, name: "body" }] } }));
});

test("long legal toolbars are accepted for the shared overflow policy, not arbitrarily capped", () => {
  const actions = Array.from({ length: 20 }, (_, index) => toolbarAction({ kind: "journey", journey: `utility-${index}` },
    `Utility ${index}`, "open"));
  assert.deepEqual(surfaceFrame({ ...base, kind: "journey", top: { ...base.top, trailing: actions } }).top.trailing, actions);
});

test("frame revision 6 excludes selection chrome and legacy confirmation has no product dispatcher", () => {
  const current = { ...base, version: "desert.surface-frame/6" };
  assert.deepEqual(surfaceFrame(current), current);
  assert.throws(() => surfaceFrame({ ...base, version: "desert.surface-frame/5" }), /INVALID_SURFACE_FRAME/);
  const confirm = toolbarAction({ kind: "selection.confirm", selection: "currency" }, "Confirm", "confirm");
  const content = { kind: "selection", id: "currency", label: "Currency", value: "usd",
    options: [{ value: "usd", label: "US dollars", disabled: false }] };
  assert.throws(() => surfaceFrame({ ...current, kind: "selection", content, bottom: { primary: confirm } }), /INVALID_SURFACE_FRAME/);
  for (const kind of ["context", "message", "journey", "specimen", "utilities"]) {
    assert.throws(() => surfaceFrame({ ...current, kind, bottom: { primary: confirm } }), /INVALID_SURFACE_FRAME/);
  }
  const observed: string[] = [];
  const record = () => { observed.push("invoked"); };
  assert.throws(() => dispatchSurfaceIntent(confirm.intent, { journey: record, accept: record, back: record, close: record, recover: record }),
    /INVALID_SURFACE_INTENT_SCOPE/);
  assert.deepEqual(observed, []);
});

test("selection commits one permitted value without a candidate or confirmation contract", () => {
  const selection = controlNode({ version: "desert.control/1", kind: "select", id: "delivery", label: "Delivery",
    disabled: false, required: true, value: "collect", options: [
      { value: "collect", label: "Collect", disabled: false }, { value: "deliver", label: "Deliver", disabled: false },
      { value: "unavailable", label: "Unavailable", disabled: true },
    ] });
  const result = applyControlEvent(selection, { kind: "select.change", control: "delivery", value: "deliver" });
  assert.deepEqual(result.node, { ...selection, value: "deliver" });
  assert.ok(Object.isFrozen(result.node));
  for (const value of [null, "missing", "unavailable"]) {
    assert.throws(() => applyControlEvent(selection, { kind: "select.change", control: "delivery", value }), /INVALID_CONTROL_EVENT/);
  }
  for (const privatePresentation of [{ modal: true }, { confirmation: "required" }, { toolbar: {} }]) {
    assert.throws(() => controlNode({ ...selection, ...privatePresentation }), /INVALID_CONTROL_NODE/);
  }
});

test("utility overflow carries the original actions with unique identities and no return-action impersonation", () => {
  const utilities = { ...base, kind: "utilities", content: { kind: "utilities", actions: [save, recover] } };
  assert.deepEqual(surfaceFrame(utilities).content, utilities.content);
  for (const actions of [[], [close], [recover, recover]]) {
    assert.throws(() => surfaceFrame({ ...utilities, content: { kind: "utilities", actions } }), /INVALID_SURFACE_FRAME/);
  }
});
