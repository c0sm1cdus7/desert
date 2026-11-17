// Stable testing contract for programs. Internal locations may change; these names must remain available.
export { object } from "./fields/visible-text.ts";
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
export type { ViewLimits } from "./tools/tool-contract.ts";
export { startTerminal } from "./doors/terminal/boot.ts";
export { realTerminal, screenOf, type RealTerminal } from "./checks/real-terminal.ts";
export { ids } from "./house/ids.ts";
export { caseInstant } from "./journal/clock.ts";
export { createHouse, identityView, houseStep, type House as HouseState } from "./house/members.ts";
export { Bus } from "./journal/bus.ts";
export type { TimeSource } from "./journal/clock.ts";
export { effect, houseCatalog } from "./house/facts.ts";
export { vocabulary, type Emission, type Catalog, type Event, type ProgramFacts } from "./journal/vocabulary.ts";
export {
  localPorts,
  startHouse,
  maintainHouseCustody,
  type CustodyMaintenance,
  type AdapterComposition,
  type AdapterDeclaration,
  type AdapterMethod,
  type SecretResolver,
} from "./runtime/house-runtime.ts";
export { type HouseOptions } from "./house/state.ts";
export { renewKeptJournals } from "./checks/kept/renew-kept.ts";
export { programChecks } from "./checks/program-checks.ts";
export { promisedChecks } from "./checks/promises/cases/promised.ts";
export { currentCloses } from "./checks/promises/answers/current.ts";
export { quietEntry, quietScreen } from "./checks/promises/answers/promised-entry.ts";
export { actRow, seated, goTo, openRows, type, view, fitsSmallest, keysTo } from "./checks/promises/promised-keys.ts";
export type { Seat } from "./checks/promises/promised-keys.ts";
export { given, perform, staged, cast, wroteSince } from "./checks/promises/promised-stage.ts";
export type { Aim, Check, Decided, Doing, House } from "./checks/promises/promised-stage.ts";
export { walkedChecks } from "./checks/promises/walk/promised-walk.ts";
export { asking } from "./surface/bridge/questions/asking.ts";
export { anyToolScreen } from "./surface/bridge/views/any-tool.ts";
export {
  section,
  type Shown,
  type ProgramScreen,
  type SurfacePorts,
  type ScreenActs,
  type Start,
} from "./surface/bridge/ports/house-ports.ts";
export { menuTarget } from "./surface/bridge/acts/program-acts.ts";
export { matches } from "./surface/menus/finding.ts";
export { formats, shaped, padded as paddedMask, type Locale } from "./surface/formats/masks.ts";
export { houseRouter } from "./surface/bridge/assembly/house-router.ts";
export { houseTools } from "./surface/bridge/assembly/house-tools.ts";
export { offeredOn } from "./surface/bridge/picking/picked.ts";
export { questionWords } from "./surface/bridge/questions/asking-clock.ts";
export type { Body, Screen } from "./surface/contract/contract.ts";
export { fieldOf, begin, type Choice, type Session, type Walk } from "./surface/session/screen.ts";
export { startRouter, type Router } from "./surface/router/router.ts";
export { MissingView, type Tool, type ViewRow } from "./surface/contract/shown-tool.ts";
export { walkBody } from "./surface/acts/walk.ts";
export { walking } from "./surface/acts/walking.ts";
export { genericTexts } from "./texts/generic-surface.texts.ts";
export { toolTexts } from "./texts/tools.texts.ts";
export { OutsideDefect } from "./fields/program-call.ts";
export { outsideCause, type RunResult } from "./tools/outside.ts";
export {
  programAct,
  type Case,
  type Composition,
  type ProgramAct,
  type ProgramTool,
  type Step,
} from "./tools/promises.ts";
export type { KeyStore, Program, State } from "./tools/tool-contract.ts";
export { startState, toolsStep } from "./house/state.ts";
export { startTools } from "./tools/start.ts";
export type { Also, Need, Offered, Told } from "./tools/promises.ts";
export type { ActContext, ActResult, Slices } from "./tools/tool-contract.ts";
export { noCapabilities } from "./tools/execution/capability-lease.ts";
export type { ToolStartup } from "./tools/startup-contract.ts";
export type {
  SecretRef,
  SecretRefs,
  Credential,
  CredentialOperations,
  PublicPorts,
} from "./tools/capabilities-contract.ts";
export { adapterTest, MemoryHouseKeys, type HouseKeyProvider } from "./checks/adapter-test.ts";
export type { CredentialScope } from "./tools/capabilities-contract.ts";
