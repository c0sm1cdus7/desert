import assert from "node:assert/strict";
import test from "node:test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runWithVisualBoundaries } from "../src/authoring/visual-boundary/source.ts";

test("the real Svelte worker boundary rejects substituted, unregistered and drifted catalog derivations", async () => {
  const root = await mkdtemp(join(tmpdir(), "desert-web-catalog-build-"));
  let calls = 0;
  const worker = async () => { calls++; return "verified worker result"; };
  try {
    await cp(new URL("../src", import.meta.url), join(root, "src"), { recursive: true });
    assert.equal(await runWithVisualBoundaries(root, worker), "verified worker result");
    for (const [path, mutate] of [
      ["adapter-catalog.ts", (source: string) => source.replace('from "./catalog/compositions/text-content/TextContent.svelte"', 'from "./catalog/foundations/feedback/Feedback.svelte"')],
      ["adapter-catalog.ts", (source: string) => source + "\nexport const Unregistered = TextOwner;"],
      ["catalog-owner-types.ts", (source: string) => source.replace("TextContent: typeof TextOwner", "TextContent: typeof FeedbackOwner")],
      ["renderer-registry.ts", (source: string) => source.replace("availability: Availability,", "availability: Action,")],
      ["catalog-manifest.ts", (source: string) => source.replace('"input.text"', '"outside.visual"')],
    ] as const) {
      const target = join(root, "src/svelte", path), original = await readFile(target, "utf8"), candidate = mutate(original);
      assert.notEqual(candidate, original);
      await writeFile(target, candidate);
      await assert.rejects(runWithVisualBoundaries(root, worker), /WEB_CATALOG_(MANIFEST|DERIVATION)/);
      assert.equal(calls, 1, "an invalid registration must stop before the worker");
      await writeFile(target, original);
    }
  } finally { await rm(root, { recursive: true }); }
});
