import assert from "node:assert/strict";
import test from "node:test";
import AxeBuilder from "@axe-core/playwright";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

test("compact message presentation cannot hide navigation on a task frame", async () => {
  const source = `<script lang="ts">
    import SurfaceFrame from "@desert/svelte/catalog/compositions/surface-frame/SurfaceFrame.svelte";
    const frame = {version:"desert.surface-frame/6",kind:"journey",top:{title:"Review"},
      content:{kind:"message",text:"A task, not an alert"},bottom:{}};
  </script><SurfaceFrame {frame} presentation="message" invoke={()=>{}} />`;
  const f = await svelteBrowser(source);
  try {
    assert.ok(f.errors.some(error => error.includes("INVALID_MESSAGE_PRESENTATION")));
    assert.equal(await f.page.locator('[data-surface-frame]').count(), 0);
  } finally { await f.close(); }
});

test("visible shadcn message identity labels its dialog in both actual theme palettes", async () => {
  const f = await svelteBrowser(`<script lang="ts">
    import ProblemNode from "@desert/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte";
    let open = $state(false);
  </script><button onclick={()=>open=true}>Open warning</button>
    <ProblemNode node={{ version: "desert.bank-node/1", kind: "problem", open, title: "Connection interrupted", locked: false,
      description: "Your writing remains available. Try again when the connection returns.", severity: "warning" }}
      onevent={event => { if (event.kind === "problem.close") open = false; }} />`);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    const palettes: string[] = [];
    for (const colorScheme of ["light", "dark"] as const) {
      await f.page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await f.page.getByRole("button", { name: "Open warning", exact: true }).click();
      const dialog = f.page.getByRole("dialog", { name: "Connection interrupted", exact: true });
      await dialog.waitFor();
      const identity = await dialog.evaluate(node => {
        const title = document.getElementById(node.getAttribute("aria-labelledby")!);
        const body = document.getElementById(node.getAttribute("aria-describedby")!);
        // The visible heading and sentence are the dialog's only name and description: no hidden duplicate title or
        // description stands beside them.
        const visible = (element: Element) => !element.classList.contains("sr-only") && element.getBoundingClientRect().height > 2;
        const named = [...node.querySelectorAll("h1,h2,h3,[data-slot='dialog-title']")].filter(element => element.textContent === title?.textContent);
        const described = [...node.querySelectorAll("p,[data-slot='dialog-description']")].filter(element => element.textContent === body?.textContent);
        return { title: title?.textContent, body: body?.textContent,
          titleVisible: !!title && visible(title), bodyVisible: !!body && visible(body),
          titleCount: named.length, bodyCount: described.length,
          palette: getComputedStyle(node).color };
      });
      assert.equal(identity.title, "Connection interrupted");
      assert.equal(identity.body, "Your writing remains available. Try again when the connection returns.");
      assert.ok(identity.titleVisible && identity.bodyVisible);
      assert.equal(identity.titleCount, 1); assert.equal(identity.bodyCount, 1);
      assert.equal(await dialog.getByRole("button", { name: "Close", exact: true }).count(), 1);
      palettes.push(identity.palette);
      const scan = await new AxeBuilder({ page: f.page }).include('[data-modal="message"]').analyze();
      assert.deepEqual(scan.violations.filter(item => item.impact === "serious" || item.impact === "critical"), []);
      await f.page.keyboard.press("Escape"); await dialog.waitFor({ state: "hidden" });
    }
    assert.notEqual(palettes[0], palettes[1], "these are real light/dark palettes, not media preferences on a forced-dark profile");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
