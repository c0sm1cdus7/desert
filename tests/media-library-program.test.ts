import test from "node:test";
import assert from "node:assert/strict";
import { compileViewProgram } from "../src/views/program.ts";
import { program, surface } from "./fixtures/view-program.ts";

const media = { kind: "media-library", id: "library", library: {
  id: "photos", items: [{ id: "photo", kind: "image", title: "Coast", image: { asset: "coast", alt: "A coast" } }],
  albums: [{ id: "album", title: "Travel", cover: "photo", items: ["photo"] }], featured: ["album"],
} };
const candidate = () => {
  const result = structuredClone(program) as unknown as Record<string, any>;
  result.views[4].content[1] = media;
  result.destinations[2].icon = "media";
  return result;
};

test("Media mounts through a presentation journey with exactly header and library", () => {
  const result = compileViewProgram(candidate(), surface);
  assert.deepEqual(result.views[4]?.content[1], media);
  assert.equal(result.destinations[2]?.icon, "media");
});

test("Media composition cannot acquire competing headers, content, or canonical execution ports", () => {
  const extra = candidate(); extra.views[4].content.push({ kind: "text", text: "Outside the library" });
  const missing = candidate(); missing.views[4].content.shift();
  const duplicate = candidate(); duplicate.views[4].content.push({ ...media, id: "second" });
  const read = candidate(); read.views[1].content.push(media);
  for (const value of [extra, missing, duplicate, read]) {
    assert.throws(() => compileViewProgram(value, surface), { message: "INVALID_JOURNEY_MEDIA_CONTENT" });
  }
  const ownHeader = candidate(); ownHeader.views[4].content[0].media = { kind: "image", asset: "other", alt: "Other" };
  assert.throws(() => compileViewProgram(ownHeader, surface), { message: "CONFLICTING_VIEW_HEADER_MEDIA" });
});
