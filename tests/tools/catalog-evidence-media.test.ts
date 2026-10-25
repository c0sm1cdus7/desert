// The evidence build serves the media its player and viewer specimens name, read from the specimens: each video, audio
// item and caption track gets the fixture of its kind, a logical asset the template ships is served under /media/; an
// image a specimen names to show its error state stays missing.
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { readEvidencePieces } from "./catalog-evidence/pieces.ts";
import { mediaNamed, writeEvidenceMedia } from "./catalog-evidence/media.ts";

const root = resolve(import.meta.dirname, "../..");

test("evidence media: every video, audio item, caption track and shipped asset the specimens name is written; the error image is not", async () => {
  const { pieces } = await readEvidencePieces(root, ["media-player", "media-viewer", "image", "grid", "place-heading"]);
  const directory = await mkdtemp(join(tmpdir(), "desert-evidence-media-"));
  try {
    const named = writeEvidenceMedia(directory, pieces);
    assert.deepEqual(Object.fromEntries([...named].sort()), {
      "/media/audio": "audio", "/media/bank-image.svg": "asset", "/media/captions": "captions", "/media/film": "video",
      "/media/harbour.en.vtt": "captions", "/media/harbour.mp4": "video", "/media/interview.m4a": "audio",
    });
    assert.deepEqual((await readdir(join(directory, "static/media"))).sort(),
      ["audio", "bank-image.svg", "captions", "film", "harbour.en.vtt", "harbour.mp4", "interview.m4a"]);
    const video = await readFile(join(directory, "static/media/harbour.mp4"));
    assert.deepEqual([...video.subarray(0, 4)], [0x1a, 0x45, 0xdf, 0xa3], "the video is the motion study (WebM)");
    assert.equal((await readFile(join(directory, "static/media/interview.m4a"))).subarray(0, 4).toString(), "RIFF");
    assert.match(await readFile(join(directory, "static/media/harbour.en.vtt"), "utf8"), /^WEBVTT\n/);
    assert.match(await readFile(join(directory, "static/media/bank-image.svg"), "utf8"), /<svg/, "the heading's asset is the template's sample image");
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("evidence media: a source that is not a video or audio item or a caption track is not named", () => {
  assert.deepEqual([...mediaNamed(`{ source: "/media/missing-photo.jpg", alt: "Missing photo", fit: "fill", retry: true }`)], []);
});
