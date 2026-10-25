// The theme (DESIGN §1.0, §2): curvature, type roles, density, material, control feedback and tints are each written
// once, as tokens or `@utility` classes the owners apply, and the theme's mechanisms style no other owner's anatomy.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import postcss, { type Rule } from "postcss";
import { contentViolations, readCatalogTree } from "../src/authoring/catalog/gate/run.ts";
import { DesertLayout } from "../src/authoring/catalog/layout.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const root = resolve(import.meta.dirname, "..");
const svelte = "src/svelte", mechanisms = `${svelte}/catalog/mechanisms`, vendor = `${svelte}/vendor/components/ui`;
const read = (path: string) => readFile(resolve(root, path), "utf8");
const roles = ["type-display", "type-page", "type-section", "type-body", "type-support", "type-caption"] as const;
const witnesses = [...roles, "density-comfortable", "density-compact", "material-pane", "material-pane-primary", "material-pane-selected",
  "material-interior", "control-feedback", "control-feedback-content", "control-focus", "scheme-light", "scheme-dark",
  "tint-blue", "tint-violet", "tint-rose", "tint-green", "tint-slate", "type-title", "type-prose", "type-initials-compact"];

/** Declarations of the rule whose selector is exactly `.name`, from the compiled theme with every witness class in use. */
async function compiledUtilities(): Promise<ReadonlyMap<string, Readonly<Record<string, string>>>> {
  const css = postcss.parse(await rendererCss([`<p class="${witnesses.join(" ")}"></p>`]));
  const found = new Map<string, Record<string, string>>();
  css.walkRules((rule: Rule) => {
    if (!/^\.[a-z-]+$/.test(rule.selector)) return;
    const declarations = found.get(rule.selector.slice(1)) ?? {};
    rule.each(node => { if (node.type === "decl") declarations[node.prop] = node.value; });
    found.set(rule.selector.slice(1), declarations);
  });
  return found;
}
const utilities = compiledUtilities();
const theme = async () => (await read(`${mechanisms}/typography/typography.css`)) + (await read(`${mechanisms}/theme/tokens.css`));

test("theme: one radius family; circles only for marks, never a capsule control", async () => {
  const tokens = await read(`${mechanisms}/theme/tokens.css`);
  for (const token of ["--radius:.875rem", "--radius-group:.75rem", "--radius-surface:28px", "--radius-mark:50%"]) assert.match(tokens, new RegExp(token));
  const button = await read(`${vendor}/button/button.svelte`), group = await read(`${vendor}/input-group/input-group.svelte`);
  assert.doesNotMatch(button.split("\n").find(line => line.includes("base:")) ?? "", /rounded-full/, "the action base is a radius, not a capsule");
  assert.doesNotMatch(group, /rounded-full/, "the access well is a radius");
  for (const path of [`${svelte}/catalog/foundations/field/field.css`, `${svelte}/catalog/foundations/bar/bar.css`]) {
    assert.doesNotMatch(await read(path), /999px/, `${path}: the search well is a radius`);
  }
  assert.match(tokens, /--surface-radius:var\(--radius-surface\)/);
});

test("theme: six type roles; section takes the old title metrics; title, prose and compact initials are retired", async () => {
  const compiled = await utilities;
  for (const role of roles) assert.ok(compiled.has(role), `${role} is a utility`);
  for (const retired of ["type-title", "type-prose", "type-initials-compact"]) assert.equal(compiled.has(retired), false, `${retired} is retired`);
  assert.deepEqual(compiled.get("type-display"), { "font-size": "var(--text-display)", "line-height": "var(--text-display--line-height)",
    "font-weight": "var(--text-display--font-weight)" });
  assert.equal(compiled.get("type-support")?.["font-size"], "var(--text-control)");
  const source = await theme();
  assert.doesNotMatch(source, /--text-(?:title|prose)\b/, "retired metrics are gone");
  assert.match(source, /--text-section:1rem;/);
  assert.match(source, /--text-section--line-height:1\.375rem;/);
  assert.match(source, /--text-display--font-weight:600;/);
  assert.match(source, /--text-clock:min\(7\.6rem,22vw\);/);
  assert.doesNotMatch(await read(`${svelte}/catalog/foundations/clock/Clock.svelte`), /7\.6rem/, "the clock reads its metric from the theme");
});

test("theme: density is two utilities that restate every role metric", async () => {
  const compiled = await utilities;
  assert.equal(compiled.get("density-comfortable")?.["--text-section"], "1.25rem");
  assert.equal(compiled.get("density-compact")?.["--text-section"], "1rem");
  for (const density of ["density-comfortable", "density-compact"]) {
    for (const metric of ["--text-body", "--text-control", "--text-section", "--text-caption", "--text-page"]) {
      assert.ok(compiled.get(density)?.[metric], `${density} sets ${metric}`);
    }
  }
  const sources = await Promise.all([`${vendor}/sidebar/sidebar-provider.svelte`, `${vendor}/dialog/dialog-content.svelte`,
    `${vendor}/popover/popover-content.svelte`].map(read));
  for (const source of sources) assert.doesNotMatch(source, /data-type-density/, "owners apply the density class");
});

test("theme: material, control feedback and tints are utilities; the old marks are gone from the tree", async () => {
  const compiled = await utilities;
  assert.equal(compiled.get("material-pane")?.["background-color"], "var(--pane-fill)");
  assert.equal(compiled.get("material-pane-primary")?.["--pane-accent"], "var(--primary)");
  assert.equal(compiled.get("material-interior")?.["background-color"], "transparent");
  assert.equal(compiled.get("control-feedback-content")?.transform, "var(--control-press-transform)");
  assert.equal(compiled.get("tint-violet")?.["--ui-tint"], "var(--tint-color-violet)");
  assert.equal(compiled.get("scheme-dark")?.["color-scheme"], "dark");
  const feedback = await read(`${mechanisms}/control-feedback/control-feedback.css`);
  assert.doesNotMatch(feedback, /:is\(button|tm-control|data-button-content|data-drawer-grip/, "no element or foreign selector");
});

test("theme: the theme mechanisms judged by rule G leave only the selectors other steps move", { timeout: 180_000 }, async () => {
  const { violations } = await contentViolations(root, await readCatalogTree(root, DesertLayout), { layout: DesertLayout, rules: ["G"] });
  const of = (path: string) => violations.filter(item => item.path === path).map(item => item.what);
  for (const clean of ["theme/tokens.css", "theme/base.css", "control-feedback/control-feedback.css", "personalization/personalization.css"]) {
    assert.deepEqual(of(`${mechanisms}/${clean}`), [], clean);
  }
  // Batch 2 replaces the message-frame metrics with dialog and bar props; F1.4 moves the field rules into field.css.
  assert.ok(of(`${mechanisms}/typography/typography.css`).every(what => what.includes("data-frame-presentation")));
  assert.ok(of(`${mechanisms}/pane-material/pane-material.css`).every(what => /field|input-group|search-field|button-content|choice-row|disabled|input|textarea|\bbutton\b|\ba\b/.test(what)));
  assert.equal(of(`${mechanisms}/pane-material/pane-material.css`).some(what => /\[data-appearance-preview\]|writes --pane-color/.test(what)), false);
});
