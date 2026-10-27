import test from "node:test";
import assert from "node:assert/strict";
import { labelsInputControl } from "../src/interaction/labels-control.ts";
import { addWrittenLabel } from "../src/interaction/label-writing.ts";
import { applyControlEvent, controlNode } from "../src/interaction/control-nodes.ts";
import { resolvedNode } from "../src/interaction/resolved-node.ts";
import { labelLimits } from "../src/labels.ts";
import { application, CreateItem } from "./fixtures/labels.ts";

const control = (values: readonly string[] = []) => labelsInputControl("projects", "Projects", values, labelLimits);
test("labels Add trims only its explicit writing, preserves order and never parses CSV", () => {
  const node = control(["Existing"]);
  assert.deepEqual(addWrittenLabel(node, "  Next project  "), { added: true, values: ["Existing", "Next project"] });
  assert.deepEqual(addWrittenLabel(node, "A,B"), { added: true, values: ["Existing", "A,B"] });
  assert.deepEqual(node.values, ["Existing"]);
  for (const writing of ["", "   ", "Existing", " Existing "]) assert.equal(addWrittenLabel(node, writing).added, false);
  assert.equal(addWrittenLabel({ ...node, disabled: true }, "New").added, false);
  assert.equal(addWrittenLabel(control(Array.from({ length: 12 }, (_, i) => `Project ${i}`)), "Retain this writing").added, false);
});

test("Unicode and invalid writing stay intact; the canonical command owns label validity", () => {
  for (const length of [64, 65]) {
    const label = "🌵".repeat(length), result = addWrittenLabel(control(), label);
    assert.ok(result.added);
    assert.deepEqual(result.values, [label]);
    const changed = applyControlEvent(control(), { kind: "labels.change", control: "projects", values: result.values }).node;
    assert.equal(changed.kind, "labels");
    assert.doesNotThrow(() => resolvedNode({ version: "desert.bank-node/1", kind: "control.labels", control: changed }));
    assert.equal(application.validateInput(CreateItem.command.id, { title: "Task", projects: result.values }).valid, length === 64);
  }
  const changed = applyControlEvent(control(), { kind: "labels.change", control: "projects", values: ["Duplicate", "Duplicate"] }).node;
  assert.ok(changed.kind === "labels");
  assert.deepEqual(changed.values, ["Duplicate", "Duplicate"], "invalid draft values are not silently repaired");
  assert.ok(Object.isFrozen(changed.values));
});

test("labels events and components are closed typed values, not encoded scalar or rendering hooks", () => {
  for (const patch of [{ values: "A,B" }, { values: [1] }, { component: "div" }, { style: undefined }]) {
    assert.throws(() => controlNode({ ...control(), ...patch }), /INVALID_|Expected a JSON value/);
  }
  for (const event of [
    { kind: "labels.change", control: "projects", values: "A,B" },
    { kind: "labels.change", control: "different", values: [] },
    { kind: "labels.change", control: "projects", values: [], color: undefined },
  ]) assert.throws(() => applyControlEvent(control(), event), /INVALID_|Expected a JSON value/);
});
