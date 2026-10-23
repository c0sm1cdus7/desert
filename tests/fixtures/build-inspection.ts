import { resolve } from "node:path";
import { buildDistribution } from "../../src/build/index.ts";
import { NotebookService, NotebookWeb } from "../../products/notebook/distributions.ts";
import { InspectionApplication } from "./inspection-product.ts";

await buildDistribution(InspectionApplication, {
  distributions: [NotebookService, NotebookWeb], target: NotebookWeb.id,
  outputDirectory: resolve(process.env.DESERT_INSPECTION_BUILD ?? "build/notebook-inspection-web"),
});
