// Prueba cartas de menor a mayor costo, conserva su evidencia y asigna la primera que pasa el rol completo.
import type { Card, BankResult } from "../../adapters/models/catalog.ts";
import type { TurnStop } from "../../texts/mind-turn.texts.ts";
import { effect } from "../../house/facts.ts";
import { modelAccount } from "../../house/minds/model-call-state.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { MindDefinition } from "../../tools/minds/mind-contract.ts";
import type { ProgramMindCase, ProgramMindScene } from "../../tools/minds/program-mind-cases.ts";
import { modelCandidates } from "./mind-model-bridge.ts";
import {
  enabledMind,
  type MindSwitches,
  type MindRuntimeHouse,
  type MindRuntimeOptions,
  type MindBilling,
} from "./mind-runtime-options.ts";
import { maximumProgramCall, programMindAvailability } from "./program-mind-availability.ts";
import { runProgramMindScene } from "./program-mind-bank-scene.ts";
type Role<X extends Program> = Readonly<{
  house: MindRuntimeHouse<X>;
  options: MindRuntimeOptions;
  definition: MindDefinition;
  billing: MindBilling;
}>;
export async function prepareProgramMinds<X extends Program>(
  house: MindRuntimeHouse<X>,
  options: MindRuntimeOptions,
  switches: MindSwitches,
) {
  if (!options.programBank) return options;
  options = {
    ...options,
    definitions: options.definitions.filter(definition => enabledMind(switches, definition.actor)),
  };
  const catalog = options.catalog.map(card => ({ ...card, results: [...card.results] }));
  const billing: MindBilling = {
    bus: house.execution.bus,
    calls: () => house.execution.state().house.modelCalls,
    active: house.active,
  };
  const unavailable = new Map<string, TurnStop>();
  for (const definition of options.definitions) {
    if (!house.active()) break;
    const selected = await bankRole({ house, options: { ...options, catalog }, definition, billing });
    if (typeof selected === "string") {
      unavailable.set(definition.actor, selected);
      continue;
    }
    if (selected) assignInitial(house, definition, selected);
  }
  const prepared = { ...options, catalog, unavailable };
  return house.active() ? programMindAvailability(house, prepared) : prepared;
}
function assignInitial<X extends Program>(house: MindRuntimeHouse<X>, definition: MindDefinition, selected: Card) {
  if (house.active() && !house.execution.state().house.mindAssignments.has(definition.actor))
    house.execution.bus.emit(
      effect(
        "mind-card-assigned",
        {
          mind: definition.actor,
          card: selected.model,
          version: selected.effort,
          capabilities: [...selected.capabilities],
        },
        house.execution.state().house.admin,
      ),
    );
}
function roleCards<X extends Program>({ house, options, definition }: Role<X>) {
  const needs = house.execution.registry
    .filter(tool => definition.actor === `mind:${tool.id}`)
    .flatMap(tool => Object.values(tool.acts).flatMap(act => act.needs ?? []));
  const assigned = house.execution.state().house.mindAssignments.get(definition.actor);
  return modelCandidates(options.catalog)
    .filter(
      card =>
        needs.every(need => card.capabilities.includes(need)) &&
        (!assigned || (assigned.card === card.name && assigned.version === card.version)),
    )
    .sort(
      (a, b) =>
        a.referenceNanoUsd - b.referenceNanoUsd || a.name.localeCompare(b.name) || a.version.localeCompare(b.version),
    );
}
function validateCases(cases: readonly Readonly<{ id: string; scenes: readonly ProgramMindScene[] }>[]) {
  if (
    new Set(cases.map(item => item.id)).size !== cases.length ||
    cases.some(item => !item.id.trim() || item.scenes.length !== 3)
  )
    throw new Error("bank.cases");
}
async function bankRole<X extends Program>(role: Role<X>): Promise<Card | TurnStop | undefined> {
  const { house, options, definition } = role;
  const cases = options.programBank?.cases.get(definition.actor.slice(5)) ?? [];
  if (!cases.length) return undefined;
  validateCases(cases);
  for (const candidate of roleCards(role)) {
    if (!house.active()) return undefined;
    const card = options.catalog.find(item => item.model === candidate.name && item.effort === candidate.version);
    if (!card) throw new Error("bank.card");
    try {
      if (!(await options.key(card))) return "no-key";
    } catch {
      return "no-key";
    }
    if (!house.active()) return undefined;
    const result = previousResult(role, card) ?? (await testCard(role, card, cases));
    if (typeof result === "string") return result;
    // Las cartas de esta apertura son copias; el catálogo global nunca se modifica.
    card.results = [...card.results, result];
    if (result.passed) return card;
  }
  return undefined;
}
function previousResult<X extends Program>({ house, options, definition }: Role<X>, card: Card) {
  const fingerprint = options.fingerprint(definition);
  const previous = [...house.history()]
    .reverse()
    .find(
      event =>
        event.layer === "house" &&
        event.kind === "mind-bank-tested" &&
        event.data.mind === definition.actor &&
        event.data.card === card.model &&
        event.data.version === card.effort &&
        event.data.result.role === definition.role &&
        (["cases", "skill", "frameTexts"] as const).every(
          key => event.data.result.fingerprint[key] === fingerprint[key],
        ),
    );
  return previous?.layer === "house" && previous.kind === "mind-bank-tested" ? previous.data.result : undefined;
}
async function testCard<X extends Program>(
  role: Role<X>,
  card: Card,
  cases: readonly ProgramMindCase[],
): Promise<BankResult | TurnStop> {
  const { house, options, definition, billing } = role;
  const account = modelAccount(billing.calls(), options.account);
  const maximum = maximumProgramCall(card, options.maxInputTokens);
  if (account.spentNanoUsd + account.reservedNanoUsd + maximum > options.capNanoUsd) return "cap";
  const began = Date.now();
  const trial: BankResult = {
    role: definition.role,
    cases: cases.length,
    scenes: cases.length * 3,
    passed: true,
    costUsd: 0,
    seconds: 0,
    date: new Date(began).toISOString(),
    fingerprint: options.fingerprint(definition),
  };
  const passed = await runCases(role, { ...card, results: [trial] }, cases);
  if (typeof passed === "string") return passed;
  const result = {
    ...trial,
    passed,
    seconds: (Date.now() - began) / 1000,
    costUsd: (modelAccount(billing.calls(), options.account).spentNanoUsd - account.spentNanoUsd) / 1e9,
  };
  if (!house.active()) return "interrupted";
  recordResult(role, card, result);
  return result;
}
function recordResult<X extends Program>({ house, definition }: Role<X>, card: Card, result: BankResult) {
  house.execution.bus.emit(
    effect(
      "mind-bank-tested",
      {
        mind: definition.actor,
        card: card.model,
        version: card.effort,
        result,
      },
      definition.actor,
    ),
  );
}
async function runCases<X extends Program>(role: Role<X>, card: Card, cases: readonly ProgramMindCase[]) {
  const { options, definition, billing, house } = role;
  let passed = true;
  for (const scene of cases.flatMap(item => item.scenes)) {
    if (!house.active()) return "interrupted";
    const result = await runProgramMindScene(options, definition, card, scene, billing);
    if (result.stopped) return result.stopped;
    passed = result.passed && passed;
  }
  return passed;
}
