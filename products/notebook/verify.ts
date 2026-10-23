import { fileURLToPath } from "node:url";
import { assertProductSource } from "../../src/authoring/index.ts";
import { deriveVerification } from "../../src/testing/index.ts";
import { localPostgresTestHost } from "../../src/testing/postgres.ts";

await assertProductSource(fileURLToPath(new URL("./src", import.meta.url)));
const { Notebook } = await import("./product.ts");

const verification = deriveVerification(Notebook);
const report = await verification.run({ host: localPostgresTestHost(), seed: 42 });
console.log(JSON.stringify(report, null, 2));
verification.assertComplete(report);
