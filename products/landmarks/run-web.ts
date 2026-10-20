import { servePublicCatalog } from "../../src/build/public-catalog/serve.ts";
import { loadLandmarks } from "./product.ts";

const { application, sourceRoot } = loadLandmarks();
const server = await servePublicCatalog({ buildDirectory: process.argv[2] ?? "build/landmarks-web-v1",
  sourceRoot, assets: application.assets, port: Number(process.argv[3] ?? 4280) });
console.log(`Landmarks · DESERT web reference: ${server.origin}`);
console.log("Public read-only catalog. Travel kit edits are session drafts. Notebook data is untouched.");
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => { void server.close(); });
