// Rule L2: an approved piece is the bytes the owner saw, and nothing unapproved is mounted by what the product exposes.
import assert from "node:assert/strict";
import test from "node:test";
import { ruleL2 } from "../src/authoring/catalog/gate/approvals.ts";
import { contractDigest, digestOf, sourceDigest, sourceFiles } from "../src/authoring/catalog/digest.ts";
import type { CatalogLayout } from "../src/authoring/catalog/layout.ts";
import { codes, composition, contextOf, foundation } from "./support/catalog-context.ts";
import { testLayout } from "./support/catalog-layout.ts";

const root = "src/svelte/catalog";
const fieldCss = `${root}/foundations/field/field.css`, vendorInput = "src/svelte/vendor/components/ui/input/input.svelte";
const fieldContract = `${root}/foundations/field/field.contract.ts`, tokens = `${root}/mechanisms/theme/tokens.css`;
const paneCss = `${root}/mechanisms/pane-material/pane.css`;
const layout = testLayout({ fixed: { theme: ["src/svelte/theme.css"] } });

const fieldFoundation = foundation("field", "Field.svelte", '<script lang="ts">import Input from "../../../vendor/components/ui/input/input.svelte";</script><Input />',
  ', parts: ["field.css"], vendor: ["input"], mechanisms: ["pane-material"]');
const baseTree: Readonly<Record<string, string>> = {
  ...fieldFoundation,
  [fieldCss]: ".field { padding: 1rem; }\n",
  [vendorInput]: "<input />\n",
  ...foundation("meter-bar", "MeterBar.svelte", "<span></span>"),
  [`${root}/mechanisms/theme/theme.mechanism.ts`]: 'export const T = defineMechanism({ id: "theme", owner: "theme", files: ["tokens.css"] } as const);\n',
  [tokens]: ":root { --radius-well: 1rem; }\n",
  [`${root}/mechanisms/pane-material/pane-material.mechanism.ts`]:
    'export const P = defineMechanism({ id: "pane-material", owner: "theme", files: ["pane.css"] } as const);\n',
  [paneCss]: ".pane { background: var(--pane); }\n",
  "src/svelte/theme.css": '@import "./catalog/mechanisms/theme/tokens.css";\n',
  [`${root}/index.ts`]: 'export { default as Field } from "./foundations/field/Field.svelte";\nexport { default as MeterBar } from "./foundations/meter-bar/MeterBar.svelte";\n',
  ...composition("form", "Form.svelte", ["field"], '<script lang="ts">import { Field } from "../../index.ts";</script><Field />'),
};

type Entry = Readonly<Record<string, unknown>>;
const bytesOf = (files: Readonly<Record<string, string>>) => (path: string) => {
  const text = files[path];
  return text === undefined ? undefined : Buffer.from(text, "utf8");
};
/** A ledger entry stamped exactly as the approve command stamps it, from the given tree. */
function approved(files: Readonly<Record<string, string>>, id: string, specimens?: Readonly<Record<string, string>>, at: CatalogLayout = layout): Entry {
  const tree = contextOf(files, at), read = bytesOf(files);
  return { status: "approved", sourceDigest: sourceDigest(tree, id, read), contractDigest: contractDigest(tree, id, read),
    approvedOn: "2026-10-23", approvedBy: "owner", ...specimens ? { specimens } : {} };
}
const ledger = (pieces: Readonly<Record<string, Entry>>) => ({ version: "desert.catalog-approvals/1", pieces });
const implemented = { status: "implemented" } as const;
const run = (files: Readonly<Record<string, string>>, pieces: Readonly<Record<string, Entry>>, at: CatalogLayout = layout) =>
  codes(ruleL2(contextOf(files, at, ledger(pieces))));
const allApproved = (files: Readonly<Record<string, string>>) => ({
  field: approved(files, "field"), "meter-bar": approved(files, "meter-bar"), theme: approved(files, "theme"), form: approved(files, "form") });

test("digests: paths are part of the digest, and an absent file differs from an empty one", () => {
  const read = bytesOf({ "a/x.css": "x", "a/y.css": "x", "a/empty.css": "" });
  assert.notEqual(digestOf(["a/x.css"], read), digestOf(["a/y.css"], read));
  assert.notEqual(digestOf(["a/empty.css"], read), digestOf(["a/missing.css"], read));
  assert.equal(digestOf(["a/x.css", "a/y.css"], read), digestOf(["a/y.css", "a/x.css", "a/x.css"], read));
  assert.match(digestOf([], read), /^[a-f0-9]{64}$/);
});

