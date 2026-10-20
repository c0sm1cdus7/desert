import { deriveVerification } from "../../src/testing/index.ts";
import { localPostgresTestHost } from "../../src/testing/postgres.ts";
import { Notebook } from "../../products/notebook/product.ts";

const verification = deriveVerification(Notebook);
const report = await verification.run({ host: localPostgresTestHost(), seed: 42 });
let accepted = false;
try { verification.assertComplete(report); accepted = true; } catch {}
console.log(JSON.stringify({ accepted, cases: report.cases }));
