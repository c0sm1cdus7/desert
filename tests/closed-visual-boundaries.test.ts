import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { assertClosedVisualBoundaries, closedComponents } from "../src/authoring/visual-boundary/closed.ts";

const heading = "src/svelte/catalog/foundations/heading/Heading.svelte";
const consumer = "src/svelte/explorer/Example.svelte";
const source = (markup: string) => `<script>import Renamed from '../catalog/foundations/heading/Heading.svelte';</script>${markup}`;

test("closed consumer boundaries resolve imported identity, not component spelling or caller folder", () => {
  assert.doesNotThrow(() => assertClosedVisualBoundaries([{ path: consumer, source: source('<Renamed kind="page" text="Notes"/>') }]));
  for (const markup of ['<Renamed class="p-0"/>', '<Renamed style="--text-page:4px"/>', '<Renamed {...input}/>',
    '<Renamed bind:this={ref}/>', '<Renamed><span>HTML</span></Renamed>', '<Renamed>{#snippet children()}x{/snippet}</Renamed>']) {
    assert.throws(() => assertClosedVisualBoundaries([{ path: consumer, source: source(markup) }]), /CLOSED_VISUAL_BOUNDARY/);
  }
});

test("closed component contracts cannot reopen native attribute forwarding", () => {
  for (const value of ['<script lang="ts">import type { HTMLAttributes } from "svelte/elements";</script><h1/>',
    '<script>let {...attributes}=$props()</script><h1 {...attributes}/>', '<script>let {children}=$props()</script>{@render children()}']) {
    assert.throws(() => assertClosedVisualBoundaries([{ path: heading, source: value }]), /CLOSED_VISUAL_BOUNDARY/);
  }
});

test("a closed renderer adapter cannot regain DOM or CSS even if the debt snapshot is regenerated", () => {
  for (const source of ['<div/>', '<style>div{padding:3px}</style>', '<script>element.style.color="red"</script>']) {
    assert.throws(() => assertClosedVisualBoundaries([{ path: "src/svelte/catalog/renderer/frame-body/FrameBody.svelte", source }]), /CLOSED_VISUAL_BOUNDARY/);
  }
});

test("sealed adapters reject HTML injection and opaque component selection", () => {
  for (const source of [
    '{@html markup}',
    '<script>let { component } = $props();</script><svelte:component this={component}/>',
    '<script>let { Component } = $props();</script><Component/>',
    '<script>import Arbitrary from "./Anything.svelte";</script><Arbitrary/>',
  ]) {
    assert.throws(() => assertClosedVisualBoundaries([{ path: "src/svelte/catalog/renderer/frame-body/FrameBody.svelte", source }]),
      /CLOSED_VISUAL_BOUNDARY/, source);
  }
});

test("sealed adapters cannot acquire legacy native props through a catalog component", () => {
  const source = '<script>import NodeRenderer from "./NodeRenderer.svelte";</script>'
    + '<NodeRenderer {node} actionElementProps={{ style: "color:red" }}/>';
  assert.throws(() => assertClosedVisualBoundaries([{ path: "src/svelte/catalog/renderer/frame-body/FrameBody.svelte", source }]),
    /CLOSED_VISUAL_BOUNDARY/);
});

test("the adapter catalog admits owner-typed data and composition, not caller styling or slots", () => {
  const script = '<script>import { NodeRenderer as Bank, StackItem, ContentFlow } from "./adapter-catalog.ts";</script>';
  const assertSource = (markup: string) => assertClosedVisualBoundaries([{ path: "src/svelte/catalog/renderer/frame-body/FrameBody.svelte", source: script + markup }]);
  assert.doesNotThrow(() => assertSource('<StackItem kind="fact"><Bank {node} {onevent}/></StackItem>'));
  assert.doesNotThrow(() => assertSource('<ContentFlow {resolved} {onevent} {onalbum} bind:this={flow}/>'));
  for (const markup of ['<Bank {node} actionElementProps={attrs}/>', '<Bank {node} style="color:red"/>',
    '<Bank {node} {...props}/>', '<Bank {node} bind:this={bank}/>', '<Bank {node}>text</Bank>',
    '<StackItem kind="fact" children={external}/>', '<StackItem kind="fact">{@render external()}</StackItem>',
    '<Bank {node} onevent={() => import("./Anything.svelte")}/>',
    '<StackItem kind="fact">{text}</StackItem>', '<StackItem kind="fact"><div/></StackItem>']) {
    assert.throws(() => assertSource(markup), /CLOSED_VISUAL_BOUNDARY/, markup);
  }
});

