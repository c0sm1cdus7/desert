import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

test("the surface entry bundles without Node, compiler or product-authoring dependencies", async () => {
  const result = await build({
    entryPoints: ["src/client.ts"],
    bundle: true,
    platform: "browser",
    format: "esm",
    target: "es2022",
    write: false,
    metafile: true,
  });
  const dependencies = Object.keys(result.metafile.inputs);
  assert.equal(dependencies.includes("src/compile.ts"), false);
  assert.equal(dependencies.includes("src/contracts.ts"), false);
  assert.equal(dependencies.includes("src/dependencies.ts"), false);
  assert.equal(dependencies.includes("src/bindings.ts"), false);
  assert.equal(dependencies.includes("src/distributions.ts"), false);
  assert.equal(dependencies.includes("src/compiled-definition.ts"), false);
  assert.equal(dependencies.some(path => path.includes("src/local/")), false);
  assert.equal(dependencies.some(path => path.includes("node_modules/pg/")), false);
  assert.equal(dependencies.some(path => path.includes("node:crypto")), false);
  assert.ok(result.outputFiles[0]!.text.length > 0);
});
