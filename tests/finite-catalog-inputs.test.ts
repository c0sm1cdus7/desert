import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assertFiniteCatalogInputs } from "../src/authoring/visual-boundary/finite-inputs.ts";

const owner = "src/svelte/pieces/SearchField.svelte";
const caller = "src/svelte/explorer/AnyConsumer.svelte";
const source = (markup: string) => '<script>import Search from "../pieces/SearchField.svelte";</script>' + markup;

test("finite-input owners reject native contracts, rest forwarding and visual props", () => {
  for (const text of [
    '<script lang="ts">import type { HTMLInputAttributes } from "svelte/elements"; let {value}: HTMLInputAttributes=$props();</script><input/>',
    '<script lang="ts">let {value,...rest}: {value:string}=$props();</script><input {...rest}/>',
    '<script lang="ts">let {class: css}: {class?:string}=$props();</script><input class={css}/>',
    '<script lang="ts">let {style}: {style?:string}=$props();</script><input {style}/>',
    '<script lang="ts">let {viewportAttributes}: {viewportAttributes?:object}=$props();</script><input/>',
    '<script lang="ts">let props: {[key:string]:unknown}=$props();</script><input/>',
  ]) assert.throws(() => assertFiniteCatalogInputs([{path:owner,source:text}]), /FINITE_CATALOG_INPUT/, text);
});

test("every finite-input caller loses class/style/directive/attributes escapes independent of spelling", () => {
  for (const markup of ['<Search class="p-0"/>', '<Search style="padding:0"/>', '<Search {...native}/>',
    '<Search viewportAttributes={{style:"padding:0"}}/>', '<Search class:large={large}/>',
    '<Search style:padding="0"/>', '<Search data-anything="native"/>', '<Search role="button"/>']) {
    assert.throws(() => assertFiniteCatalogInputs([{path:caller,source:source(markup)}]), /FINITE_CATALOG_INPUT/, markup);
  }
  for (const path of [caller,"src/svelte/pieces/Arbitrary.svelte","src/svelte/vendor/Arbitrary.svelte"]) {
    assert.throws(() => assertFiniteCatalogInputs([{path,source:'<script>import Search from "@desert/svelte/pieces/SearchField.svelte";</script><Search class="p-0"/>'}]), /FINITE_CATALOG_INPUT/);
  }
});

test("finite inputs retain semantic values, typed bindables and explicit private slots", () => {
  assert.doesNotThrow(() => assertFiniteCatalogInputs([{path:caller,source:source('<Search value="query" label="Find" bind:ref={input}/>')}]));
  assert.doesNotThrow(() => assertFiniteCatalogInputs([{path:"src/svelte/pieces/MeasuredField.svelte",source:
    '<script lang="ts">import type {Snippet} from "svelte"; let {children,measure}: {children?:Snippet;measure:"writing"}=$props();</script><div>{@render children?.()}</div>'}]));
});

test("finite owners cannot be aliased opaquely across scripts or template expressions", () => {
  for (const text of [
    '<script>import Search from "../pieces/SearchField.svelte"; const Alias=Search;</script><Alias class="p-0"/>',
    '<script>const Alias=Search;</script><script module>import Search from "../pieces/SearchField.svelte";</script><Alias class="p-0"/>',
    '<script>import Search from "../pieces/SearchField.svelte";</script>{@const Alias=Search}<Alias class="p-0"/>',
    '<script>import * as Search from "../pieces/SearchField.svelte";</script><Search.default class="p-0"/>',
    '<script>const module=import("../pieces/SearchField.svelte");</script>',
  ]) assert.throws(()=>assertFiniteCatalogInputs([{path:caller,source:text}]),/FINITE_CATALOG_INPUT/);
});

test("the four native-input owners contain no broad native API and every current caller passes", async () => {
  const { readVisualBoundarySources } = await import("../src/authoring/visual-boundary/source.ts");
  const sources = await readVisualBoundarySources(resolve(import.meta.dirname,".."));
  for (const name of ["Place","SearchField","MaskedInput","MeasuredField"]) {
    const text = await readFile(resolve(import.meta.dirname,`../src/svelte/pieces/${name}.svelte`),"utf8");
    assert.doesNotMatch(text,/HTML\w*Attributes|ComponentProps|viewportAttributes|\.\.\.attributes|\.\.\.props/);
  }
  assert.doesNotThrow(() => assertFiniteCatalogInputs(sources));
});