test("digests: a foundation's source is its entry, parts, vendor family, mechanisms and the theme", () => {
  assert.deepEqual(sourceFiles(contextOf(baseTree, layout), "field"), [
    `${root}/foundations/field/Field.svelte`, fieldCss, paneCss, tokens, "src/svelte/theme.css", vendorInput].sort());
  assert.deepEqual(sourceFiles(contextOf(baseTree, layout), "theme"), [tokens, "src/svelte/theme.css"].sort());
});

test("digests: a mechanism a foundation owns belongs to that foundation's source", () => {
  const files = { ...baseTree, [`${root}/mechanisms/field-motion/field-motion.mechanism.ts`]:
    'export const M = defineMechanism({ id: "field-motion", owner: "field", files: ["motion.css"] } as const);\n',
  [`${root}/mechanisms/field-motion/motion.css`]: ".x{}\n" };
  assert.ok(sourceFiles(contextOf(files, layout), "field").includes(`${root}/mechanisms/field-motion/motion.css`));
});

test("L2 control: approved pieces whose bytes are unchanged, mounted by an approved composition, pass", () => {
  assert.deepEqual(run(baseTree, allApproved(baseTree)), []);
});

test("L2 control: nothing approved and no dispatcher or authorable composition reports nothing", () => {
  assert.deepEqual(run(baseTree, { field: implemented, "meter-bar": implemented, theme: implemented, form: implemented }), []);
});

test("L2 control: a structurally invalid ledger is the structural half's finding, not this rule's", () => {
  assert.deepEqual(codes(ruleL2(contextOf(baseTree, layout, { version: "x" }))), []);
  assert.deepEqual(codes(ruleL2(contextOf(baseTree, layout, undefined))), []);
});

const changed = (path: string, text: string, kind: "source" | "contract", id = "field") => {
  const pieces = allApproved(baseTree), files = { ...baseTree, [path]: text };
  const found = run(files, pieces).filter(item => item.startsWith("FOUNDATION_UNAPPROVED_CHANGE"));
  assert.ok(found.some(item => item.includes(`${id}: the ${kind} digest`)), found.join("\n"));
  return found;
};

test("N37 one byte of an approved foundation's stylesheet is an unapproved change", () => {
  assert.deepEqual(changed(fieldCss, ".field { padding: 2rem; }\n", "source"),
    [`FOUNDATION_UNAPPROVED_CHANGE ${root}/foundations/field/field.catalog.ts field: the source digest differs from the approved one (2026-10-23)`]);
});

test("N38 one byte of an owned vendor file is an unapproved change", () => {
  changed(vendorInput, "<input/>\n", "source");
});

test("N39 one byte of the contract is an unapproved change", () => {
  changed(fieldContract, "export const C = { } as const;\n", "contract");
});

test("a used mechanism or the theme changing invalidates the pieces that use it", () => {
  changed(paneCss, ".pane { background: red; }\n", "source");
  const viaTheme = changed(tokens, ":root { --radius-well: 2rem; }\n", "source");
  assert.ok(viaTheme.some(item => item.includes("theme: the source digest")));
  assert.ok(viaTheme.some(item => item.includes("meter-bar: the source digest")));
  assert.ok(changed("src/svelte/theme.css", "", "source", "theme").length >= 4);
  changed(`${root}/mechanisms/theme/theme.mechanism.ts`,
    'export const T = defineMechanism({ id: "theme", owner: "theme", files: ["tokens.css"] }  as const);\n', "contract", "theme");
});

test("a new specimens file, or a renamed part with the same bytes, is an unapproved change", () => {
  changed(`${root}/foundations/field/field.specimens.ts`, "", "contract");
  const renamed: Record<string, string> = { ...baseTree, [`${root}/foundations/field/field.catalog.ts`]:
    baseTree[`${root}/foundations/field/field.catalog.ts`]?.replace('"field.css"', '"field-well.css"') ?? "",
  [`${root}/foundations/field/field-well.css`]: baseTree[fieldCss] ?? "" };
  delete renamed[fieldCss];
  const found = run(renamed, allApproved(baseTree));
  assert.ok(found.some(item => item.includes("field: the source digest")), found.join("\n"));
});

test("N41 a hand-set digest is an unapproved change", () => {
  const pieces = { ...allApproved(baseTree), field: { ...approved(baseTree, "field"), sourceDigest: "0".repeat(64), contractDigest: "f".repeat(64) } };
  assert.deepEqual(run(baseTree, pieces).map(item => item.split(" ").slice(0, 7).join(" ")), [
    `FOUNDATION_UNAPPROVED_CHANGE ${root}/foundations/field/field.catalog.ts field: the source digest differs`,
    `FOUNDATION_UNAPPROVED_CHANGE ${root}/foundations/field/field.catalog.ts field: the contract digest differs`]);
});

