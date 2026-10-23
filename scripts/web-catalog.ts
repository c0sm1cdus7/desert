import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { readWebCatalogManifest, webCatalogManifestPath } from "../src/authoring/web-catalog/manifest.ts";
import { deriveWebCatalog } from "../src/authoring/web-catalog/derive.ts";
import { assertWebCatalogDerivations } from "../src/authoring/web-catalog/check.ts";
import { readVisualBoundarySources } from "../src/authoring/visual-boundary/source.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const option = process.argv.slice(2);
if (option.length !== 1 || !["--write", "--check"].includes(option[0]!)) throw new Error("Use --write or --check");
const manifest = readWebCatalogManifest(await readFile(resolve(root, webCatalogManifestPath), "utf8"));
if (option[0] === "--write") for (const output of deriveWebCatalog(manifest)) {
  await writeFile(resolve(root, output.path), output.source);
}
assertWebCatalogDerivations(await readVisualBoundarySources(root));
console.log(`Web catalog ${option[0] === "--write" ? "generated and checked" : "checked"}.`);
