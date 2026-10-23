import assert from "node:assert/strict";
import test from "node:test";
import { inspectVisualSource } from "../src/authoring/visual-boundary/inspect.ts";
import { assertClosedVisualBoundaries } from "../src/authoring/visual-boundary/closed.ts";

const path = "src/svelte/pieces/ContentFlow.svelte";
const codes = (source: string, target = path) => inspectVisualSource(target, source).findings.map(item => item.code);

test("registered private compositions distinguish proven lexical snippets from public render slots", () => {
  const source = "{#snippet title()}<h1>Notes</h1>{/snippet}"
    + "{#snippet content()}{@render title()}{/snippet}{@render content()}";
  assert.deepEqual(codes(source), []);
  assert.doesNotThrow(() => assertClosedVisualBoundaries([{ path, source }]));
  for (const target of ["src/svelte/pieces/Unregistered.svelte", "src/svelte/FrameBody.svelte"]) {
    assert.ok(codes(source, target).includes("RENDER_SLOT"), "location alone cannot approve lexical ownership");
  }
});

test("a local snippet never hides an externally supplied snippet contract", () => {
  const source = '<script lang="ts">import type {Snippet} from "svelte";'
    + 'let {children}: {children:Snippet}=$props();</script>'
    + "{#snippet local()}<p>Local</p>{/snippet}{@render local()}";
  assert.deepEqual(codes(source), ["OPEN_COMPONENT_CONTRACT", "OPEN_COMPONENT_CONTRACT"]);
  assert.throws(() => assertClosedVisualBoundaries([{ path, source }]), /OPEN_COMPONENT_CONTRACT/);
});

test("incoming, aliased and shadowed render calls never acquire lexical ownership", () => {
  for (const source of [
    '<script>let {children}=$props();</script>{@render children()}',
    '<script>let {parts}=$props();</script>{@render parts.content()}',
    '{#snippet content()}<p>Local</p>{/snippet}{#snippet outer(content)}{@render content()}{/snippet}',
    '{#snippet content()}<p>Local</p>{/snippet}{#each items as content}{@render content()}{/each}',
    '{#snippet content()}<p>Local</p>{/snippet}{#await promise then content}{@render content()}{/await}',
    '{#snippet content()}<p>Local</p>{/snippet}{#await promise catch content}{@render content()}{/await}',
    '{#snippet content()}<p>Local</p>{/snippet}{#if yes}{@const content=foreign}{@render content()}{/if}',
    '{#snippet content()}<p>Local</p>{/snippet}<script>const alias=foreign;</script>{@render alias()}',
    '{#snippet content()}<p>Local</p>{/snippet}<div {...attrs}/>{@render content()}',
  ]) {
    assert.ok(codes(source).includes("RENDER_SLOT"), source);
    assert.throws(() => assertClosedVisualBoundaries([{ path, source }]), /CLOSED_VISUAL_BOUNDARY/, source);
  }
});

test("lexical proof never hides raw HTML or native contract openings", () => {
  for (const [source, code] of [
    ['{#snippet content()}{@html foreign}{/snippet}{@render content()}', "RAW_HTML"],
    ['<script lang="ts">import type {HTMLAttributes} from "svelte/elements";</script>'
      + '{#snippet content()}<p>Local</p>{/snippet}{@render content()}', "OPEN_COMPONENT_CONTRACT"],
  ] as const) assert.ok(codes(source).includes(code), code);
});
