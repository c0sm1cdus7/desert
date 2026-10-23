import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { bindLocalMedia, writeLocalMedia, loadLocalMedia, requireDistinctMedia, localMediaFile } from "../src/build/media.ts";
import { localMediaHandler } from "../src/build/media-handler.ts";
import { requireViewMediaBindings } from "../src/build/media-references.ts";
import { program } from "./fixtures/view-program.ts";

test("local reference attestation is closed, immutable, canonical and excludes source paths", () => {
  const directory = mkdtempSync(join(tmpdir(), "desert-local-media-binding-"));
  try {
    writeFileSync(join(directory, "private-image.png"), Buffer.from("fixture image bytes"));
    const assets = [{ id: "z-image", path: "private-image.png", alt: "Image" }, { id: "a-image", path: "private-image.png", alt: "Image" }];
    const bound = bindLocalMedia({ sourceRoot: directory, assets });
    assert.deepEqual(bound.map(item => item.id), ["a-image", "z-image"]);
    writeLocalMedia(directory, bound);
    const attestation = loadLocalMedia(directory);
    assert.ok(Object.isFrozen(attestation) && Object.isFrozen(attestation.assets));
    const serialized = readFileSync(join(directory, localMediaFile), "utf8");
    assert.ok(!serialized.includes(directory) && !serialized.includes("private-image.png"));
    const invalid = { ...attestation, sourceRoot: directory };
    writeFileSync(join(directory, localMediaFile), JSON.stringify(invalid));
    assert.throws(() => loadLocalMedia(directory), /INVALID_LOCAL_MEDIA_ATTESTATION/);
    writeFileSync(join(directory, localMediaFile), JSON.stringify({ ...attestation, assets: [attestation.assets[0], attestation.assets[0]] }));
    assert.throws(() => loadLocalMedia(directory), /INVALID_LOCAL_MEDIA_ATTESTATION/);
    assert.throws(() => requireDistinctMedia(bound, { "web/client/media/a-image": "digest" }), /LOCAL_MEDIA_ASSET_COLLISION/);
    writeFileSync(join(directory, "clip.mp4"), "fixture video bytes");
    assert.equal(bindLocalMedia({ sourceRoot: directory,
      assets: [{ id: "clip", path: "clip.mp4", alt: "Video" }] })[0]?.mediaType, "video/mp4");
  } finally { rmSync(directory, { recursive: true }); }
});

test("media binding is opt-in and absent bindings preserve the existing request handler", async () => {
  const render = () => {};
  const unchanged = await localMediaHandler("not-read", {}, undefined, render);
  assert.equal(unchanged.handle, render); unchanged.close();
  await assert.rejects(localMediaHandler("not-read", {}, { sourceRoot: "not-read", assets: [] }, render), /UNDECLARED_LOCAL_MEDIA_BINDING/);
  await assert.rejects(localMediaHandler("not-read", { [localMediaFile]: "digest" }, undefined, render), /LOCAL_MEDIA_BINDING_REQUIRED/);
  assert.doesNotThrow(() => requireViewMediaBindings(program, []));
  assert.throws(() => requireViewMediaBindings(program, [{ id: "unreferenced", mediaType: "image/png" }]), /UNREFERENCED_LOCAL_MEDIA_BINDING/);
  assert.throws(() => requireViewMediaBindings(undefined, [{ id: "unreferenced", mediaType: "image/png" }]), /UNREFERENCED_LOCAL_MEDIA_BINDING/);
});
