import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "../src/compile.ts";
import { protocolNotebookDefinition } from "./fixtures/notebook.ts";
import { CreateNote } from "../products/notebook/journeys.ts";
import type { ProductDefinition } from "../src/contracts.ts";
import { formFrame, toolbarAction } from "../src/interaction/frame-presenters.ts";
import { bankNode } from "../src/interaction/bank-node.ts";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import type { HumanSurface } from "../src/web/types.ts";

function form(maxLength: number) {
  const definition: ProductDefinition = protocolNotebookDefinition();
  const body = definition.objects[0]!.facts.body;
  assert.ok(body?.kind === "text");
  Object.assign(body, { minLength: 0, maxLength });
  const surface = compile(definition).surface("human") as HumanSurface;
  const journey = surface.journeys.find(item => item.id === CreateNote.id);
  assert.ok(journey?.kind === "mutation");
  return formFrame(surface, journey, { body: "💡" }, {
    primary: toolbarAction({ kind: "journey", journey: journey.id }, "Save", "save"),
  });
}

test("form projection retains declared maxima, including zero, without inventing limits", () => {
  for (const maxLength of [0, 8]) {
    const frame = form(maxLength); assert.equal(frame.content.kind, "form");
    const body = frame.content.fields.find(field => field.name === "body")!;
    assert.equal((body as unknown as { maxLength: number }).maxLength, maxLength);
    assert.equal(Object.hasOwn(frame.content.fields.find(field => field.name === "title")!, "maxLength"), false);
  }
});

test("multiline bank grammar accepts nonnegative integer limits and rejects malformed limits", () => {
  const base = { version: "desert.bank-node/1", kind: "input.multiline", name: "body", label: "Notes", value: "", required: false, disabled: false };
  for (const maxLength of [0, 8]) assert.equal((bankNode({ ...base, maxLength }) as unknown as { maxLength: number }).maxLength, maxLength);
  for (const maxLength of [-1, 0.5, "8", null]) assert.throws(() => bankNode({ ...base, maxLength }), /INVALID_BANK_NODE/);
});

test("real form fields propagate the domain maximum through the bank into the shared textarea", async () => {
  const frame = form(8);
  const f = await svelteBrowser(`<script lang="ts">
    import SurfaceFrame from '@desert/svelte/SurfaceFrame.svelte';
    const frame = ${JSON.stringify(frame)};
  </script><SurfaceFrame {frame} invoke={() => {}} />`);
  try {
    const field = f.page.locator("textarea");
    assert.equal(await field.count(), 1);
    const ids = (await field.getAttribute("aria-describedby"))?.split(/\s+/) ?? [];
    const counter = ids.find(id => id.endsWith("-counter")); assert.ok(counter, "Product textarea has the shared counter");
    assert.equal(await f.page.locator(`[id="${counter}"]`).innerText(), "7 remaining");
    assert.equal(await field.getAttribute("maxlength"), null);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
