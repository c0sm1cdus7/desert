// Builds model resources from a composition while keeping its catalog and fingerprints in DESERT.
import { createHash } from "node:crypto";
import { cards } from "../../adapters/models/catalog.ts";
import { frameHouse, frameLabels } from "../../texts/mind-frame.texts.ts";
import type { Composition } from "../../tools/promises-contract.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { InstallableProgram } from "../../tools/installable/program.ts";
import type { MindDefinition } from "../../tools/minds/mind-contract.ts";
import type { MindRuntimeOptions } from "./mind-runtime-options.ts";
export type ProgramMindResources = Pick<
  MindRuntimeOptions,
  "key" | "transport" | "account" | "capNanoUsd" | "language" | "billing" | "spendingAccount"
>;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function programMindOptions(
  program: Composition<Program>,
  installed: readonly InstallableProgram[],
  definitions: readonly MindDefinition[],
  resources: ProgramMindResources,
): MindRuntimeOptions {
  const version =
    typeof program.projectionVersion === "string" ? program.projectionVersion : program.projectionVersion.value;
  const fingerprints = fingerprintsFor(program, installed, definitions, version);
  return {
    ...resources,
    definitions,
    catalog: cards,
    providers: ["anthropic"],
    maxInputTokens: 50000,
    fingerprint: definition => {
      const fingerprint = fingerprints.get(definition.actor);
      if (!fingerprint) throw new Error("runtime.definition");
      return fingerprint;
    },
    message: event => (event.layer === "house" && event.kind === "mind-message" ? event.data : undefined),
    textRules: [],
    rulesVersion: () => version,
    programBank: { program, cases: new Map(installed.map(item => [item.id, item.mindCases ?? []])) },
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
            program.registry.find(item => item.id === id)?.skill?.text("es", {}),
            definition.rules.text("es", {}),
          ]),
          frameTexts: hash([version, frameHouse.text("es", {}), frameLabels.text("es", {})]),
        },
      ];
    }),
  );
}
