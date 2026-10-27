import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync, appendFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { bundleFiles, packBundle, verifyBundle } from "../scripts/authoring-bundle.ts";
import { checkReferences, sourceRoot } from "../scripts/authoring-references.ts";
import { parseSkillRelease, skillRelease } from "../scripts/skill-release.ts";

test("authoring snapshots exactly match the executable source and all skill references travel with the skill", () => {
  checkReferences();
  const skill = join(sourceRoot, "skills/desert");
  const files = ["SKILL.md", "CHANGELOG.md", ...readdirSync(join(skill, "references")).map(name => `references/${name}`)];
  for (const file of files) {
    const content = readFileSync(join(skill, file), "utf8").replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, "");
    for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1]!;
      if (/^(https?:|#)/.test(target)) continue;
      const resolved = resolve(skill, dirname(file), target);
      assert.ok(resolved.startsWith(skill + "/"), `${file} points outside the skill`);
      assert.doesNotThrow(() => readFileSync(resolved));
    }
  }
});

test("the authoring export includes the runnable product and tests but excludes runtime data and build outputs", () => {
  const files = bundleFiles(sourceRoot);
  for (const path of ["src/index.ts", "src/storage/generated/infrastructure.sql", "products/notebook/product.ts",
    "src/build/svelte/template/src/routes/+page.svelte", "tests/local-controller.test.ts", "tests/web/notebook.test.ts",
    "src/build/index.ts", "src/build/serve.ts", "products/notebook/build-web.ts",
    "skills/desert/references/distributions.md",
    "package-lock.json", "AUTHORING.md", "skills/desert/references/api.md",
    "skills/desert/CHANGELOG.md", "skills/desert/references/updating.md",
    "src/testing/index.ts", "src/testing/postgres.ts", "products/notebook/verify.ts",
    "skills/desert/references/testing.md"]) assert.ok(files.includes(path));
  assert.equal(files.some(path => /(^|\/)(\.local|node_modules|\.svelte-kit|artifacts)(\/|$)|^build\//.test(path)), false);
  assert.equal(files.some(path => /(^|\/)\.env/.test(path)), false);
});

test("portable bundles verify without dependencies, are reproducible and reject source drift or overwrite", () => {
  const directory = mkdtempSync(join(tmpdir(), "desert-authoring-test-"));
  try {
    const first = join(directory, "first");
    const second = join(directory, "second");
    const manifest = packBundle(first);
    assert.equal(manifest.skillVersion, skillRelease(sourceRoot));
    assert.equal(verifyBundle(first), manifest.contentDigest);
    assert.equal(packBundle(second).contentDigest, manifest.contentDigest);
    assert.throws(() => packBundle(first), /EEXIST/);
    appendFileSync(join(first, "src/index.ts"), "\n// Changed after export\n");
    assert.throws(() => verifyBundle(first), /AUTHORING_BUNDLE_MISMATCH/);
    appendFileSync(join(second, "skills/desert/references/api.md"), "\nChanged reference\n");
    assert.throws(() => checkReferences(second), /STALE_REFERENCE/);
  } finally { rmSync(directory, { recursive: true }); }
});

test("skill releases require one version and a matching latest changelog entry", () => {
  const skill = readFileSync(join(sourceRoot, "skills/desert/SKILL.md"), "utf8");
  const changelog = readFileSync(join(sourceRoot, "skills/desert/CHANGELOG.md"), "utf8");
  assert.equal(parseSkillRelease(skill, changelog), skillRelease(sourceRoot));
  assert.throws(() => parseSkillRelease(skill, ""), /MISSING_CURRENT_SKILL_CHANGELOG/);
  assert.throws(() => parseSkillRelease(skill, "## 99.0.0 — 2026-10-15\n" + changelog), /MISSING_CURRENT_SKILL_CHANGELOG/);
  assert.throws(() => parseSkillRelease(skill.replace(/^  version:.*$/m, ""), changelog), /INVALID_SKILL_VERSION/);
  assert.throws(() => parseSkillRelease(skill.replace(/^  version:.*$/m, '  version: "latest"'), changelog), /INVALID_SKILL_VERSION/);
});

test("bundle verification rejects false skill or SDK metadata despite unchanged content", () => {
  const directory = mkdtempSync(join(tmpdir(), "desert-release-test-"));
  try {
    const snapshot = join(directory, "snapshot");
    const manifest = packBundle(snapshot);
    const path = join(snapshot, "AUTHORING-MANIFEST.json");
    for (const key of ["skillVersion", "sdkVersion"]) {
      writeFileSync(path, JSON.stringify({ ...manifest, [key]: "99.0.0" }));
      assert.throws(() => verifyBundle(snapshot), /AUTHORING_BUNDLE_MISMATCH/);
    }
    writeFileSync(path, JSON.stringify(manifest));
    assert.equal(verifyBundle(snapshot), manifest.contentDigest);
  } finally { rmSync(directory, { recursive: true }); }
});
