import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { inspectVisualSource } from "../src/authoring/visual-boundary/inspect.ts";
import { VisualAuditVersion, assertNoNewVisualDebt, assertQualifiedVisualOwnership,
  inventoryVisualSources, type VisualInventory } from "../src/authoring/visual-boundary/inventory.ts";

const fixture = (source: string): VisualInventory => ({ version: VisualAuditVersion, status: "not-qualified",
  roots: [], sourceDigest: "fixture", limitations: ["Missing manifest"],
  sources: [inspectVisualSource("src/svelte/FrameBody.svelte", source)] });

test("baseline debt is not an approval and strict ownership never reports a global pass", () => {
  const previous = fixture(`<div />`);
  assert.doesNotThrow(() => assertNoNewVisualDebt(previous, previous));
  assert.throws(() => assertQualifiedVisualOwnership(previous), /VISUAL_OWNERSHIP_INCOMPLETE/);
  assert.throws(() => assertNoNewVisualDebt(fixture(`<div /><button />`), previous), /NEW_VISUAL_DEBT/);
  assert.throws(() => assertNoNewVisualDebt(fixture(`<div /><div />`), previous), /NEW_VISUAL_DEBT/);
  assert.doesNotThrow(() => assertNoNewVisualDebt(fixture(``), previous), "removing debt is permitted");
});

test("a newly introduced file cannot receive ownership merely from its folder", () => {
  const previous = fixture(``);
  const added = { ...previous, sources: [...previous.sources, inspectVisualSource("src/svelte/pieces/New.svelte", `<div />`)] };
  assert.throws(() => assertNoNewVisualDebt(added, previous), /UNCLASSIFIED_VISUAL_SOURCE/);
});

test("a reviewed responsibility migration does not grant visual ownership or suppress findings", () => {
  const before = fixture("");
  const current = { ...before, sources: before.sources.map(source => ({ ...source, role: "composition" as const, owner: "candidate:new" })) };
  assert.throws(() => assertNoNewVisualDebt(current, before), /VISUAL_CLASSIFICATION_CHANGED/);
  const reviewed = { ...before, sources: before.sources.map(source => ({ ...source, reviewedClassification: {
    role: "composition" as const, owner: "candidate:new", sourceDigest: source.digest,
    reason: "Audited transfer into a finite composition; classification is not ownership approval.",
  } })) };
  assert.doesNotThrow(() => assertNoNewVisualDebt(current, reviewed));
  assert.throws(() => assertQualifiedVisualOwnership(reviewed), /VISUAL_OWNERSHIP_INCOMPLETE/);
  assert.throws(() => assertNoNewVisualDebt({ ...current, sources: current.sources.map(source => ({ ...source, owner: "foreign" })) }, reviewed), /VISUAL_CLASSIFICATION_CHANGED/);
  assert.throws(() => assertNoNewVisualDebt({ ...current, sources: current.sources.map(source => ({ ...source,
    findings: fixture("<button/>").sources[0]!.findings })) }, reviewed), /NEW_VISUAL_DEBT/);
});

test("component event wiring does not redefine an existing native DOM owner", () => {
  const previous = fixture(`<main class="reading-layout"><section><BankRenderer onevent={create} /></section></main>`);
  const changed = fixture(`<main class="reading-layout"><section><BankRenderer\n onevent={event => { if (event.kind === "create") create("primary"); }} /></section></main>`);
  assert.doesNotThrow(() => assertNoNewVisualDebt(changed, previous));
  assert.notEqual(changed.sources[0]!.findings[0]!.fingerprint, previous.sources[0]!.findings[0]!.fingerprint,
    "full source evidence must still record the callback change");
  assert.equal(changed.sources[0]!.findings[0]!.ownershipFingerprint, previous.sources[0]!.findings[0]!.ownershipFingerprint);
  for (const source of [
    `<article class="reading-layout"><section><BankRenderer onevent={create} /></section></article>`,
    `<main class="different"><section><BankRenderer onevent={create} /></section></main>`,
    `<main class="reading-layout" style="padding:0"><section><BankRenderer onevent={create} /></section></main>`,
    `<main class="reading-layout"><section><BankRenderer onevent={create} /><button /></section></main>`,
    `<main class="reading-layout"><section><BankRenderer onevent={create} /></section><section><BankRenderer onevent={create} /></section></main>`,
    `<main class="reading-layout"><section><BankRenderer node={different} onevent={create} /></section></main>`,
    `<main class="reading-layout"><section><BankRenderer onevent={event => element.style.setProperty("color", "red")} /></section></main>`,
  ]) assert.throws(() => assertNoNewVisualDebt(fixture(source), previous), /NEW_VISUAL_DEBT/);
});

