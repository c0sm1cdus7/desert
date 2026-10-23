import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

// Both fill AND border belong to the face, even before an image loads.
// Muted is a color hierarchy, not permission to erase the containing shape.
test("all shared faces retain their own fill and unblended border", { timeout: 60000 }, async () => {
  const f = await svelteBrowser(`<script lang="ts">
    import * as Avatar from "@desert/svelte/vendor/components/ui/avatar/index.js";
    import Face from "@desert/svelte/catalog/foundations/face/Face.svelte";
    const image = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Ccircle cx="20" cy="20" r="10" fill="%23888"/%3E%3C/svg%3E';
  </script><main style="padding:24px">
    <h1>Shared faces</h1>
    <section style="display:flex;gap:24px;flex-wrap:wrap;padding:24px;background:var(--card)">
      {#each ['person','object'] as shape}
        <Avatar.Root {shape} size="lg" aria-label={shape + ' initials'}><Avatar.Fallback initials="SL"/></Avatar.Root>
        <Avatar.Root {shape} size="lg" aria-label={shape + ' image'}><Avatar.Image src={image} alt=""/><Avatar.Fallback initials="AR"/></Avatar.Root>
      {/each}
      <Face face={{kind:'document'}}/>
      <Face face={{kind:'status',severity:'warning'}}/>
      <Face face={{kind:'status',severity:'error'}}/>
    </section>
  </main>`);
  const directory = new URL(`../artifacts/face-material/${process.env.FACE_EVIDENCE ?? "current"}/`, import.meta.url);
  const failures: string[] = [];
  try {
    await mkdir(directory, { recursive: true });
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.setViewportSize({ width: 640, height: 240 });
    await f.page.locator("img").first().waitFor();
    for (const colorScheme of ["light", "dark"] as const) for (const contrast of ["no-preference", "more"] as const) {
      await f.page.emulateMedia({ colorScheme, contrast, reducedMotion: "reduce" });
      const faces = await f.page.locator('[data-slot="avatar"]').evaluateAll(elements => elements.map(element => {
        const style = getComputedStyle(element), border = getComputedStyle(element, "::after");
        const child = element.firstElementChild!;
        return { shape: element.getAttribute("data-shape"), tone: element.getAttribute("data-tone"),
          fill: style.backgroundColor, parentFill: getComputedStyle(element.parentElement!).backgroundColor,
          border: border.borderTopColor, width: border.borderTopWidth, kind: border.borderTopStyle,
          blend: border.mixBlendMode, content: border.content, pointer: border.pointerEvents,
          radius: style.borderRadius, childRadius: getComputedStyle(child).borderRadius };
      }));
      for (const [i, face] of faces.entries()) {
        const prefix = `${colorScheme}/${contrast}/${i}`;
        if (face.fill === "rgba(0, 0, 0, 0)" || face.fill === "transparent" || face.fill === face.parentFill)
          failures.push(`${prefix}: own visible background required`);
        if (parseFloat(face.width) < 1 || face.kind !== "solid" || face.blend !== "normal" || face.content === "none")
          failures.push(`${prefix}: visible unblended border required`);
        if (face.pointer !== "none") failures.push(`${prefix}: decoration must not intercept input`);
        if (face.radius !== face.childRadius) failures.push(`${prefix}: image/fallback must preserve face shape`);
      }
      await writeFile(new URL(`${colorScheme}-${contrast}.json`, directory), JSON.stringify({ faces, failures }, null, 2));
      await f.page.screenshot({ path: new URL(`${colorScheme}-${contrast}.png`, directory).pathname });
    }
    assert.equal(await f.page.locator('[data-slot="avatar"]').count(), 7);
    assert.deepEqual(f.errors, []);
    assert.deepEqual(failures, []);
  } finally { await f.close(); }
});
