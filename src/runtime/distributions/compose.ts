// Composes independently declared programs into the existing engine, surface and code-derived manifest.
import { fileURLToPath } from "node:url";
import { codeProjectionVersion } from "../calculation-version.ts";
import { vocabulary } from "../../journal/vocabulary.ts";
import type { Program, Slices } from "../../tools/tool-contract.ts";
import type { Composition } from "../../tools/promises-contract.ts";
import type { Shown } from "../../surface/bridge/ports/house-ports.ts";
import { DESERT_CONTRACT, type InstallableProgram, type LocalProgram } from "../../tools/installable/program.ts";
import { CompositionError, diagnostico } from "./diagnostics.ts";
import type { CompositionOptions, RequireValid } from "./validation-types.ts";
import { distributionShown } from "./shown.ts";
export type DistributionOf<T extends readonly InstallableProgram[]> = {
  fact: LocalProgram<T[number]>["fact"];
  tools: { readonly [P in T[number] as P["id"]]: ReturnType<P["inicial"]> };
};
export type DistributionOptions = CompositionOptions &
  Readonly<{
    atajoUnaHerramienta?: boolean;
    presentacion: Omit<Shown<Program>, "words" | "screens"> & Readonly<{ codigo: readonly [string, ...string[]] }>;
  }>;
export type Distribution<X extends Program> = Readonly<{
  program: Composition<X>;
  shown: Shown<X>;
  manifest: Readonly<{
    desert: number;
    programas: readonly Readonly<{ id: string; version: string; calculation: string }>[];
    mentes: CompositionOptions["mentes"];
    identidades: boolean;
  }>;
  calculation: ReturnType<typeof codeProjectionVersion>;
  mentes: CompositionOptions["mentes"];
}>;
export function componer<const O extends DistributionOptions>(
  options: O & RequireValid<NoInfer<O>>,
): Distribution<DistributionOf<O["programas"]>>;
export function componer(options: DistributionOptions): Distribution<Program> {
  const issues = diagnostico(options);
  if (issues.length) throw new CompositionError(issues);
  const installed = options.programas.map(program => ({ definition: program, ...program.install() }));
  const roots = [
    fileURLToPath(new URL("../../", import.meta.url)),
    ...options.presentacion.codigo,
    ...options.programas.flatMap(program => program.codigo),
  ];
  const calculation = codeProjectionVersion(roots);
  const slices: Slices<Program> = {
    initial: Object.fromEntries(installed.map(p => [p.definition.id, p.initial])),
    step: Object.fromEntries(installed.map(p => [p.definition.id, p.step])),
  };
  const program: Composition<Program> = {
    identities: options.identidades,
    mentes: Object.freeze({
      asistentes: options.mentes.asistentes,
      programas: Object.freeze([...options.mentes.programas]),
    }),
    projectionVersion: calculation,
    slices,
    registry: installed.map(p => p.tool),
    words: vocabulary(Object.fromEntries(options.programas.flatMap(p => p.hechos.map(f => [f.nombre, f.forma])))),
  };
  const manifest = manifestOf(options);
  const mentes = manifest.mentes;
  return {
    program,
    shown: distributionShown(installed, options.presentacion, options.atajoUnaHerramienta),
    manifest,
    calculation,
    mentes,
  };
}
function manifestOf(options: DistributionOptions) {
  const mentes = Object.freeze({
    asistentes: options.mentes.asistentes,
    programas: Object.freeze([...options.mentes.programas]),
  });
  return Object.freeze({
    desert: DESERT_CONTRACT,
    identidades: options.identidades,
    mentes,
    programas: Object.freeze(
      options.programas.map(p =>
        Object.freeze({
          id: p.id,
          version: p.version,
          calculation: codeProjectionVersion(p.codigo).value,
        }),
      ),
    ),
  });
}
export { diagnostico, CompositionError } from "./diagnostics.ts";
export type { CompositionErrors } from "./validation-types.ts";