test("catalog imports cannot be bypassed through shadowed names or opaque aliases", () => {
  const path = "src/svelte/catalog/renderer/frame-body/FrameBody.svelte";
  const script = '<script>import { NodeRenderer } from "./adapter-catalog.ts";</script>';
  for (const source of [
    script + '{#each components as NodeRenderer}<NodeRenderer/>{/each}',
    script + '{#each components as { component: NodeRenderer }}<NodeRenderer/>{/each}',
    script + '{@const NodeRenderer = arbitrary}<NodeRenderer/>',
    script + '{#await value then NodeRenderer}<NodeRenderer/>{/await}',
    script + '{#snippet nested(NodeRenderer)}<NodeRenderer/>{/snippet}',
    '<script>import * as Catalog from "./adapter-catalog.ts";</script><Catalog.NodeRenderer/>',
    '<script>import { NodeRenderer } from "./adapter-catalog.ts"; const Other = NodeRenderer;</script><Other/>',
    '<script>import { NodeRenderer } from "./adapter-catalog.ts"; const f = (NodeRenderer) => NodeRenderer;</script><NodeRenderer/>',
    '<script>const Component = (await import("./Anything.svelte")).default;</script><Component/>',
    '<script>import { Missing } from "./adapter-catalog.ts";</script><Missing/>',
    '<script module>import * as Catalog from "./adapter-catalog.ts";</script><Catalog.NodeRenderer/>',
  ]) assert.throws(() => assertClosedVisualBoundaries([{ path, source }]), /CLOSED_VISUAL_BOUNDARY/, source);
  assert.doesNotThrow(() => assertClosedVisualBoundaries([{ path,
    source: '<script module>import { NodeRenderer as Bank } from "./adapter-catalog.ts";</script><Bank {node}/>',
  }]));
});

test("the event-lifetime adapter has the same sealed rendering boundary", () => {
  const path = "src/svelte/catalog/renderer/instance-frame/InstanceFrame.svelte";
  assert.throws(() => assertClosedVisualBoundaries([{ path, source: '<div/>' }]), /CLOSED_VISUAL_BOUNDARY/);
  assert.throws(() => assertClosedVisualBoundaries([{ path, source:
    '<script>import { SurfaceFrame } from "./adapter-catalog.ts";</script><SurfaceFrame {frame} {invoke} style="padding:0"/>',
  }]), /CLOSED_VISUAL_BOUNDARY/);
  assert.doesNotThrow(() => assertClosedVisualBoundaries([{ path, source:
    '<script>import { SurfaceFrame } from "./adapter-catalog.ts";</script><SurfaceFrame {frame} {invoke} {edit} presentation="transient"/>',
  }]));
});

test("declaration names cannot shadow imported catalog identities across Svelte scripts", () => {
  const path = "src/svelte/catalog/renderer/frame-body/FrameBody.svelte";
  const script = '<script module>import { NodeRenderer as Bank } from "./adapter-catalog.ts";</script>';
  for (const declaration of [
    'function Bank() { return {}; }',
    'class Bank {}',
    'function enclosing() { function Bank() {} }',
    'function enclosing() { class Bank {} }',
  ]) assert.throws(() => assertClosedVisualBoundaries([{ path,
    source: script + `<script lang="ts">${declaration}</script><Bank/>`,
  }]), /shadowed catalog entry/, declaration);
});