test("a file of an approved piece that the gate holds no bytes for cannot be verified", () => {
  const files = { ...baseTree, "src/svelte/vendor/components/ui/input/glyph.woff2": "binary" };
  const pieces = { ...allApproved(baseTree), field: approved(files, "field") };
  const context = contextOf(files, layout, ledger(pieces));
  const unloaded = { ...context, text: (path: string) => path.endsWith(".woff2") ? undefined : context.text(path) };
  assert.deepEqual(codes(ruleL2(unloaded)).filter(item => item.includes("woff2")), [
    `FOUNDATION_UNAPPROVED_CHANGE ${root}/foundations/field/field.catalog.ts field: src/svelte/vendor/components/ui/input/glyph.woff2 has no bytes in the gate, so the approval cannot be verified`]);
});

const formPath = `${root}/compositions/form/form.catalog.ts`;

test("N40 an approved composition whose uses names a piece that is not approved", () => {
  const files = { ...baseTree, ...composition("form", "Form.svelte", ["field", "meter-bar", "meter"], '<script lang="ts">import { Field } from "../../index.ts";</script><Field />') };
  const pieces = { ...allApproved(baseTree), "meter-bar": implemented, form: approved(files, "form"),
    meter: { status: "proposed", proposedOn: "2026-10-23", reason: "Home chart" } };
  assert.deepEqual(run(files, pieces), [
    `PIECE_NOT_APPROVED ${formPath} form (approved) mounts meter-bar, which is implemented`,
    `PIECE_NOT_APPROVED ${formPath} form (approved) mounts meter, which is proposed`]);
});

test("a dispatcher and an authorable composition may mount only approved pieces, even when not approved themselves", () => {
  const dispatcher = composition("node-renderer", "NodeRenderer.svelte", ["field"], "", ', dispatch: "resolved-node"');
  const authorable = composition("appearance", "Appearance.svelte", ["field"], "", ", authorable: true");
  const files = { ...baseTree, ...dispatcher, ...authorable };
  const pieces = { field: implemented, "meter-bar": implemented, theme: implemented, form: implemented, "node-renderer": implemented, appearance: implemented };
  assert.deepEqual(run(files, pieces), [
    `PIECE_NOT_APPROVED ${root}/compositions/appearance/appearance.catalog.ts appearance (authorable) mounts field, which is implemented`,
    `PIECE_NOT_APPROVED ${root}/compositions/node-renderer/node-renderer.catalog.ts node-renderer (dispatcher) mounts field, which is implemented`]);
});

test("a piece mounted through an alias, a barrel or a namespace counts, once per mounting composition", () => {
  const markup = `<script lang="ts">import { MeterBar as Bar } from "../../index.ts"; import * as Catalog from "../../index.ts";
import Direct from "../../foundations/meter-bar/MeterBar.svelte";</script><Bar /><Catalog.MeterBar /><Direct />`;
  const files = { ...baseTree, ...composition("form", "Form.svelte", ["field"], markup) };
  const pieces = { ...allApproved(baseTree), "meter-bar": implemented, form: approved(files, "form") };
  assert.deepEqual(run(files, pieces), [`PIECE_NOT_APPROVED ${root}/compositions/form/Form.svelte form (approved) mounts meter-bar, which is implemented`]);
});

test("a literal value of a specimen that is not approved is unusable on the piece's tag", () => {
  const specimens = { "default|measure=writing": "approved", "default|measure=compact": "proposed", "value|measure=writing": "proposed" };
  const markup = (attribute: string) => `<script lang="ts">import { Field as Well } from "../../index.ts";</script><Well ${attribute} />`;
  const verdict = (attribute: string) => {
    const files = { ...baseTree, ...composition("form", "Form.svelte", ["field"], markup(attribute)) };
    return run(files, { ...allApproved(baseTree), field: approved(baseTree, "field", specimens), form: approved(files, "form") });
  };
  const failure = [`PIECE_NOT_APPROVED ${root}/compositions/form/Form.svelte <Well> passes measure="compact" to field, a specimen value that is not approved`];
  assert.deepEqual(verdict('measure="compact"'), failure);
  assert.deepEqual(verdict('measure={"compact"}'), failure);
  assert.deepEqual(verdict('measure="writing"'), []);
  assert.deepEqual(verdict("measure={size}"), []);
  assert.deepEqual(verdict('density="compact"'), []);
});
