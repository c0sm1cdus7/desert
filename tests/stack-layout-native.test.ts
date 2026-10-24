// StackLayout (slice 3, F1.9) draws its own fieldset and legend: no vendor `field` import (VENDOR_OUTSIDE_OWNER), and
// the same geometry classes the vendor family drew for it, so its pixels do not change.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderFoundation } from "./fixtures/foundation-server.ts";

const entry = resolve(import.meta.dirname, "../src/svelte/catalog/foundations/stack-layout/StackLayout.svelte");
const classesOf = (body: string, tag: string) => {
  const match = new RegExp(`<${tag}[^>]*class="([^"]*)"`).exec(body);
  return new Set((match?.[1] ?? "").split(/\s+/).filter(Boolean));
};

test("StackLayout imports no vendor family", async () => {
  assert.doesNotMatch(await readFile(entry, "utf8"), /vendor\/components\/ui/);
});

test("the native fieldset, legend and group keep the classes the vendor field family composed", async () => {
  const vendor = await renderFoundation(`<script lang="ts">
  import * as Field from "@desert/svelte/vendor/components/ui/field/index.js";
</script>
<Field.FieldSet class="place-stack"><Field.FieldLegend class="place-stack-title" visibility="accessible">T</Field.FieldLegend>
<Field.FieldGroup class="place-stack-content">C</Field.FieldGroup></Field.FieldSet>`);
  const own = await renderFoundation(`<script lang="ts">
  import StackLayout from "@desert/svelte/catalog/foundations/stack-layout/StackLayout.svelte";
</script>
<StackLayout title="Connection" description="Changes are sent when the connection returns." headingVisibility="accessible" />`);
  assert.deepEqual(classesOf(own, "fieldset"), classesOf(vendor, "fieldset"));
  assert.deepEqual(classesOf(own, "legend"), classesOf(vendor, "legend"));
  assert.deepEqual(classesOf(own, "div"), classesOf(vendor, "div"));
  assert.match(own, /<fieldset class="[^"]*" aria-describedby="[^"]+-description"/);
  assert.match(own, /<p id="[^"]+-description" class="place-stack-description type-caption text-muted-foreground">Changes are sent/);
});

test("a visible title is not hidden from sight", async () => {
  const own = await renderFoundation(`<script lang="ts">
  import StackLayout from "@desert/svelte/catalog/foundations/stack-layout/StackLayout.svelte";
</script>
<StackLayout title="Appearance" headingVisibility="visible" />`);
  assert.equal(classesOf(own, "legend").has("sr-only"), false);
  assert.equal(classesOf(own, "legend").has("place-stack-title"), true);
});
