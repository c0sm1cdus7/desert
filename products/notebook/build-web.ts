import { fileURLToPath } from "node:url";
import { compile } from "../../src/index.ts";
import { buildDistribution } from "../../src/build/index.ts";
import { Notebook } from "./product.ts";
import { NotebookService, NotebookWeb } from "./distributions.ts";

const manifest = await buildDistribution(compile(Notebook), {
  distributions: [NotebookService, NotebookWeb],
  target: NotebookWeb.id,
  outputDirectory: process.argv[2] ?? fileURLToPath(new URL("../../build/notebook-web", import.meta.url)),
});
console.log(JSON.stringify({ status: manifest.status, distribution: manifest.distributionId,
  contractDigest: manifest.contractDigest, distributionDigest: manifest.distributionDigest }, null, 2));
