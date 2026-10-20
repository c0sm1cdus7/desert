import test from "node:test";
import assert from "node:assert/strict";
import { controlNode, applyControlEvent, type FileNode } from "../src/interaction/control-nodes.ts";
import { LocalFileHost } from "../src/svelte/controls/file-host.ts";

const select = { version: "desert.control/1", kind: "select", id: "color", label: "Color", disabled: false,
  required: false, value: null, options: [{ value: "red", label: "Red", disabled: false },
    { value: "blue", label: "Blue", disabled: true }] };
const files = { version: "desert.control/1", kind: "files", id: "attachments", label: "Local files", disabled: false,
  limits: { maxCount: 2, maxFileBytes: 10, maxTotalBytes: 15, accept: ["text/plain"] }, files: [] };
const file = (id: string, size = 5, mediaType = "text/plain") => ({ id, name: `${id}.txt`, size, mediaType, lastModified: 0 });

test("control descriptors are closed, immutable JSON with explicit unset and safe content", () => {
  const node = controlNode(select);
  assert.ok(Object.isFrozen(node));
  assert.deepEqual(JSON.parse(JSON.stringify(node)), select);
  for (const value of [{ ...select, html: "<b>Hi</b>" }, { ...select, value: "missing" },
    { ...select, options: [...select.options, select.options[0]] }, { ...select, value: undefined },
    { ...files, limits: { ...files.limits, maxCount: 0 } }, { ...files, files: [file("x", -1)] }]) {
    assert.throws(() => controlNode(value));
  }
  const popover = { version: "desert.control/1", kind: "popover", id: "help", label: "Help", disabled: false,
    open: false, title: "About this control", content: [{ kind: "text", text: "Safe plain text" }] };
  assert.equal(controlNode(popover).kind, "popover");
  assert.throws(() => controlNode({ ...popover, content: [{ kind: "html", html: "<b>Unsafe</b>" }] }));
  assert.throws(() => controlNode({ ...popover, children: () => "anything" }));
});

test("select events reject illegal values, disabled changes, mismatched targets and unknown fields", () => {
  const node = controlNode(select);
  const event = { kind: "select.change", control: "color", value: "red" };
  const result = applyControlEvent(node, event);
  assert.equal(result.node.kind === "select" && result.node.value, "red");
  assert.equal(applyControlEvent(result.node, { ...event, value: null }).node.kind, "select");
  for (const invalid of [{ ...event, value: "blue" }, { ...event, value: "other" },
    { ...event, control: "elsewhere" }, { ...event, css: "red" }, { kind: "popover.open", control: "color", open: true }]) {
    assert.throws(() => applyControlEvent(node, invalid), /INVALID_CONTROL_EVENT/);
  }
  assert.throws(() => applyControlEvent(controlNode({ ...select, disabled: true }), event), /CONTROL_DISABLED/);
  assert.throws(() => applyControlEvent(controlNode({ ...select, required: true }), { ...event, value: null }), /INVALID_CONTROL_EVENT/);
});

test("local files apply deterministic type, count, per-file and total-size limits without upload", () => {
  const node = controlNode(files);
  const result = applyControlEvent(node, { kind: "files.choose", control: "attachments",
    files: [file("large", 11), file("wrong", 2, "image/png"), file("one", 10), file("total", 6), file("two", 5), file("extra", 1)] });
  assert.deepEqual((result.node as FileNode).files.map(item => item.id), ["one", "two"]);
  assert.deepEqual(result.rejected.map(item => item.reason), ["file-size", "media-type", "total-size", "count"]);
  const removed = applyControlEvent(result.node, { kind: "files.remove", control: "attachments", file: "one" });
  assert.deepEqual((removed.node as FileNode).files.map(item => item.id), ["two"]);
  assert.throws(() => applyControlEvent(node, { kind: "files.remove", control: "attachments", file: "missing" }), /INVALID_CONTROL_EVENT/);
  assert.throws(() => applyControlEvent(node, { kind: "files.choose", control: "attachments", files: [file("same"), file("same")] }), /INVALID_CONTROL_EVENT/);
  assert.throws(() => controlNode({ ...files, files: [file("too-large", 11)] }), /INVALID_CONTROL_FILES/);
});

test("popover state is typed and disabled controls cannot change or start open", () => {
  const source = { version: "desert.control/1", kind: "popover", id: "help", label: "Help", disabled: false,
    open: false, title: "Help", content: [{ kind: "fact", label: "Unknown", value: null }] };
  const opened = applyControlEvent(controlNode(source), { kind: "popover.open", control: "help", open: true });
  assert.equal(opened.node.kind === "popover" && opened.node.open, true);
  assert.throws(() => controlNode({ ...source, disabled: true, open: true }), /INVALID_CONTROL_POPOVER/);
  assert.throws(() => applyControlEvent(controlNode({ ...source, disabled: true }),
    { kind: "popover.open", control: "help", open: true }), /CONTROL_DISABLED/);
  const locked = controlNode({ ...source, open: true, locked: true });
  assert.throws(() => applyControlEvent(locked, { kind: "popover.open", control: "help", open: false }), /CONTROL_LOCKED/);
  assert.doesNotThrow(() => applyControlEvent(controlNode({ ...source, open: true, locked: false }),
    { kind: "popover.open", control: "help", open: false }));
});

test("browser host retains accepted File handles only, removes them and releases session memory", () => {
  const host = new LocalFileHost();
  const original = new File(["hello"], "note.txt", { type: "text/plain", lastModified: 1 });
  const selection = host.choose(controlNode(files) as FileNode, [original, new File(["x"], "bad.png", { type: "image/png" })]);
  const node = selection.result.node as FileNode;
  const id = node.files[0]!.id;
  assert.equal(host.resolve(id), original);
  assert.equal(host.resolve(selection.result.rejected[0]!.file.id), undefined);
  assert.equal(JSON.stringify(selection.event).includes("hello"), false);
  assert.throws(() => controlNode({ ...files, files: [original] }), /plain JSON object/);
  assert.throws(() => host.remove({ ...node, disabled: true }, id), /CONTROL_DISABLED/);
  assert.equal(host.resolve(id), original);
  host.remove(node, id);
  assert.equal(host.resolve(id), undefined);
  const again = host.choose(controlNode(files) as FileNode, [original]);
  const againId = (again.result.node as FileNode).files[0]!.id;
  host.dispose();
  assert.equal(host.resolve(againId), undefined);
});
