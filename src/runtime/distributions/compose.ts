// Composes independently declared programs into the existing engine, surface and code-derived manifest.
import { fileURLToPath } from "node:url";
import { codeProjectionVersion } from "../calculation-version.ts";
import { vocabulary } from "../../journal/vocabulary.ts";
import type { Program, Slices } from "../../tools/tool-contract.ts";
import type { Composition } from "../../tools/promises-contract.ts";
import type { Shown } from "../../surface/bridge/ports/house-ports.ts";
import { DESERT_CONTRACT, type InstallableProgram, type LocalProgram } from "../../tools/installable/program.ts";
import { CompositionError, diagnose } from "./diagnostics.ts";
import type { CompositionOptions, RequireValid } from "./validation-types.ts";
import { declaredReactions } from "../../tools/boundaries/tool-reactions.ts";
import { bindProgramContracts, installPrograms } from "./program-contracts.ts";
import { distributionShown } from "./shown.ts";
import type { InstalledProgram } from "../../tools/installable/runtime.ts";
import { programMindDefinitions, talkActs } from "./program-minds.ts";
import type { MindDefinition } from "../../tools/minds/mind-contract.ts";
import type { ProgramMindResources } from "../minds/program-mind-options.ts";
import type { MindRuntimeOptions } from "../minds/mind-runtime-options.ts";
export type DistributionOf<T extends readonly InstallableProgram[]> = {
  fact: LocalProgram<T[number]>["fact"];
  tools: { readonly [P in T[number] as P["id"]]: ReturnType<P["initial"]> };
};
export type DistributionOptions = CompositionOptions &
  Readonly<{
    singleToolShortcut?: boolean;
    shown: Omit<Shown<Program>, "words" | "screens"> & Readonly<{ code: readonly [string, ...string[]] }>;
  }>;
export type Distribution<X extends Program> = Readonly<{
  program: Composition<X>;
  mindDefinitions: readonly MindDefinition[];
  modelMinds: (resources: ProgramMindResources) => Promise<MindRuntimeOptions>;
  shown: Shown<X>;
  manifest: Readonly<{
    desert: number;
    programs: readonly Readonly<{ id: string; version: string; calculation: string }>[];
    minds: CompositionOptions["minds"];
    identities: boolean;
  }>;
  calculation: ReturnType<typeof codeProjectionVersion>;
  minds: CompositionOptions["minds"];
}>;
export function compose<const O extends DistributionOptions>(
  options: O & RequireValid<NoInfer<O>>,
): Distribution<DistributionOf<O["programs"]>>;
export function compose(options: DistributionOptions): Distribution<Program> {
  const issues = diagnose(options);
  if (issues.length) throw new CompositionError(issues);
  const { packages, installed } = installPrograms(options.programs);
  declaredReactions({ registry: installed.map(p => p.tool) });
  const roots = [
    fileURLToPath(new URL("../../", import.meta.url)),
    ...options.shown.code,
    ...options.programs.flatMap(program => program.code),
  ];
  const calculation = codeProjectionVersion(roots);
  const slices: Slices<Program> = {
    initial: Object.fromEntries(installed.map(p => [p.definition.id, p.initial])),
    step: Object.fromEntries(installed.map(p => [p.definition.id, p.step])),
  };
  const program: Composition<Program> = {
    contractSetup: bindProgramContracts(
      packages,
      installed.map(p => p.tool),
    ),
    identities: options.identities,
    minds: Object.freeze({
      assistants: options.minds.assistants,
      programs: Object.freeze([...options.minds.programs]),
    }),
    projectionVersion: calculation,
    slices,
    registry: installed.map(p => p.tool),
    words: vocabulary(Object.fromEntries(options.programs.flatMap(p => p.facts.map(f => [f.kind, f.schema])))),
  };
  return finishDistribution(options, installed, program, calculation);
}
function finishDistribution(
  options: DistributionOptions,
  installed: readonly (InstalledProgram & { definition: InstallableProgram })[],
  program: Composition<Program>,
  calculation: ReturnType<typeof codeProjectionVersion>,
): Distribution<Program> {
  const manifest = manifestOf(options);
  const minds = manifest.minds;
  const mindDefinitions = programMindDefinitions(installed, minds.programs);
  return {
    mindDefinitions,
    modelMinds: async resources => {
      const { programMindOptions } = await import("../minds/program-mind-options.ts");
      return programMindOptions(program, options.programs, mindDefinitions, resources, talkActs(installed));
    },
    program,
    shown: distributionShown(installed, options.shown, options.singleToolShortcut),
    manifest,
    calculation,
    minds,
  };
}
function manifestOf(options: DistributionOptions) {
  const minds = Object.freeze({
    assistants: options.minds.assistants,
    programs: Object.freeze([...options.minds.programs]),
  });
  return Object.freeze({
    desert: DESERT_CONTRACT,
    identities: options.identities,
    minds,
    programs: Object.freeze(
      options.programs.map(p =>
        Object.freeze({
          id: p.id,
          version: p.version,
          calculation: codeProjectionVersion(p.code).value,
        }),
      ),
    ),
  });
}
export { diagnose, CompositionError } from "./diagnostics.ts";
export type { CompositionErrors } from "./validation-types.ts";
