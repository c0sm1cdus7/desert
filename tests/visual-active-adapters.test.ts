import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assertClosedVisualBoundaries } from "../src/authoring/visual-boundary/closed.ts";
import { assertCompleteAdapterSources, requiredAdapterSources } from "../src/authoring/visual-boundary/adapter.ts";

const paths = ["catalog/renderer/panel/Panel", "FailureDialog", "catalog/renderer/control-renderer/ControlRenderer", "catalog/renderer/public-catalog-bank-specimen/PublicCatalogBankSpecimen"]
  .map(name => `src/svelte/${name}.svelte`);
const check = (path: string, source: string) => assertClosedVisualBoundaries([{ path, source }]);

for (const path of paths) test(`${path} cannot paint or bypass its catalog`, () => {
  for (const source of [
    "<div />", "Text outside a catalog owner", "<style>p { color: red }</style>",
    `<script>import Owner from '@desert/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte';</script><Owner node={node}/>` ,
    `<script>import { NodeRenderer } from '@desert/svelte/adapter-catalog.ts';</script><NodeRenderer node={node} class="p-0"/>`,
    `<script>import { NodeRenderer } from '@desert/svelte/adapter-catalog.ts';</script><NodeRenderer node={node} {...extra}/>` ,
    `<script>import { NodeRenderer } from '@desert/svelte/adapter-catalog.ts';</script><NodeRenderer node={node} host={host}/>` ,
    `<script>import { NodeRenderer } from '@desert/svelte/adapter-catalog.ts';</script><NodeRenderer node={node} actionElementProps={extra}/>` ,
    '<script>fetch("/bank-image.svg");</script>',
    '<script>const read = fetch; read("/api/private-media");</script>',
  ]) assert.throws(() => check(path, source), /CLOSED_VISUAL_BOUNDARY/, source);
});

test("active adapter implementations pass, and cannot disappear from a real build", async () => {
  for (const path of paths) {
    check(path, await readFile(new URL(`../${path}`, import.meta.url), "utf8"));
    assert.ok(requiredAdapterSources.includes(path), path);
    assert.throws(() => assertCompleteAdapterSources(requiredAdapterSources.filter(item => item !== path).map(path => ({ path }))),
      /missing required source/);
  }
});

test("private transient and control capabilities are separate finite gateway entries", () => {
  for (const [entry, capability] of [["TransientRenderer", "frameIdentity"], ["ControlNodeRenderer", "host"]]) {
    const start = `<script>import { ${entry} } from '@desert/svelte/adapter-catalog.ts';</script>`;
    const path = paths[0]!;
    assert.doesNotThrow(() => check(path, `${start}<${entry} node={node} onevent={send} ${capability}={value}/>`));
    for (const extra of ["class", "style", "actionElementProps", capability === "host" ? "frameIdentity" : "host"]) {
      assert.throws(() => check(path, `${start}<${entry} node={node} ${extra}={value}/>`), /CLOSED_VISUAL_BOUNDARY/);
    }
  }
});