test("event bodies are independently audited and old un-attested evidence fails closed", () => {
  const previous = fixture(`<main><BankRenderer onevent={create} /></main>`);
  const changed = fixture(`<main><BankRenderer onevent={event => create(event.kind)} /></main>`);
  const unAttested = { ...previous, sources: previous.sources.map(source => ({ ...source,
    findings: source.findings.map(({ ownershipFingerprint: _ownership, ...evidence }) => evidence) })) };
  assert.throws(() => assertNoNewVisualDebt(changed, unAttested), /NEW_VISUAL_DEBT/);
  for (const mutation of [`element.style.setProperty("color", "red")`, `element.setAttribute("class", "custom")`, `element.innerHTML = "<button>New</button>"`]) {
    const unsafe = fixture(`<main><BankRenderer onevent={event => { ${mutation}; }} /></main>`);
    assert.throws(() => assertNoNewVisualDebt(unsafe, previous), /NEW_VISUAL_DEBT: RENDERER_DOM_ACCESS/);
  }
});

test("native event attributes and native nesting remain part of DOM ownership", () => {
  const previous = fixture(`<main><section onclick={original}><div /></section></main>`);
  assert.throws(() => assertNoNewVisualDebt(fixture(`<main><section onclick={changed}><div /></section></main>`), previous), /NEW_VISUAL_DEBT/);
  assert.throws(() => assertNoNewVisualDebt(fixture(`<main><section onclick={original} /><div /></main>`), previous), /NEW_VISUAL_DEBT/);
});

test("reviewed slot replacement retains one historical debt occurrence, not two allowances", () => {
  const previous = fixture(`{#snippet top()}<ToolbarLayout class="old" />{/snippet}`);
  const replacement = fixture(`{#snippet top()}<ToolbarLayout layer="content" />{/snippet}`);
  const original = previous.sources[0]!.findings.find(item => item.code === "RENDER_SLOT")!;
  const updated = replacement.sources[0]!.findings.find(item => item.code === "RENDER_SLOT")!;
  assert.throws(() => assertNoNewVisualDebt(replacement, previous), /NEW_VISUAL_DEBT/);
  const reviewed = { ...previous, sources: previous.sources.map(source => ({ ...source,
    findings: source.findings.map(item => item === original ? { ...item, reviewedReplacements: [{
      fingerprint: updated.fingerprint, sourceDigest: replacement.sources[0]!.digest,
      reason: "Reviewed removal of caller geometry; the existing snippet remains unqualified debt.",
    }] } : item) })) };
  assert.doesNotThrow(() => assertNoNewVisualDebt(replacement, reviewed));
  assert.throws(() => assertQualifiedVisualOwnership(reviewed), /VISUAL_OWNERSHIP_INCOMPLETE/);
  const combined = { ...replacement, sources: replacement.sources.map(source => ({ ...source,
    findings: [...source.findings, original] })) };
  assert.throws(() => assertNoNewVisualDebt(combined, reviewed), /NEW_VISUAL_DEBT/,
    "old and replacement share one count; duplicating the escape cannot pass");
  assert.throws(() => assertNoNewVisualDebt(fixture(`{#snippet top()}<ToolbarLayout style="color:red" />{/snippet}`), reviewed), /NEW_VISUAL_DEBT/);
  const forged = { ...reviewed, sources: reviewed.sources.map(source => ({ ...source,
    findings: source.findings.map(item => ({ ...item, reviewedReplacements: [{
      fingerprint: updated.fingerprint, sourceDigest: "", reason: "",
    }] })) })) };
  assert.throws(() => assertNoNewVisualDebt(replacement, forged), /INVALID_VISUAL_DEBT_REVIEW/);
});

test("reviewed DOM geometry evolution consumes its existing occurrence, never a second DOM allowance", () => {
  const previous = fixture('<main><ToolbarLayout class="topbar"><Action onevent={send}/></ToolbarLayout></main>');
  const next = fixture('<main><ToolbarLayout><Action onevent={send}/></ToolbarLayout></main>');
  const old = previous.sources[0]!.findings.find(item => item.code === "RENDERER_DOM")!;
  const updated = next.sources[0]!.findings.find(item => item.code === "RENDERER_DOM")!;
  assert.throws(() => assertNoNewVisualDebt(next, previous), /NEW_VISUAL_DEBT/);
  const reviewed = { ...previous, sources: previous.sources.map(source => ({ ...source,
    findings: source.findings.map(item => item === old ? { ...item, reviewedReplacements: [{
      fingerprint: updated.ownershipFingerprint!, sourceDigest: next.sources[0]!.digest,
      reason: "Owner-authorized removal of consumer toolbar geometry; outer legacy DOM remains unqualified.",
    }] } : item) })) };
  assert.doesNotThrow(() => assertNoNewVisualDebt(next, reviewed));
  assert.throws(() => assertQualifiedVisualOwnership(reviewed), /VISUAL_OWNERSHIP_INCOMPLETE/);
  assert.throws(() => assertNoNewVisualDebt({ ...next, sources: next.sources.map(source => ({ ...source,
    findings: [...source.findings, old] })) }, reviewed), /NEW_VISUAL_DEBT/);
  for (const markup of [
    '<main class="different"><ToolbarLayout><Action onevent={send}/></ToolbarLayout></main>',
    '<main><div><ToolbarLayout><Action onevent={send}/></ToolbarLayout></div></main>',
    '<main><ToolbarLayout><Action node={foreign} onevent={send}/></ToolbarLayout></main>',
    '<main><ToolbarLayout><Action onevent={()=>document.body.style.color="red"}/></ToolbarLayout></main>',
  ]) assert.throws(() => assertNoNewVisualDebt(fixture(markup), reviewed), /NEW_VISUAL_DEBT/);
});

