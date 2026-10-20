import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveBitsScrollLock } from "../src/build/svelte/bits-scroll-lock.ts";

test("adaptive dialogs reuse the pinned installed Bits scroll-lock owner", () => {
  const file = resolveBitsScrollLock();
  assert.match(file, /bits-ui\/dist\/bits\/utilities\/scroll-lock\/scroll-lock\.svelte$/);
  const installed = readFileSync(file, "utf8");
  assert.match(installed, /import \{ BodyScrollLock \}/);
  assert.match(installed, /new BodyScrollLock\(preventScroll/);
});

test("private bridge rejects an unreviewed Bits version or a missing installed entry", () => {
  const directory = mkdtempSync(join(tmpdir(), "desert-bits-compat-"));
  try {
    mkdirSync(join(directory, "dist"));
    const entry = join(directory, "dist/index.js");
    writeFileSync(join(directory, "package.json"), JSON.stringify({ name: "bits-ui", version: "2.19.3" }));
    assert.throws(() => resolveBitsScrollLock(entry), /UNREVIEWED_BITS_SCROLL_LOCK_VERSION/);
    writeFileSync(join(directory, "package.json"), JSON.stringify({ name: "bits-ui", version: "2.19.2" }));
    assert.throws(() => resolveBitsScrollLock(entry), /BITS_SCROLL_LOCK_ENTRY_MISSING/);
  } finally { rmSync(directory, { recursive: true }); }
});
