import assert from "node:assert/strict";
import test from "node:test";
import { compileViewProgram } from "../src/views/program.ts";
import { program, surface } from "./fixtures/image-input.ts";
import { fileEntry } from "../src/web/client/file-entry.ts";
import type { FileNode } from "../src/interaction/control-nodes.ts";

function candidate(input = "image") {
  return { ...program, journeys: program.journeys.map(journey => journey.kind === "create"
    ? { ...journey, presentation: "transient", startWith: { kind: "file-picker", input } } : journey) };
}

test("a create journey can explicitly require native file selection before a transient form", () => {
  const resolved = compileViewProgram(candidate(), surface);
  const create = resolved.journeys.find(journey => journey.kind === "create")!;
  assert.equal(create.kind, "create");
  if (create.kind !== "create") return;
  assert.deepEqual(create.startWith, { kind: "file-picker", input: "image" });
  assert.equal(create.presentation, "transient");
});

test("file entry rejects a text input and an unpublished input", () => {
  assert.throws(() => compileViewProgram(candidate("title"), surface), /INVALID_FILE_ENTRY_INPUT/);
  assert.throws(() => compileViewProgram(candidate("internal"), surface), /INVALID_FILE_ENTRY_INPUT/);
});

test("file-first entry cannot advertise a docked form", () => {
  const input = candidate();
  const journeys = input.journeys.map(journey => {
    if (journey.kind !== "create") return journey;
    const { presentation, ...rest } = journey;
    return rest;
  });
  assert.throws(() => compileViewProgram({ ...input, journeys }, surface), /FILE_ENTRY_REQUIRES_TRANSIENT/);
});

test("canceling the native picker opens no activity and filters the actual installed image formats", async () => {
  const journey = compileViewProgram(candidate(), surface).journeys.find(journey => journey.kind === "create")!;
  if (journey.kind !== "create") return;
  let picked: FileNode | undefined, began = false;
  const entry = fileEntry(surface, { resolve: () => undefined, release: () => assert.fail("cancel has no handles"),
    pick: async node => { picked = node; return null; } });
  await entry.select(journey, () => { began = true; return true; });
  assert.equal(began, false);
  assert.deepEqual(picked?.limits.accept, ["image/jpeg", "image/png", "image/webp"]);
});

test("navigation or disposal invalidates a pending choice and releases local handles", async () => {
  const journey = compileViewProgram(candidate(), surface).journeys.find(journey => journey.kind === "create")!;
  if (journey.kind !== "create") return;
  let finish!: (event: { kind: "files.choose"; control: string; files: { id: string; name: string; size: number; mediaType: string; lastModified: number }[] }) => void;
  const released: string[] = [];
  const entry = fileEntry(surface, { resolve: () => undefined, release: id => released.push(id),
    pick: () => new Promise(resolve => { finish = resolve; }) });
  const pending = entry.select(journey, () => { assert.fail("stale choice must not open a panel"); });
  entry.cancel();
  finish({ kind: "files.choose", control: "image", files: [{ id: "chosen", name: "image.png", size: 4, mediaType: "image/png", lastModified: 0 }] });
  await pending;
  assert.deepEqual(released, ["chosen"]);
});
