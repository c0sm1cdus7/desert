import assert from "node:assert/strict";
import test from "node:test";
import { inspectVisualSource } from "../src/authoring/visual-boundary/inspect.ts";
import { VisualAuditVersion, assertNoNewVisualDebt, assertQualifiedVisualOwnership,
  type VisualInventory } from "../src/authoring/visual-boundary/inventory.ts";

const path = "src/svelte/pieces/ExampleField.svelte";
const inspect = (source: string): VisualInventory => ({ version: VisualAuditVersion, status: "not-qualified",
  roots: [], sourceDigest: "historical", limitations: ["Private child slots remain unqualified"],
  sources: [inspectVisualSource(path, source)] });
const broad = inspect('<Field {...attributes}/>');
const narrowMarkup = '<Field data-invalid={invalid} data-disabled={disabled}/>';
const narrow = inspect(narrowMarkup);
const witness = (replacement = narrow) => ({ sourceDigest: replacement.sources[0]!.digest,
  reason: "Finite semantic markers replace arbitrary native attribute forwarding, without slot qualification.",
  findings: replacement.sources[0]!.findings.map(({ code, fingerprint }) => ({ code, fingerprint })) });
const reviewed = (narrowings = [witness()]): VisualInventory => ({ ...broad, sources: broad.sources.map(source => ({ ...source,
  findings: source.findings.map(finding => ({ ...finding, reviewedNarrowings: narrowings })) })) });

test("reviewed narrowing spends one historical spread for an exact source-bound multiset", () => {
  assert.throws(() => assertNoNewVisualDebt(narrow, broad), /NEW_VISUAL_DEBT/);
  assert.doesNotThrow(() => assertNoNewVisualDebt(narrow, reviewed()));
  assert.doesNotThrow(() => assertNoNewVisualDebt(broad, reviewed()));
  assert.deepEqual(reviewed().sources[0]!.findings[0]!.fingerprint, broad.sources[0]!.findings[0]!.fingerprint);
  assert.deepEqual(narrow.sources[0]!.findings.map(item => item.code), ["OPEN_COMPONENT_INPUT", "OPEN_COMPONENT_INPUT"]);
  assert.throws(() => assertQualifiedVisualOwnership(reviewed()), /VISUAL_OWNERSHIP_INCOMPLETE/);
});

test("narrowing never accepts old-plus-new, duplicate, missing, altered or extra replacements", () => {
  for (const markup of [
    '<Field {...attributes} data-invalid={invalid} data-disabled={disabled}/>',
    narrowMarkup + '<Field data-invalid={invalid}/>',
    '<Field data-invalid={invalid}/>',
    '<Field data-invalid={foreign} data-disabled={disabled}/>',
    '<Field data-invalid={invalid} data-disabled={disabled} class="override"/>',
    '<Field data-invalid={invalid} data-disabled={disabled} style="padding:0"/>',
    narrowMarkup + "<!-- Even unrelated source changes invalidate this witness. -->",
  ]) assert.throws(() => assertNoNewVisualDebt(inspect(markup), reviewed()), /VISUAL_DEBT/, markup);
  for (const findings of [
    [...narrow.sources[0]!.findings, broad.sources[0]!.findings[0]!],
    [...narrow.sources[0]!.findings, narrow.sources[0]!.findings[0]!],
    narrow.sources[0]!.findings.slice(1),
  ]) assert.throws(() => assertNoNewVisualDebt({ ...narrow,
    sources: narrow.sources.map(source => ({ ...source, findings })) }, reviewed()), /VISUAL_DEBT/);
});

test("alternatives cannot mix or multiply the original occurrence budget", () => {
  const other = inspect('<Field data-primitive={kind}/>');
  const baseline = reviewed([witness(), witness(other)]);
  assert.doesNotThrow(() => assertNoNewVisualDebt(other, baseline));
  const mixed = { ...narrow, sources: narrow.sources.map(source => ({ ...source,
    findings: [...source.findings, ...other.sources[0]!.findings] })) };
  assert.throws(() => assertNoNewVisualDebt(mixed, baseline), /VISUAL_DEBT/);
  assert.throws(() => assertNoNewVisualDebt(narrow, reviewed([witness(), witness()])), /INVALID_VISUAL_DEBT_REVIEW/);
});

test("invalid or cross-category narrowing witnesses cannot authorize findings", () => {
  for (const invalid of [
    { ...witness(), sourceDigest: "" }, { ...witness(), reason: "" }, { ...witness(), findings: [] },
    { ...witness(), findings: [{ code: "RENDER_SLOT", fingerprint: narrow.sources[0]!.findings[0]!.fingerprint }] },
    { ...witness(), findings: [{ code: "OPEN_COMPONENT_INPUT", fingerprint: "" }] },
    { ...witness(), findings: [{ code: "OPEN_COMPONENT_INPUT", fingerprint: broad.sources[0]!.findings[0]!.fingerprint }] },
  ]) assert.throws(() => assertNoNewVisualDebt(narrow, reviewed([invalid])), /INVALID_VISUAL_DEBT_REVIEW/);
});

test("a narrowed contract spelling retains every historical contract occurrence", () => {
  const previous = inspect('<script lang="ts">import type {ComponentProps} from "svelte"; type Props=ComponentProps<typeof Field>;</script>');
  const current = inspect('<script lang="ts">import type {Snippet} from "svelte"; type Props={children?:Snippet};</script>');
  const baseline = { ...previous, sources: previous.sources.map(source => ({ ...source,
    findings: source.findings.map(item => ({ ...item, reviewedReplacements: [{
      fingerprint: current.sources[0]!.findings[0]!.fingerprint, sourceDigest: current.sources[0]!.digest,
      reason: "Inherited children are made explicit while removing all native attributes; the child slot remains debt.",
    }] })) })) };
  assert.doesNotThrow(() => assertNoNewVisualDebt(current, baseline));
  assert.throws(() => assertNoNewVisualDebt({ ...current, sources: current.sources.map(source => ({ ...source,
    findings: [...source.findings, source.findings[0]!] })) }, baseline), /NEW_VISUAL_DEBT/);
  assert.throws(() => assertQualifiedVisualOwnership(current), /VISUAL_OWNERSHIP_INCOMPLETE/);
});
