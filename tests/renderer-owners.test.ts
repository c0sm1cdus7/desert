import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

// A node kind renders through the piece that draws it: a problem node through Dialog (the problem-node variant its contract
// declares), a transient node through ViewPanel (Modal over the frame). The problem composition and the drawer foundation
// existed only for the renderer table and are gone (slice 3, Batch 3 close-out).
test("the renderer table names the pieces that draw a problem and a transient; their adapters are gone", () => {
  const manifest = JSON.parse(readFileSync("src/svelte/catalog/manifest.json", "utf8")) as { pieces: Record<string, { renders?: string[] }> };
  assert.deepEqual(manifest.pieces.dialog?.renders, ["problem"]);
  assert.deepEqual(manifest.pieces["view-panel"]?.renders, ["transient"]);
  assert.equal(manifest.pieces.problem, undefined);
  assert.equal(manifest.pieces.drawer, undefined);
  for (const folder of ["src/svelte/catalog/compositions/problem", "src/svelte/catalog/foundations/drawer"]) assert.equal(existsSync(folder), false, folder);
  const table = readFileSync("src/svelte/renderer-registry.ts", "utf8");
  assert.match(table, /^ {2}problem: Dialog,$/m);
  assert.match(table, /^ {2}transient: ViewPanel,$/m);
  const messages = JSON.parse(readFileSync("src/messages/en.json", "utf8")) as Record<string, unknown>;
  assert.equal(messages.problem, undefined, "the deleted composition's namespace is gone");
});

const page = (problemLocked: boolean, transientLocked: boolean) => `<script lang="ts">
  import NodeRenderer from "@desert/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte";
  import { surfaceFrame } from "@desert/interaction/surface-frame.ts";
  import { toolbarAction } from "@desert/interaction/toolbar.ts";
  let problem = $state(false), transient = $state(false), events = $state<string[]>([]);
  const note = (event: { kind: string; intent?: { kind: string } }) => {
    events = [...events, event.intent ? event.kind + ":" + event.intent.kind : event.kind];
    if (event.kind === "problem.close") problem = false;
    if (event.kind === "transient.close") transient = false;
  };
  const frame = surfaceFrame({ version: "desert.surface-frame/6", kind: "specimen", top: { title: "Context" },
    content: { kind: "information", items: [{ kind: "text", text: "Keep the source context visible." }] },
    bottom: { primary: toolbarAction({ kind: "journey", journey: "save" }, "Save", "save") } });
</script>
<button onclick={() => problem = true}>Open problem</button><button onclick={() => transient = true}>Open transient</button>
<output data-events>{JSON.stringify(events)}</output>
<NodeRenderer node={{ version: "desert.bank-node/1", kind: "problem", open: problem, title: "Changes were not saved",
  description: "The connection closed before the note was stored.", locked: ${problemLocked}, severity: "warning" }} onevent={note} />
<NodeRenderer node={{ version: "desert.bank-node/1", kind: "transient", label: "Context", open: transient, locked: ${transientLocked}, frame }}
  onevent={note} />`;

async function fixture(problemLocked: boolean, transientLocked: boolean) {
  const f = await svelteBrowser(page(problemLocked, transientLocked));
  await f.page.addStyleTag({ content: await rendererCss() });
  await f.page.emulateMedia({ reducedMotion: "reduce" });
  return f;
}
const events = async (f: Awaited<ReturnType<typeof fixture>>) => JSON.parse(await f.page.locator("[data-events]").innerText()) as string[];

test("a problem node is Dialog: its status face, its description, and one Close the person uses", { timeout: 60000 }, async () => {
  const f = await fixture(false, false);
  try {
    await f.page.getByRole("button", { name: "Open problem", exact: true }).click();
    const dialog = f.page.getByRole("dialog", { name: "Changes were not saved", exact: true });
    await dialog.waitFor();
    assert.equal(await dialog.locator('[data-piece="face"]').getAttribute("data-tone"), "warning");
    assert.equal(await dialog.evaluate(node => document.getElementById(node.getAttribute("aria-describedby")!)?.textContent),
      "The connection closed before the note was stored.");
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.deepEqual(await events(f), ["problem.close"]);
    await f.page.getByRole("button", { name: "Open problem", exact: true }).click();
    await dialog.waitFor();
    await f.page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.deepEqual(await events(f), ["problem.close", "problem.close"], "Escape dismisses an unlocked problem");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a locked problem keeps its dialog: its Close is unavailable and Escape reports nothing", { timeout: 60000 }, async () => {
  const f = await fixture(true, false);
  try {
    await f.page.getByRole("button", { name: "Open problem", exact: true }).click();
    const dialog = f.page.getByRole("dialog", { name: "Changes were not saved", exact: true });
    await dialog.waitFor();
    const close = dialog.getByRole("button", { name: "Close", exact: true });
    assert.equal(await close.isDisabled() || await close.getAttribute("aria-disabled") === "true", true);
    await f.page.keyboard.press("Escape");
    await close.click({ force: true });
    assert.deepEqual(await events(f), []);
    assert.equal(await dialog.isVisible(), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a transient node is ViewPanel over its frame: Close reports the transient's close, a choice its intent", { timeout: 60000 }, async () => {
  const f = await fixture(false, false);
  try {
    await f.page.getByRole("button", { name: "Open transient", exact: true }).click();
    const dialog = f.page.getByRole("dialog", { name: "Context", exact: true });
    await dialog.waitFor();
    assert.equal(await dialog.locator("[data-surface-frame]").count(), 1);
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    assert.deepEqual(await events(f), ["surface.invoke:journey"]);
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.deepEqual(await events(f), ["surface.invoke:journey", "transient.close", "transient.closed"]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a locked transient is not dismissed by Escape", { timeout: 60000 }, async () => {
  const f = await fixture(false, true);
  try {
    await f.page.getByRole("button", { name: "Open transient", exact: true }).click();
    const dialog = f.page.getByRole("dialog", { name: "Context", exact: true });
    await dialog.waitFor();
    await f.page.keyboard.press("Escape");
    assert.deepEqual(await events(f), []);
    assert.equal(await dialog.isVisible(), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
