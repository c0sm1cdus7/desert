// Computes every static composition reason independently, including widened metadata and repeated tuples.
import type { InstallableProgram, ProgramMetadata } from "../../tools/installable/program.ts";
import type { ContractualProgram, ContractCertification } from "./program-contracts.ts";
export type CompositionOptions = Readonly<{
  programas: readonly ContractualProgram[];
  contratos?: ContractCertification;
  identidades: boolean;
  mentes: Readonly<{ asistentes: boolean; programas: readonly string[] }>;
}>;
type Repeated<T extends readonly string[], Seen extends string = never> = T extends readonly [
  infer H extends string,
  ...infer R extends readonly string[],
]
  ? (H extends Seen ? H : never) | Repeated<R, Seen | H>
  : never;
type Ids<T extends readonly ProgramMetadata[]> = T extends readonly [
  infer H extends ProgramMetadata,
  ...infer R extends readonly ProgramMetadata[],
]
  ? [H["id"], ...Ids<R>]
  : [];
type Names<T extends ProgramMetadata["hechos"]> = T extends readonly [
  infer H extends ProgramMetadata["hechos"][number],
  ...infer R extends ProgramMetadata["hechos"],
]
  ? [H["nombre"], ...Names<R>]
  : [];
type Facts<T extends readonly ProgramMetadata[]> = T extends readonly [
  infer H extends ProgramMetadata,
  ...infer R extends readonly ProgramMetadata[],
]
  ? [...Names<H["hechos"]>, ...Facts<R>]
  : [];
type GroupErrors<P extends InstallableProgram> = P extends { readonly herramientas: infer G }
  ? {
      [K in keyof G & string]: G[K] extends { readonly effects: unknown }
        ? `${P["id"]}/herramientas/${K}/effects:reacciones-no-soportadas`
        : never;
    }[keyof G & string]
  : never;
type MetadataErrors<P> = P extends InstallableProgram
  ? | (P["desert"] extends 1 ? never : `${P["id"]}/desert:contrato-desert`)
    | GroupErrors<P>
    | (string extends P["id"] ? "programas:id-no-literal" : never)
    | (string extends P["hechos"][number]["nombre"] ? `${P["id"]}/hechos:hecho-no-literal` : never)
    | (`${number}.${number}.${number}` extends P["version"] ? `${P["id"]}/version:version-no-literal` : never)
    | (number extends P["hechos"]["length"] ? `${P["id"]}/hechos:hechos-no-tupla` : never)
    | `${P["id"]}/hechos/${Exclude<P["hechos"][number]["nombre"], `${P["id"]}/${string}`>}:hecho-ajeno`
    | (P extends { readonly effects: unknown } ? `${P["id"]}/effects:reacciones-no-soportadas` : never)
  : never;
export type CompositionErrors<O extends CompositionOptions> =
  | (number extends O["programas"]["length"] ? "programas:programas-no-tupla" : never)
  | MetadataErrors<O["programas"][number]>
  | `programas/${Repeated<Ids<O["programas"]>>}:id-repetido`
  | `hechos/${Repeated<Facts<O["programas"]>>}:hecho-repetido`
  | `mentes/programas/${Exclude<O["mentes"]["programas"][number], O["programas"][number]["id"]>}:mente-ausente`
  | `mentes/programas/${Repeated<O["mentes"]["programas"]>}:mente-repetida`
  | (O["mentes"]["asistentes"] extends true
      ? O["identidades"] extends true
        ? never
        : "mentes/asistentes:asistentes-requiere-identidades"
      : never);
export type RequireValid<O extends CompositionOptions> = {
  readonly [Reason in CompositionErrors<O> as `ERROR ${Reason}`]: never;
};
