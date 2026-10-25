// Dialog (DESIGN §3.2): a centred message whose visible title names it and whose visible subtitle describes it, over its
// text choices. A choice raises its intent, Escape and the scrim raise dismissal unless it is locked, and a long message
// scrolls while its choices stay in view.
import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { confirmationDialog, confirmationDismissal, type ConfirmationFrame } from "../src/svelte/infra/confirmation-dialog.ts";
import { surfaceFrame } from "../src/interaction/surface-frame.ts";

const source = (subtitle: string) => `<script lang="ts">
  import Dialog from "@desert/svelte/catalog/compositions/dialog/Dialog.svelte";
  let open = $state(false), locked = $state(false), events = $state<string[]>([]);
  Reflect.set(window, "events", () => events);
  const note = (value: string) => { events = [...events, value]; };
</script>
<button onclick={() => { open = true; locked = false; }}>Ask</button>
<button onclick={() => { open = true; locked = true; }}>Ask locked</button>
<Dialog {open} {locked} tone="destructive" face={{ kind: "status", severity: "warning" }} title="Move note to Trash?"
  subtitle={${JSON.stringify(subtitle)}}
  secondary={{ label: "Cancel", icon: "back", state: locked ? "unavailable" : "ready", intent: { kind: "back" } }}
  primary={{ label: "Move to Trash", icon: "archive", state: locked ? "pending" : "ready", intent: { kind: "accept" } }}
  oninvoke={intent => { note(intent.kind); open = false; }} ondismiss={() => { note("dismiss"); open = false; }} onclosed={() => note("closed")} />`;

async function fixture(subtitle = "You can restore the note from Trash.") {
  const f = await svelteBrowser(source(subtitle));
  await f.page.addStyleTag({ content: await rendererCss() });
  await f.page.emulateMedia({ reducedMotion: "reduce" });
  return f;
}
const events = (f: Awaited<ReturnType<typeof fixture>>) => f.page.evaluate(() => [...Reflect.get(window, "events")()]);

