import type { Locator } from "playwright";
import { svelteBrowser } from "./svelte-browser.ts";
import { rendererCss } from "./renderer-css.ts";

const source = `<script lang="ts">
  import SurfaceFrame from "@desert/svelte/SurfaceFrame.svelte";
  import { surfaceFrame, SurfaceFrameVersion } from "@desert/interaction/surface-frame.ts";
  import { toolbarAction } from "@desert/interaction/toolbar.ts";
  let actions = $state<string[]>([]);
  const frames = ["Reading pane", "Other pane"].map(title => surfaceFrame({
    version: SurfaceFrameVersion, kind: "specimen",
    top: { title, subtitle: "Shared toolbar identity",
      leading: toolbarAction({ kind: "close" }, "Close pane", "close"),
      trailing: [toolbarAction({ kind: "journey", journey: "utility" }, "Utility", "open"),
        toolbarAction({ kind: "journey", journey: "unavailable" }, "Unavailable utility", "open", false)] },
    content: { kind: "information", items: Array.from({ length: 60 }, (_, index) =>
      ({ kind: "text", text: "Reading line " + index + ". The toolbar owns only its associated viewport." })) },
    bottom: { primary: toolbarAction({ kind: "accept" }, "Confirm", "confirm") },
  }));
</script>
<div style="display:flex;gap:20px;width:1240px">
  {#each frames as frame, index}
    <div data-test-pane={index} style="display:flex;flex-direction:column;min-width:0;width:610px;height:380px">
      <SurfaceFrame {frame} invoke={intent => { actions = [...actions, JSON.stringify(intent)]; }} />
    </div>
  {/each}
</div>
<output aria-label="Invoked actions">{actions.join("|")}</output>`;

type ObservedViewport = HTMLElement & { testScrollCalls: unknown[][] };

export async function toolbarScrollFixture(reducedMotion: "reduce" | "no-preference" = "no-preference") {
  const f = await svelteBrowser(source);
  await f.page.emulateMedia({ reducedMotion });
  await f.page.setViewportSize({ width: 1280, height: 900 });
  await f.page.addStyleTag({ content: await rendererCss() });
  const pane = f.page.locator('[data-test-pane="0"]');
  const viewport = pane.locator('[data-surface-slot="content"]');
  const otherViewport = f.page.locator('[data-test-pane="1"] [data-surface-slot="content"]');
  for (const target of [viewport, otherViewport]) {
    await target.evaluate(element => {
      const viewport = element as ObservedViewport, original = viewport.scrollTo;
      viewport.testScrollCalls = [];
      Object.defineProperty(viewport, "scrollTo", { configurable: true, value: (...args: unknown[]) => {
        viewport.testScrollCalls.push(args);
        return Reflect.apply(original, viewport, args);
      } });
    });
  }
  return { ...f, pane, viewport, otherViewport, toolbar: pane.locator('[data-toolbar="top"]'),
    scrollCalls: (target = viewport) => target.evaluate(element => (element as ObservedViewport).testScrollCalls),
  };
}

export async function scrollDown(viewport: Locator, top = 600) {
  await viewport.evaluate((element, top) => { element.scrollTop = top; }, top);
  await viewport.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

export async function clickFreeToolbarRegion(toolbar: Locator) {
  await toolbar.click({ position: { x: 2, y: 2 } });
}
