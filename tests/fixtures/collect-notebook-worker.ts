import { collectNotebookCases } from "../notebook-evidence/collect.ts";
const mode = process.argv[2];
const options = mode === "mutant" ? { execArgv: ["--import", "./tests/fixtures/corrupt-update-hook.ts"] }
  : mode === "skip" ? { execArgv: ["--import", "./tests/fixtures/skip-preservation-hook.ts"] }
  : mode === "missing" ? { testNamePatterns: "Notebook human:" }
  : mode === "blocked" ? { execArgv: ["--import", "./tests/fixtures/blocked-setup-hook.ts"] }
  : {};
console.log(JSON.stringify(await collectNotebookCases({ files: ["tests/notebook-preservation.test.ts"], ...options })));
