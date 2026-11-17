// Public repository laws, separate from testing so ordinary specs do not load TypeScript or ESLint.
export { importCycles } from "./checks/laws/cycles.ts";
export { strayImports } from "./checks/laws/imports.ts";
export { outsideAccess, outsideGlobals } from "./checks/laws/adapters.ts";
export {
  longFiles,
  longLines,
  repeatedClasses,
  unsafeCasts,
  switchedOffChecks,
  looseCompiler,
} from "./checks/laws/size.ts";
export {
  readLint,
  ignoredFiles,
  looseRules,
  gateScripts,
  packageShape,
  skippedTests,
  strayTests,
  uncollectedTests,
} from "./checks/laws/gate.ts";
export { uncataloguedWords, staleWordExemptions } from "./checks/laws/biases.ts";
export { messageCoverage } from "./checks/laws/message-coverage.ts";
export { hiddenRules, instructionFiles } from "./checks/laws/prompts.ts";
export { programLaws, uncoveredCode } from "./checks/laws/program-laws.ts";
export type { Repository, Exemptions } from "./checks/laws/law-files.ts";
export type { ImportOptions } from "./checks/laws/imports.ts";
export type { OutsideOptions } from "./checks/laws/adapters.ts";
export type { LintReading } from "./checks/laws/gate.ts";
export type { WordOptions } from "./checks/laws/biases.ts";
export type { PromptOptions, RuleExemptions } from "./checks/laws/prompts.ts";
