// StackItem (slice 3, F1.9): the caller passes the placement; the kind → placement table is one infra fact.
import test from "node:test";
import assert from "node:assert/strict";
import { stackPlacement } from "../src/svelte/infra/stack-placement.ts";
import { renderFoundation } from "./fixtures/foundation-server.ts";

test("framed content kinds keep their own inset; every other kind reads at the surface inset", () => {
  for (const kind of ["control.tag", "control.avatar", "control.image", "catalog.card", "availability"] as const)
    assert.equal(stackPlacement(kind), "content", kind);
  for (const kind of ["action", "input.text", "control.select", "catalog.home", "fact"] as const)
    assert.equal(stackPlacement(kind), "surface", kind);
});

test("StackItem draws the placement it is given", async () => {
  const body = await renderFoundation(`<script lang="ts">
  import StackItem from "@desert/svelte/catalog/foundations/stack-item/StackItem.svelte";
</script>
<StackItem placement="content" kind="control.tag"><span>Travel</span></StackItem>
<StackItem placement="surface" kind="catalog.home"><span>Home</span></StackItem>`);
  assert.match(body, /<div data-stack-item="" data-stack-kind="control.tag" data-stack-placement="content"><span>Travel<\/span>/);
  assert.match(body, /<div data-stack-item="" data-stack-kind="catalog.home" data-stack-placement="surface"><span>Home<\/span>/);
});
