import { buildPublicCatalogWeb } from "../../src/build/public-catalog/build.ts";
import { loadLandmarks } from "./product.ts";

const { application, sourceRoot } = loadLandmarks();
const outputDirectory = process.argv[2] ?? "build/landmarks-web-v1";
const manifest = await buildPublicCatalogWeb(application, { outputDirectory, sourceRoot });
console.log(JSON.stringify({ outputDirectory, ...manifest, files: Object.keys(manifest.files).length }, null, 2));
