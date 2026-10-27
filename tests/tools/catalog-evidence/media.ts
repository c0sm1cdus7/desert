// The media the evidence build serves, so a player, viewer or heading specimen is photographed showing its media, not
// failing to load it. Read from the specimens themselves: every video, audio item and caption track a specimen names under
// /media/ gets the repository's fixture of that kind (the motion study, six seconds of silence, one caption cue), and every
// logical `asset` a specimen names that the build template ships (its sample image) is served under /media/ as the product
// serves its assets. Any other /media/ path (an image a specimen names to show its error state) stays unanswered, as the
// specimen intends.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sdkRoot } from "../../../src/build/svelte/revision.ts";
import type { EvidencePiece } from "./pieces.ts";

export type EvidenceMediaKind = "video" | "audio" | "captions" | "asset";

/** Six seconds of 8 kHz mono silence, as a WAV file. */
function silence(): Buffer {
  const audio = Buffer.alloc(44 + 48000 * 2);
  audio.write("RIFF"); audio.writeUInt32LE(audio.length - 8, 4); audio.write("WAVEfmt ", 8);
  audio.writeUInt32LE(16, 16); audio.writeUInt16LE(1, 20); audio.writeUInt16LE(1, 22);
  audio.writeUInt32LE(8000, 24); audio.writeUInt32LE(16000, 28); audio.writeUInt16LE(2, 32);
  audio.writeUInt16LE(16, 34); audio.write("data", 36); audio.writeUInt32LE(audio.length - 44, 40);
  return audio;
}
const template = join(sdkRoot, "src/build/svelte/template/static");
const fixtures: Readonly<Record<Exclude<EvidenceMediaKind, "asset">, () => Buffer>> = {
  video: () => readFileSync(join(sdkRoot, "tests/fixtures/media-motion-study.webm")),
  audio: silence,
  captions: () => Buffer.from("WEBVTT\n\n00:00.000 --> 00:06.000\nA moving circle, without sound.\n"),
};

/** The /media/ paths a specimens module names as a video or audio item's source, as a caption track, or as a logical asset
 * the build template ships, by kind. */
export function mediaNamed(source: string): ReadonlyMap<string, EvidenceMediaKind> {
  const found = new Map<string, EvidenceMediaKind>();
  for (const match of source.matchAll(/kind:\s*"(video|audio)",\s*source:\s*"(\/media\/[^"]+)"/g)) found.set(match[2]!, match[1] as "video" | "audio");
  for (const match of source.matchAll(/\{\s*source:\s*"(\/media\/[^"]+)",\s*language:/g)) found.set(match[1]!, "captions");
  for (const match of source.matchAll(/\basset:\s*"([^"/]+)"/g)) if (existsSync(join(template, match[1]!))) found.set(`/media/${match[1]}`, "asset");
  return found;
}

/** Writes the fixture of every media path the pieces' specimens (and their fillers') name into the build's static/media. */
export function writeEvidenceMedia(directory: string, pieces: readonly EvidencePiece[]): ReadonlyMap<string, EvidenceMediaKind> {
  const modules = new Set(pieces.flatMap(piece => [piece.specimens?.request, piece.filler?.specimens?.request])
    .filter(request => request !== undefined).map(request => join(sdkRoot, "src", request.slice("@desert/".length))));
  const named = new Map<string, EvidenceMediaKind>();
  for (const module of modules) for (const [path, kind] of mediaNamed(readFileSync(module, "utf8"))) named.set(path, kind);
  mkdirSync(join(directory, "static/media"), { recursive: true });
  for (const [path, kind] of named) writeFileSync(join(directory, "static", path),
    kind === "asset" ? readFileSync(join(template, path.slice("/media/".length))) : fixtures[kind]());
  return named;
}
