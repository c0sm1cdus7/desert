// The approval-evidence tool (plan §8) on three sample pieces: one image per declared specimen, at the ledger key's path,
// an index page that shows every one of them, and digests equal to what the owner's approve command stamps.
// Run: node --test --test-timeout=900000 tests/tools/catalog-evidence.test.ts   (not part of npm test: it builds and serves)
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readdir, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import sharp from "sharp";
import { readEvidencePieces } from "./catalog-evidence/pieces.ts";
import { runEvidence } from "./catalog-evidence/run.ts";
import { readStatuses } from "./catalog-evidence/status.ts";

const root = resolve(import.meta.dirname, "../.."), sample = ["action", "column", "heading"] as const;

test("the tool writes one four-render image per specimen of each sample piece, and an index that shows them all", { timeout: 900_000 }, async () => {
  const output = await mkdtemp(join(tmpdir(), "desert-evidence-"));
  try {
    const { pieces } = await readEvidencePieces(root, sample);
    const result = await runEvidence({ root, output, label: "test", ids: sample });
    const index = await readFile(result.index, "utf8");
    for (const piece of pieces) {
      const keys = piece.specimens?.list.map(specimen => specimen.key) ?? [];
      assert.ok(keys.length > 0, `${piece.id} declares specimens`);
      const files = (await readdir(join(output, piece.id))).filter(file => !file.startsWith("visual-catalog--")).sort();
      assert.deepEqual(files, keys.map(key => `${key}.png`).sort(), `${piece.id}: one image per specimen key`);
      for (const key of keys) {
        const { width, height } = await sharp(join(output, piece.id, `${key}.png`)).metadata();
        // Two columns (390 and 1280 CSS px at device scale 2) and two rows (light, dark), with gutters.
        assert.ok((width ?? 0) >= (390 + 1280) * 2, `${piece.id}:${key} holds both widths (${width}px)`);
        assert.ok((height ?? 0) > 2 * 24, `${piece.id}:${key} holds both themes (${height}px)`);
        assert.ok(index.includes(`src="${encodeURIComponent(piece.id)}/${encodeURIComponent(`${key}.png`)}"`), `index shows ${piece.id}:${key}`);
      }
      const count = result.counts.find(item => item.id === piece.id);
      assert.deepEqual(count && { rendered: count.rendered, failed: count.failed }, { rendered: keys.length, failed: [] });
    }
    assert.match(result.status, /^action\t/m);
    assert.ok(result.counts.find(item => item.id === "action")?.catalogRendered === 1, "the Visual Catalog Button page of action is captured");
  } finally { await rm(output, { recursive: true }); }
});

test("the printed digests are the ones the approve command stamps (run in a temporary copy, never on this ledger)", { timeout: 120_000 }, async () => {
  const copy = await mkdtemp(join(tmpdir(), "desert-evidence-approve-"));
  try {
    for (const path of ["src", "scripts/catalog.ts", "package.json"]) await cp(join(root, path), join(copy, path), { recursive: true });
    await symlink(join(root, "node_modules"), join(copy, "node_modules"));
    const { tree } = await readEvidencePieces(copy, ["heading"]);
    const [before] = await readStatuses(copy, tree, ["heading"]);
    const { stdout } = await promisify(execFile)(process.execPath, [join(copy, "scripts/catalog.ts"), "approve", "heading"], { cwd: copy });
    assert.match(stdout, new RegExp(`source   ${before?.sourceDigest}\\n  contract ${before?.contractDigest}`));
  } finally { await rm(copy, { recursive: true }); }
});
