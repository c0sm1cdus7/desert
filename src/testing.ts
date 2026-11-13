// Stable testing contract for programs. Internal locations may change; these names must remain available.
export { object } from "./catalogs/acts.ts";
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
  someOf,
  text,
  textLimit,
  thing,
  usually,
  when,
  wrongIn,
} from "./catalogs/fields.ts";
export type { ViewLimits } from "./catalogs/levers.ts";
export { startTerminal } from "./doors/terminal/boot.ts";
export { realTerminal, screenOf, type RealTerminal } from "./programs/real-terminal.ts";
export { ids } from "./catalogs/ids.ts";
export { caseInstant } from "./catalogs/time.ts";
export { createHouse, identityView, houseStep, type House as HouseState } from "./house/house.ts";
export { Bus } from "./journal/bus.ts";
export type { TimeSource } from "./journal/clock.ts";
export {
  effect,
  vocabulary,
  houseCatalog,
  type Emission,
  type Catalog,
  type Event,
  type ProgramFacts,
} from "./journal/events.ts";
export { localPorts, startHouse } from "./programs/house-runtime.ts";
export { renewKeptJournals } from "./programs/renew-kept.ts";
export { programChecks } from "./programs/program-checks.ts";
export { promisedChecks } from "./programs/promised.ts";
export { currentCloses } from "./programs/answers/current.ts";
export { quietEntry, quietScreen } from "./programs/promised-entry.ts";
export { actRow, seated, goTo, openRows, type, view, fitsSmallest, keysTo } from "./programs/promised-keys.ts";
export type { Seat } from "./programs/promised-keys.ts";
export { given, perform, staged, cast, wroteSince } from "./programs/promised-stage.ts";
export type { Aim, Check, Decided, Doing, House } from "./programs/promised-stage.ts";
export { walkedChecks } from "./programs/promised-walk.ts";
export { asking } from "./surface/bridge/asking.ts";
export { anyToolScreen } from "./surface/bridge/any-tool.ts";
export {
  section,
  type Shown,
  type ProgramScreen,
  type SurfacePorts,
  type ScreenActs,
  type Start,
} from "./surface/bridge/house-ports.ts";
export { menuTarget } from "./surface/bridge/program-acts.ts";
export { matches } from "./surface/finding.ts";
export { formats, shaped, padded as paddedMask, type Locale } from "./surface/masks.ts";
export { houseRouter } from "./surface/bridge/house-router.ts";
export { houseTools } from "./surface/bridge/house-tools.ts";
export { offeredOn } from "./surface/bridge/picked.ts";
export { questionWords } from "./surface/bridge/questions/asking-clock.ts";
export type { Body, Screen } from "./surface/contract.ts";
export { fieldOf, begin, type Choice, type Session, type Walk } from "./surface/screen.ts";
export { startRouter, type Router } from "./surface/router.ts";
export { MissingView, type Tool, type ViewRow } from "./surface/shown-tool.ts";
export { walkBody } from "./surface/walk.ts";
export { walking } from "./surface/walking.ts";
export { genericTexts } from "./texts/generic-surface.texts.ts";
export { toolTexts } from "./texts/tools.texts.ts";
export { OutsideDefect, outsideCause, type RunResult } from "./tools/outside.ts";
export {
  programAct,
  type Case,
  type Composition,
  type ProgramAct,
  type ProgramTool,
  type Step,
} from "./tools/promises.ts";
export type { KeyStore, Program, State } from "./tools/tool-contract.ts";
export { startState, startTools, toolsStep } from "./tools/tools.ts";
export type { Also, Need, Offered, Told } from "./tools/promises.ts";
export type { ActContext, ActResult, Slices } from "./tools/tool-contract.ts";
