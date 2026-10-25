// Action's closed contract (design §3.1): its props, events and marks, its declared variants and their specimens, the
// only legal props form, the vendor button it owns trimmed to what callers still use, and the disclosure's aria in a
// real browser. Raises nothing: a regression fails these assertions by name.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readContract } from "../src/authoring/catalog/read-contract.ts";
import { DesertLayout } from "../src/authoring/catalog/layout.ts";
import { ruleE } from "../src/authoring/catalog/gate/presentation.ts";
import { ruleF } from "../src/authoring/catalog/gate/owner-imports.ts";
import { ruleJ } from "../src/authoring/catalog/gate/specimens.ts";
import { formatViolation } from "../src/authoring/catalog/gate/violation.ts";
import { realContext } from "./support/real-tree.ts";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";

const root = resolve(import.meta.dirname, "..");
const folder = "src/svelte/catalog/foundations/action";
const read = (path: string) => readFile(resolve(root, path), "utf8");

test("action: the contract is closed with exactly the props, event and marks of design §3.1", async () => {
  const contract = readContract(`${folder}/action.contract.ts`, await read(`${folder}/action.contract.ts`), DesertLayout);
  assert.equal(contract.closed, true);
  if (!contract.closed) return;
  assert.deepEqual(Object.keys(contract.props), ["label", "icon", "state", "emphasis", "face", "type", "reason", "form", "disclosure", "current", "bar"]);
  assert.deepEqual(Object.entries(contract.props).filter(([, item]) => item.optional).map(([name]) => name), ["reason", "form", "disclosure", "current", "bar"]);
  // A bar's Action takes the bar's target through this typed placement, never through the bar's stylesheet.
  assert.deepEqual(contract.props.bar?.schema, { kind: "union", members: [{ kind: "literal", value: "command" }, { kind: "literal", value: "commit" },
    { kind: "literal", value: "step" }] });
  assert.deepEqual(contract.props.disclosure?.schema, { kind: "reference", name: "DisclosureSchema", from: "../../../infra/disclosure.ts" });
  assert.deepEqual(contract.props.icon?.schema, { kind: "reference", name: "ActionIconSchema", from: "../../../../interaction/action-icon.ts" });
  assert.deepEqual(Object.keys(contract.events), ["click"]);
  assert.deepEqual(contract.marks, ["data-action", "data-action-face", "data-emphasis"]);
});

test("action: states × emphasis × face are declared and every combination has one specimen", () => {
  const context = realContext();
  const action = context.declarations.find(item => item.declaration.id === "action")?.declaration;
  assert.ok(action?.kind === "foundation");
  assert.deepEqual(action.states, ["ready", "unavailable", "pending"]);
  assert.deepEqual(action.variants, { emphasis: ["primary", "secondary", "destructive"], face: ["fit", "icon", "text"] });
  assert.deepEqual(ruleJ(context).filter(item => item.path.startsWith(`${folder}/`)).map(formatViolation), []);
});

test("action: the entry takes CatalogProps<\"action\"> only and its callers pass only declared props", () => {
  const context = realContext();
  assert.deepEqual(ruleF(context).filter(item => item.path.startsWith(`${folder}/`)).map(formatViolation), []);
  const escapes = ruleE(context).map(formatViolation).filter(line => /<(Action|Renderer)> passes .*(contract of action|contract: action)/.test(line));
  assert.deepEqual(escapes, []);
});

test("action: the vendor button keeps the variants and sizes some caller uses, and none that nothing uses", async () => {
  const source = await read("src/svelte/vendor/components/ui/button/button.svelte");
  const block = (name: string) => source.match(new RegExp(`${name}: \\{([^}]*)\\}`))?.[1] ?? "";
  const keys = (text: string) => [...text.matchAll(/(?:^|[\s,])"?([a-z-]+)"?:/g)].map(match => match[1]);
  assert.deepEqual(keys(block("variant")), ["default", "outline", "secondary", "ghost", "grip", "destructive", "row", "field", "well"]);
  assert.deepEqual(keys(block("size")), ["default", "xs", "sm", "icon", "icon-xs", "icon-sm", "icon-lg", "row", "field", "well", "avatar", "label-remove"]);
});

const source = `<script lang="ts">
  import { Action } from "@desert/svelte/catalog/index.ts";
  let open = $state(false), presses = $state(0);
</script>
<Action label="More actions" icon="more" state="ready" emphasis="secondary" face="icon" type="button"
  disclosure={{ id: "more-trigger", controls: "more-menu", expanded: open, haspopup: "menu" }} onclick={() => { open = !open; presses += 1; }} />
<Action label="Plain" icon="save" state="ready" emphasis="primary" face="fit" type="button" />
<div style="width:4rem"><Action label="A long text label that never fits" icon="open" state="ready" emphasis="secondary" face="text" type="button" /></div>
<Action label="Waiting" icon="save" state="pending" emphasis="destructive" face="text" type="button" onclick={() => presses += 100} />
<output data-presses>{presses}</output>`;

test("action: a disclosure is pure data on the native button: id, haspopup, expanded, data-state, and controls only while open",
  { timeout: 30000 }, async () => {
  const f = await svelteBrowser(source);
  try {
    const trigger = f.page.getByRole("button", { name: "More actions", exact: true });
    assert.equal(await trigger.getAttribute("id"), "more-trigger");
    assert.equal(await trigger.getAttribute("aria-haspopup"), "menu");
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
    assert.equal(await trigger.getAttribute("data-state"), "closed");
    assert.equal(await trigger.getAttribute("aria-controls"), null);
    assert.equal(await trigger.getAttribute("data-action-face"), "icon");
    await trigger.press("Enter");
    assert.equal(await trigger.getAttribute("aria-expanded"), "true");
    assert.equal(await trigger.getAttribute("data-state"), "open");
    assert.equal(await trigger.getAttribute("aria-controls"), "more-menu");
    await trigger.click();
    assert.equal(await trigger.getAttribute("aria-controls"), null);
    assert.equal(await f.page.locator("[data-presses]").textContent(), "2");
    const plain = f.page.getByRole("button", { name: "Plain", exact: true });
    for (const name of ["id", "aria-haspopup", "aria-expanded", "aria-controls", "data-state"]) assert.equal(await plain.getAttribute(name), null, name);
    assert.equal(await plain.getAttribute("data-action"), "");
    assert.equal(await plain.getAttribute("data-emphasis"), "primary");
    const text = f.page.getByRole("button", { name: "A long text label that never fits", exact: true });
    assert.equal(await text.getAttribute("data-action-face"), "label", "the text face never collapses to its icon");
    const waiting = f.page.getByRole("button", { name: "Waiting", exact: true });
    assert.equal(await waiting.getAttribute("data-action-face"), "pending");
    assert.equal(await waiting.getAttribute("data-emphasis"), "destructive");
    await waiting.dispatchEvent("click");
    assert.equal(await f.page.locator("[data-presses]").textContent(), "2", "a pending action never runs its command");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
