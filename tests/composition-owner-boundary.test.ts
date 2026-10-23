import assert from "node:assert/strict";
import test from "node:test";
import { assertClosedVisualBoundaries } from "../src/authoring/visual-boundary/closed.ts";

const path = "src/svelte/catalog/compositions/view-workspace/ViewWorkspace.svelte";
const check = (source: string) => assertClosedVisualBoundaries([{ path, source }]);

test("a composition owns private lexical snippets without exposing a public render slot", () => {
  assert.doesNotThrow(() => check('{#snippet title()}<h1>Notes</h1>{/snippet}'
    + '{#snippet content()}{@render title()}{/snippet}{@render content()}'));
  for (const source of [
    '<script lang="ts">import type { Snippet } from "svelte"; let {children}: {children:Snippet}=$props();</script>{@render children()}',
    '<script>let {content}=$props();</script>{@render content()}',
    '<script>let {parts}=$props();</script>{@render parts.content()}',
    '{#snippet content()}<p>Local</p>{/snippet}{#snippet outer(content)}{@render content()}{/snippet}',
    '{#snippet content()}<p>Local</p>{/snippet}{#each items as content}{@render content()}{/each}',
    '{#snippet content()}<p>Local</p>{/snippet}{#if yes}{@const content=foreign}{@render content()}{/if}',
    '<script>let {attrs}=$props();</script><div {...attrs}/>',
    '{@html content}',
  ]) assert.throws(() => check(source), /CLOSED_VISUAL_BOUNDARY/, source);
});

test("composition consumers cannot redefine appearance or supply render children", () => {
  const source = (markup: string) => '<script>import Workspace from "../catalog/compositions/view-workspace/ViewWorkspace.svelte";</script>' + markup;
  const use = (markup: string) => assertClosedVisualBoundaries([{ path: "src/svelte/views/Example.svelte", source: source(markup) }]);
  assert.doesNotThrow(() => use('<Workspace {resolved} {program}/>'));
  for (const markup of ['<Workspace class="override"/>', '<Workspace style="padding:0"/>',
    '<Workspace {...props}/>', '<Workspace children={foreign}/>', '<Workspace><p>Foreign</p></Workspace>']) {
    assert.throws(() => use(markup), /CLOSED_VISUAL_BOUNDARY/, markup);
  }
});
