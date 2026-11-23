// Builds model resources from a composition while keeping its catalog and fingerprints in DESERT.
import { workingLanguage } from "../../fields/languages.ts";
import { createHash } from "node:crypto";
import { cards } from "../../adapters/models/catalog.ts";
import { frameHouse, frameLabels } from "../../texts/mind-frame.texts.ts";
import type { Composition } from "../../tools/promises-contract.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { InstallableProgram } from "../../tools/installable/program.ts";
import type { MindDefinition } from "../../tools/minds/mind-contract.ts";
import type { MindRuntimeOptions } from "./mind-runtime-options.ts";
import { parseMindActor } from "../../fields/mind-actor.ts";
export type ProgramMindResources = Pick<
  MindRuntimeOptions,
  | "key"
  | "transport"
  | "account"
  | "capNanoUsd"
  | "billing"
  | "spendingAccount"
  | "cards"
  | "assistantCard"
  | "supervisorCard"
>;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function programMindOptions(
  program: Composition<Program>,
  installed: readonly InstallableProgram[],
  definitions: readonly MindDefinition[],
  resources: ProgramMindResources,
  talk: MindRuntimeOptions["talk"] = [],
): MindRuntimeOptions {
  const version =
    typeof program.projectionVersion === "string" ? program.projectionVersion : program.projectionVersion.value;
  const fingerprints = fingerprintsFor(program, installed, definitions, version);
  return {
    ...resources,
    definitions,
    talk,
    catalog: cards,
    providers: ["anthropic"],
    maxInputTokens: 50000,
    fingerprint: definition => {
      const fingerprint =
        fingerprints.get(definition.actor) ??
        (parseMindActor(definition.actor)?.kind === "assistant"
          ? assistantFingerprint(program, definition, version)
          : undefined);
      if (!fingerprint) throw new Error("runtime.definition");
      return fingerprint;
    },
    message: event => {
      for (const item of installed) {
        const message = item.messages?.read(event);
        if (message) return message;
      }
      return undefined;
    },
    textRules: [],
    rulesVersion: () => version,
    programBank: { program, cases: new Map(installed.map(item => [item.id, item.mindCases ?? []])) },
  };
}
/** An assistant has no cases yet; its skill is what it reads: the talk programs' skills and its own rules. */
function assistantFingerprint(program: Composition<Program>, definition: MindDefinition, version: string) {
  const talks = new Set(definition.communication.map(item => item.tool));
  return {
    cases: hash([version, []]),
    skill: hash([
      ...program.registry.filter(item => talks.has(item.id)).map(item => item.skill?.text(workingLanguage, {})),
      definition.rules.text(workingLanguage, {}),
    ]),
    frameTexts: hash([version, frameHouse.text(workingLanguage, {}), frameLabels.text(workingLanguage, {})]),
  };
}
function fingerprintsFor(
  program: Composition<Program>,
  installed: readonly InstallableProgram[],
  definitions: readonly MindDefinition[],
  version: string,
) {
  return new Map(
    definitions.map(definition => {
      const id = definition.actor.slice(5);
      const cases = installed.find(item => item.id === id)?.mindCases ?? [];
      return [
        definition.actor,
        {
          cases: hash([version, cases.map(item => item.id)]),
          skill: hash([
            program.registry.find(item => item.id === id)?.skill?.text(workingLanguage, {}),
            definition.rules.text(workingLanguage, {}),
          ]),
          frameTexts: hash([version, frameHouse.text(workingLanguage, {}), frameLabels.text(workingLanguage, {})]),
        },
      ];
    }),
  );
}
