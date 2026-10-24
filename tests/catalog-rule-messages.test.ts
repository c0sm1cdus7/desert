// Rule V (plan §14): a catalog template writes no human text; a sentence is a key of the SDK message catalog. Every
// non-whitespace text node and every literal aria-label, title, placeholder or alt under the catalog is LITERAL_TEXT.
import assert from "node:assert/strict";
import test from "node:test";
import { ruleV } from "../src/authoring/catalog/gate/messages.ts";
import { codes, composition, contextOf, foundation } from "./support/catalog-context.ts";

const field = "src/svelte/catalog/foundations/field/Field.svelte", page = "src/svelte/catalog/compositions/page/Page.svelte";
const run = (files: Record<string, string>) => codes(ruleV(contextOf(files)));

test("V control: messages, expressions, whitespace, scripts and styles carry no literal text", () => {
  const markup = `<script lang="ts">\n  const label = "not template text";\n</script>\n\n<div aria-label={m.field.clear} title={label}>\n  {m.field.clear}\n  {value}\n</div>\n<img alt={m.field.clear} src="/x.svg" />\n<input placeholder={hint} class="well" />\n<style>.well { content: "x"; }</style>\n`;
  assert.deepEqual(run(foundation("field", "Field.svelte", markup)), []);
});

test("V: a text node in a foundation and in a composition is LITERAL_TEXT, with the text it writes", () => {
  const files = { ...foundation("field", "Field.svelte", "<p>Clear</p>\n"), ...composition("page", "Page.svelte", [], "{#if x}<span> Unlock </span>{/if}\n") };
  assert.deepEqual(run(files), [
    `LITERAL_TEXT ${page} the text "Unlock" is written in the template; use a message key (m.<owner>.<meaning>)`,
    `LITERAL_TEXT ${field} the text "Clear" is written in the template; use a message key (m.<owner>.<meaning>)`,
  ]);
});

test("V: a literal aria-label, title, placeholder or alt is LITERAL_TEXT, partly literal ones included", () => {
  const markup = '<button aria-label="Close"></button>\n<abbr title="Note"></abbr>\n<input placeholder="Search" />\n<img alt="Avatar" />\n<span aria-label="Clear {label}"></span>\n<span title={"Literal"}></span>\n';
  const what = (attribute: string, value: string) =>
    `LITERAL_TEXT ${field} ${attribute}="${value}" is written in the template; use a message key (m.<owner>.<meaning>)`;
  assert.deepEqual(run(foundation("field", "Field.svelte", markup)), [
    what("aria-label", "Close"), what("title", "Note"), what("placeholder", "Search"), what("alt", "Avatar"),
    what("aria-label", "Clear "), what("title", "Literal")]);
});

test("V: a string literal written as an expression tag is literal text too", () => {
  assert.deepEqual(run(foundation("field", "Field.svelte", '<p>{"Clear"}</p>\n')),
    [`LITERAL_TEXT ${field} the text "Clear" is written in the template; use a message key (m.<owner>.<meaning>)`]);
});

test("V judges the catalog only: the build template and the vendor families are other rules' business", () => {
  const files = { "src/build/svelte/template/src/routes/+page.svelte": "<p>Loading</p>\n",
    "src/svelte/vendor/components/ui/button/button.svelte": "<span>Vendor</span>\n" };
  assert.deepEqual(run(files), []);
});