test("sealed adapters cannot draw through runtime DOM globals or dynamic code", () => {
  const path = "src/svelte/catalog/renderer/frame-body/FrameBody.svelte";
  for (const source of [
    '<script>document.write("<h1>Foreign UI</h1>")</script>',
    '<script>const body = document.body;</script>',
    '<script>const browser = window; browser.document.write("Foreign UI")</script>',
    '<script>const browser = self; browser.document.write("Foreign UI")</script>',
    '<script>const browser = globalThis; browser.document.write("Foreign UI")</script>',
    '<script>const browser = globalThis["window"]; browser.document.write("Foreign UI")</script>',
    '<script>const capability = { document }; capability.document.write("Foreign UI")</script>',
    '<script module>document.write("Foreign UI")</script>',
    '<script lang="ts">declare const document: any; document.write("Foreign UI")</script>',
    '<script>const identity = (document) => document; document.write("Foreign UI")</script>',
    '<script>new Function("document.write(\\"Foreign UI\\")")()</script>',
    '<script>const Execute = Function; new Execute("document.write(\\"Foreign UI\\")")()</script>',
    '<script>const observer = new MutationObserver(() => {});</script>',
    '<script>import { NodeRenderer } from "./adapter-catalog.ts";</script><NodeRenderer {node} onevent={() => document.write("Foreign UI")}/>',
  ]) assert.throws(() => assertClosedVisualBoundaries([{ path, source }]), /CLOSED_VISUAL_BOUNDARY: .*adapter runtime global:/, source);
  assert.doesNotThrow(() => assertClosedVisualBoundaries([{ path, source:
    '<script lang="ts">import { ContentFlow } from "./adapter-catalog.ts"; let target: HTMLElement | null = null; const semantic = { document: "Notes" };</script>'
      + '<ContentFlow {resolved} {onevent} {onalbum}/>',
  }]), "type-only DOM references and semantic object keys do not execute browser code");
  assert.doesNotThrow(() => assertClosedVisualBoundaries([{ path, source:
    '<script>import { NodeRenderer } from "./adapter-catalog.ts"; const read = (document) => document.title;</script>'
      + '<NodeRenderer {node} onevent={(event) => read(event)}/>',
  }]), "local data bindings are not browser globals, including template callback parameters");
});

test("a returned catalog focus target cannot become a native mutation channel", () => {
  const path = "src/svelte/catalog/renderer/inspection-content/InspectionContent.svelte";
  const fixture = (operation: string) => `<script lang="ts">
    import { Inspection } from "../adapter-catalog.ts";
    let { catalog } = $props();
    let content = $state<{ revealEntry: (id: string) => Promise<HTMLElement | null> }>();
    export async function revealEntry(id: string) {
      const target = await content?.revealEntry(id);
      if (target) { ${operation} }
      return target ?? null;
    }
  </script><Inspection {catalog} bind:this={content}/>`;
  assert.doesNotThrow(() => assertClosedVisualBoundaries([{ path, source: fixture("") }]));
  for (const operation of [
    'target.before("Injected");', 'target.after("Injected");', 'target.append("Injected");', 'target.prepend("Injected");',
    'target.insertAdjacentText("beforeend", "Injected");', 'target.textContent = "Injected";', 'target.innerText = "Injected";',
    'target.replaceWith("Injected");', 'target.remove();', 'target.insertBefore(target, null);',
    'target.replaceChild(target, target);', 'target.removeChild(target);', 'target["before"]("Injected");',
    'target["textContent"] = "Injected";',
  ]) assert.throws(() => assertClosedVisualBoundaries([{ path, source: fixture(operation) }]), /RENDERER_DOM_ACCESS/, operation);
});

test("declared closed families and every current Svelte consumer pass the non-baseline boundary", async () => {
  const { readVisualBoundarySources } = await import("../src/authoring/visual-boundary/source.ts");
  const root = resolve(import.meta.dirname, "..");
  const sources = await readVisualBoundarySources(root);
  assert.ok(closedComponents.has(heading));
  assert.doesNotThrow(() => assertClosedVisualBoundaries(sources));
});
