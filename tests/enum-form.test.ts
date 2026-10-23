import test from "node:test";
import assert from "node:assert/strict";
import { mutation, surface } from "./fixtures/image-input.ts";
import { emptyInputDraft } from "../src/web/client/input-draft.ts";
import { formFrame } from "../src/interaction/frame-presenters.ts";
import { toolbarAction } from "../src/interaction/toolbar.ts";

test("a mandatory single choice has a real initial value and no required marker", () => {
  const fit = { ...mutation, inputFields: ["fit"], inputSchema: { type: "object" as const,
    properties: { fit: { type: "string", enum: ["fill", "fit"] } }, required: ["fit"], additionalProperties: false as const } };
  const themed = { ...surface, fieldRepresentations: { ...surface.fieldRepresentations, "photo.fit": "text" as const },
    language: { ...surface.language, fields: { ...surface.language.fields, "photo.fit": "Thumbnail fit" } } };
  assert.deepEqual(emptyInputDraft(themed, fit), { fit: "fill" });
  assert.deepEqual(emptyInputDraft(themed, fit, { fit: "fit" }), { fit: "fit" });
  const frame = formFrame(themed, fit, { fit: "fit" }, { primary: toolbarAction({ kind: "journey", journey: fit.id }, "Save", "save") });
  assert.equal(frame.content.kind, "form");
  if (frame.content.kind !== "form") return;
  assert.deepEqual(frame.content.fields[0], { name: "fit", label: "Thumbnail fit", required: false,
    primitive: "control.select", value: "fit", options: [
      { value: "fill", label: "Fill", disabled: false }, { value: "fit", label: "Fit", disabled: false },
    ] });
});
