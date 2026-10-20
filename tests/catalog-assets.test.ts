import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, symlinkSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bindCatalogAssets } from "../src/build/public-catalog/assets.ts";

test("public catalog media bindings are local, hashed, and cannot escape their root", () => {
  const root = mkdtempSync(join(tmpdir(), "desert-media-test-"));
  try {
    writeFileSync(join(root, "photo.jpg"), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    const assets = [{ id: "photo", path: "photo.jpg", alt: "A place" }];
    const binding = bindCatalogAssets(root, assets);
    assert.equal(binding[0]?.id, "photo");
    assert.equal(binding[0]?.mediaType, "image/jpeg");
    assert.match(binding[0]!.digest, /^[a-f0-9]{64}$/);
    assert.ok(Object.isFrozen(binding));
    for (const path of ["../photo.jpg", "/photo.jpg", "https://example.com/photo.jpg", "photo.svg", "photo%2Ejpg", "photo.jpg?size=1", "photo.jpg#x"]) {
      assert.throws(() => bindCatalogAssets(root, [{ ...assets[0]!, path }]));
    }
    symlinkSync(join(root, "photo.jpg"), join(root, "link.jpg"));
    assert.throws(() => bindCatalogAssets(root, [{ ...assets[0]!, path: "link.jpg" }]), /SYMLINK/);
    mkdirSync(join(root, "nested"));
    symlinkSync(join(root, "nested"), join(root, "linked-directory"));
    assert.throws(() => bindCatalogAssets(root, [{ ...assets[0]!, path: "linked-directory/photo.jpg" }]), /SYMLINK/);
    assert.throws(() => bindCatalogAssets(root, [...assets, ...assets]), /DUPLICATE/);
    writeFileSync(join(root, "photo.jpg"), "changed");
    assert.notEqual(bindCatalogAssets(root, assets)[0]?.digest, binding[0]?.digest);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