test("the visible title names the dialog and the visible subtitle describes it; the face is decorative", { timeout: 30000 }, async () => {
  const f = await fixture();
  try {
    await f.page.getByRole("button", { name: "Ask", exact: true }).click();
    const dialog = f.page.getByRole("dialog", { name: "Move note to Trash?", exact: true });
    await dialog.waitFor();
    const identity = await dialog.evaluate(node => {
      const title = document.getElementById(node.getAttribute("aria-labelledby")!)!;
      const body = document.getElementById(node.getAttribute("aria-describedby")!)!;
      return { title: title.tagName, titleText: title.textContent, body: body.textContent, titleHeight: title.getBoundingClientRect().height,
        bodyHeight: body.getBoundingClientRect().height, hidden: node.querySelectorAll(".sr-only").length,
        face: node.querySelector('[data-piece="face"]')?.getAttribute("aria-hidden"), tone: node.querySelector('[data-piece="face"]')?.getAttribute("data-tone") };
    });
    assert.deepEqual(identity, { title: "H2", titleText: "Move note to Trash?", body: "You can restore the note from Trash.",
      titleHeight: identity.titleHeight, bodyHeight: identity.bodyHeight, hidden: 0, face: "true", tone: "warning" });
    assert.ok(identity.titleHeight > 2 && identity.bodyHeight > 2, "name and description are the visible title and subtitle");
    assert.deepEqual((await dialog.getByRole("button").allTextContents()).map(label => label.trim()), ["Cancel", "Move to Trash"]);
    assert.equal(await dialog.getByRole("button", { name: "Move to Trash" }).getAttribute("data-emphasis"), "destructive");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a choice raises its intent, Escape raises dismissal, and focus returns to the opener once it has closed", { timeout: 30000 }, async () => {
  const f = await fixture();
  try {
    const opener = f.page.getByRole("button", { name: "Ask", exact: true });
    await opener.click();
    const dialog = f.page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Move to Trash", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    await opener.click();
    await dialog.waitFor();
    await f.page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await f.page.waitForFunction(() => document.activeElement?.textContent === "Ask");
    assert.deepEqual(await events(f), ["accept", "closed", "dismiss", "closed"]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a locked dialog cannot be dismissed and keeps focus inside it", { timeout: 30000 }, async () => {
  const f = await fixture();
  try {
    await f.page.getByRole("button", { name: "Ask locked", exact: true }).click();
    const dialog = f.page.getByRole("dialog");
    await dialog.waitFor();
    assert.equal(await dialog.getByRole("button", { name: "Cancel", exact: true }).isDisabled(), true);
    await f.page.keyboard.press("Escape");
    await f.page.mouse.click(4, 4);
    assert.equal(await dialog.isVisible(), true);
    await f.page.keyboard.press("Tab");
    assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true);
    assert.deepEqual(await events(f), []);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a long message scrolls while its choices stay in view, at 320px and 200% text", { timeout: 30000 }, async () => {
  const f = await fixture("Current writing remains available. ".repeat(40).trim());
  try {
    await f.page.setViewportSize({ width: 320, height: 568 });
    await f.page.evaluate(() => document.documentElement.style.setProperty("--text-scale", "2"));
    await f.page.getByRole("button", { name: "Ask", exact: true }).click();
    const dialog = f.page.getByRole("dialog");
    await dialog.waitFor();
    const layout = await dialog.evaluate(node => {
      const box = (element: Element) => element.getBoundingClientRect();
      const content = node.querySelector<HTMLElement>("[data-modal-message-content]")!, actions = node.querySelector("[data-modal-message-actions]")!;
      return { scrolls: content.scrollHeight > content.clientHeight, contentBottom: box(content).bottom, actionsTop: box(actions).top,
        actionsBottom: box(actions).bottom, dialogBottom: box(node).bottom, viewport: innerHeight, overflow: node.scrollWidth - node.clientWidth };
    });
    assert.equal(layout.scrolls, true, "the long sentence scrolls inside the message");
    assert.ok(layout.contentBottom <= layout.actionsTop + 1, "the content never overlays the choices");
    assert.ok(layout.actionsBottom <= layout.dialogBottom + 1 && layout.dialogBottom <= layout.viewport, "the choices stay on screen");
    assert.ok(layout.overflow <= 1, "no horizontal overflow");
    const cancel = dialog.getByRole("button", { name: "Cancel", exact: true });
    assert.equal(await cancel.evaluate(node => {
      const box = node.getBoundingClientRect(), hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return hit === node || node.contains(hit);
    }), true, "Cancel is reachable without scrolling");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a confirmation frame asks with its title, message and choices; dismissing it chooses the ready secondary", () => {
  const frame = surfaceFrame({ version: "desert.surface-frame/6", kind: "confirmation", top: { title: "Move note to Trash?" },
    content: { kind: "message", text: "You can restore the note from Trash." },
    bottom: { secondary: { label: "Cancel", icon: "back", state: "ready", intent: { kind: "back" } },
      primary: { label: "Move to Trash", icon: "archive", state: "ready", intent: { kind: "accept" } } } });
  assert.equal(frame.kind, "confirmation");
  if (frame.kind !== "confirmation") return;
  const confirmation: ConfirmationFrame = frame;
  assert.deepEqual(confirmationDialog(confirmation), { title: "Move note to Trash?", subtitle: "You can restore the note from Trash.",
    face: undefined, primary: frame.bottom.primary, secondary: frame.bottom.secondary });
  assert.deepEqual(confirmationDismissal(confirmation), { kind: "back" });
  const unavailable = surfaceFrame({ ...frame, bottom: { ...frame.bottom, secondary: { ...frame.bottom.secondary!, state: "unavailable" } } });
  if (unavailable.kind !== "confirmation") return;
  assert.equal(confirmationDismissal(unavailable), undefined);
});
