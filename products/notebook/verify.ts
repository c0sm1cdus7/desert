import { Notebook } from "./product.ts";
import { deriveVerification } from "../../src/testing/index.ts";
import { localPostgresTestHost } from "../../src/testing/postgres.ts";

const verification = deriveVerification(Notebook);
const report = await verification.run({ host: localPostgresTestHost(), seed: 42 });
console.log(JSON.stringify(report, null, 2));
verification.assertComplete(report);
