import * as desert from "../../src/index.ts";
import { fileURLToPath } from "node:url";
import { assertProductSource } from "../../src/authoring/index.ts";

await assertProductSource(fileURLToPath(new URL("./src", import.meta.url)));
const { NotebookProduct } = await import("./product.ts");
const { NotebookCLI, NotebookIOS, NotebookLocal, NotebookService, NotebookWeb } = await import("./distributions.ts");

const application = desert.compile(NotebookProduct);

console.log(JSON.stringify({
  product: application.id,
  contractDigest: application.digest,
  inputSchema: application.inputSchema("create-note-record"),
  validInput: application.validateInput("create-note-record", { title: "DESERT", body: "Define the product." }),
  incompleteInput: application.validateInput("create-note-record", { title: "DESERT" }),
  human: application.surface("human"),
  execution: application.executionPlan().status,
  distributions: application.planDistributions([NotebookService, NotebookWeb, NotebookIOS, NotebookCLI, NotebookLocal])
    .map(plan => ({ id: plan.id, status: plan.status, requirements: plan.requirements })),
}, null, 2));