test("catalog registration sources remain classified without allowing new visual escapes", async () => {
  const baseline = JSON.parse(await readFile(new URL("../docs/architecture/visual-ownership-debt.json", import.meta.url), "utf8")) as VisualInventory;
  for (const path of ["src/svelte/catalog-admissions.ts", "src/svelte/catalog-manifest-schema.ts",
    "src/svelte/catalog-manifest.ts", "src/svelte/catalog-owner-types.ts", "src/svelte/pieces/ViewPanel.svelte"]) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    const inspected = inspectVisualSource(path, source);
    const recorded = baseline.sources.find(item => item.path === path);
    assert.ok(recorded, `missing reviewed source: ${path}`);
    assert.deepEqual(recorded.findings, [], "classification cannot introduce a finding allowance");
    assert.deepEqual(inspected.findings, []);
    assert.doesNotThrow(() => assertNoNewVisualDebt({ ...baseline, sources: [inspected] }, baseline));
    const mutation = path.endsWith(".svelte") ? "\n{@html foreign}" : '\ndocument.body.style.color = "red";';
    const changed = inspectVisualSource(path, source + mutation);
    assert.throws(() => assertNoNewVisualDebt({ ...baseline, sources: [changed] }, baseline), /NEW_VISUAL_DEBT/);
  }
});

test("checked-in inventory detects newly introduced escapes without waiving legacy debt", async () => {
  const root = new URL("../", import.meta.url).pathname;
  const current = await inventoryVisualSources(root);
  const previous = JSON.parse(await readFile(new URL("../docs/architecture/visual-ownership-debt.json", import.meta.url), "utf8")) as VisualInventory;
  assertNoNewVisualDebt(current, previous);
  assert.ok(current.sources.some(source => source.path.endsWith("vendor/components/ui/calendar/calendar.svelte")));
  assert.ok(current.sources.some(source => source.path.endsWith("template/src/routes/+page.svelte")));
});

test("selection reflow replaces only its two historical snippets without qualifying or duplicating them", async () => {
  const path="src/svelte/pieces/SelectionField.svelte";
  const source=await readFile(new URL(`../${path}`,import.meta.url),'utf8');
  const baseline=JSON.parse(await readFile(new URL('../docs/architecture/visual-ownership-debt.json',import.meta.url),'utf8')) as VisualInventory;
  const previous=baseline.sources.find(item=>item.path===path)!;
  const reviewed=previous.findings.filter(item=>item.reviewedReplacements?.length);
  assert.equal(reviewed.length,2);
  const current=inspectVisualSource(path,source);
  const isolated={...baseline,sources:[current]};
  assert.doesNotThrow(()=>assertNoNewVisualDebt(isolated,baseline));
  assert.throws(()=>assertQualifiedVisualOwnership(isolated),/VISUAL_OWNERSHIP_INCOMPLETE/);
  assert.equal(current.findings.length,previous.findings.length-2,
    'finite Button/Popover recipes remove the two historical consumer class/style openings');
  for(const original of reviewed) {
    const duplicated={...isolated,sources:[{...current,findings:[...current.findings,original]}]};
    assert.throws(()=>assertNoNewVisualDebt(duplicated,baseline),/NEW_VISUAL_DEBT/);
  }
  for(const mutation of [
    source.replace('class="selection-label"','class="selection-label" style="color:red"'),
    source.replace('{#snippet selectedValue()}','{#snippet selectedValue()}<button>Unregistered action</button>'),
    source+'\n<style>:global(button) { min-height:1px; }</style>',
  ]) assert.throws(()=>assertNoNewVisualDebt({...isolated,sources:[inspectVisualSource(path,mutation)]},baseline));
});
