// Stable testing contract for programs. Internal locations may change; these names must remain available.
export { MemoryHouseKeys, adapterTest, type HouseKeyProvider } from "./checks/adapter-test.ts";
export { renewKeptJournals } from "./checks/kept/renew-kept.ts";
export { programChecks } from "./checks/program-checks.ts";
export { currentCloses } from "./checks/promises/answers/current.ts";
export { quietEntry, quietScreen } from "./checks/promises/answers/promised-entry.ts";
export { promisedChecks } from "./checks/promises/cases/promised.ts";
export { actRow, fitsSmallest, goTo, keysTo, openRows, seated, type, view } from "./checks/promises/promised-keys.ts";
export type { Seat } from "./checks/promises/promised-keys.ts";
export { cast, given, perform, staged, wroteSince } from "./checks/promises/promised-stage.ts";
export type { Aim, Check, Decided, Doing, House } from "./checks/promises/promised-stage.ts";
export { walkedChecks } from "./checks/promises/walk/promised-walk.ts";
export { realTerminal, screenOf, type RealTerminal } from "./checks/real-terminal.ts";
export { startTerminal } from "./doors/terminal/boot.ts";
export {
  count,
  day,
  digits,
  handle,
  holding,
  many,
  money,
  oneOf,
  option,
  padded,
  quantity,
  quantityDecimals,
  shownMoney,
  someOf,
  text,
  textLimit,
  thing,
  usually,
  when,
  wrongIn,
} from "./fields/fields.ts";
export { OutsideDefect } from "./fields/program-call.ts";
export { object } from "./fields/visible-text.ts";
export { effect, houseCatalog } from "./house/facts.ts";
export { ids } from "./house/ids.ts";
export { createHouse, houseStep, identityView, type House as HouseState } from "./house/members.ts";
export { startState, toolsStep, type HouseOptions } from "./house/state.ts";
export { Bus } from "./journal/bus.ts";
export { caseInstant } from "./journal/clock.ts";
export type { TimeSource } from "./journal/clock.ts";
export { vocabulary, type Catalog, type Emission, type Event, type ProgramFacts } from "./journal/vocabulary.ts";
export {
  localPorts,
  maintainHouseCustody,
  startHouse,
  type AdapterComposition,
  type AdapterDeclaration,
  type AdapterMethod,
  type CustodyMaintenance,
  type SecretResolver,
} from "./runtime/house-runtime.ts";
export { walkBody } from "./surface/acts/walk.ts";
export { walking } from "./surface/acts/walking.ts";
export { menuTarget } from "./surface/bridge/acts/program-acts.ts";
export { houseRouter } from "./surface/bridge/assembly/house-router.ts";
export { houseTools } from "./surface/bridge/assembly/house-tools.ts";
export { offeredOn } from "./surface/bridge/picking/picked.ts";
export {
  section,
  type ProgramScreen,
  type ScreenActs,
  type Shown,
  type Start,
  type SurfacePorts,
} from "./surface/bridge/ports/house-ports.ts";
export { questionWords } from "./surface/bridge/questions/asking-clock.ts";
export { asking } from "./surface/bridge/questions/asking.ts";
export { anyToolScreen } from "./surface/bridge/views/any-tool.ts";
export type { Body, Screen } from "./surface/contract/contract.ts";
export { MissingView, type Tool, type ViewRow } from "./surface/contract/shown-tool.ts";
export { formats, padded as paddedMask, shaped, type Locale } from "./surface/formats/masks.ts";
export { matches } from "./surface/menus/finding.ts";
export { startRouter, type Router } from "./surface/router/router.ts";
export { begin, fieldOf, type Choice, type Session, type Walk } from "./surface/session/screen.ts";
export { genericTexts } from "./texts/generic-surface.texts.ts";
export { toolTexts } from "./texts/tools.texts.ts";
export type {
  Credential,
  CredentialOperations,
  CredentialScope,
  PublicPorts,
  SecretRef,
  SecretRefs,
} from "./tools/capabilities-contract.ts";
export { noCapabilities } from "./tools/execution/execution-capabilities.ts";
export { outsideCause, type RunResult } from "./tools/outside.ts";
export {
  programAct,
  type Case,
  type Composition,
  type ProgramAct,
  type ProgramTool,
  type Step,
} from "./tools/promises.ts";
export type { Also, Need, Offered, Told } from "./tools/promises.ts";
export { startTools } from "./tools/start.ts";
export type { ToolStartup } from "./tools/startup-contract.ts";
export type { ActContext, ActResult, KeyStore, Program, Slices, State, ViewLimits } from "./tools/tool-contract.ts";

export { copyJournal } from "./checks/kept/copy-journal.ts";
export { keptChecks } from "./checks/kept/kept-journals.ts";
export { textOf } from "./doors/terminal/cells.ts";
export { keysOf } from "./doors/terminal/input.ts";
