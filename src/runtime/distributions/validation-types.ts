// Computes every static composition reason independently, including widened metadata and repeated tuples.
import type { InstallableProgram, ProgramMetadata } from "../../tools/installable/program.ts";
import type { ContractualProgram, ContractCertification } from "./program-contracts.ts";
export type CompositionOptions = Readonly<{
  programs: readonly ContractualProgram[];
  contracts?: ContractCertification;
  identities: boolean;
  minds: Readonly<{ assistants: boolean; programs: readonly string[] }>;
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
type Names<T extends ProgramMetadata["facts"]> = T extends readonly [
  infer H extends ProgramMetadata["facts"][number],
  ...infer R extends ProgramMetadata["facts"],
]
  ? [H["kind"], ...Names<R>]
  : [];
type Facts<T extends readonly ProgramMetadata[]> = T extends readonly [
  infer H extends ProgramMetadata,
  ...infer R extends readonly ProgramMetadata[],
]
  ? [...Names<H["facts"]>, ...Facts<R>]
  : [];
type GroupErrors<P extends InstallableProgram> = P extends { readonly tools: infer G }
  ? {
      [K in keyof G & string]: G[K] extends { readonly effects: unknown }
        ? `${P["id"]}/tools/${K}/effects:unsupported-reactions`
        : never;
    }[keyof G & string]
  : never;
type MetadataErrors<P> = P extends InstallableProgram
  ? | (P["desert"] extends 1 ? never : `${P["id"]}/desert:desert-contract`)
    | GroupErrors<P>
    | (P extends { readonly dependencies: readonly (infer D)[] }
        ? D extends { readonly kind: "distribution"; readonly name: infer N extends string }
          ? `${P["id"]}/dependencies/${N}:distribution-dependency`
          : never
        : never)
    | (string extends P["id"] ? "programs:non-literal-id" : never)
    | (string extends P["facts"][number]["kind"] ? `${P["id"]}/facts:non-literal-fact` : never)
    | (`${number}.${number}.${number}` extends P["version"] ? `${P["id"]}/version:non-literal-version` : never)
    | (number extends P["facts"]["length"] ? `${P["id"]}/facts:facts-not-tuple` : never)
    | `${P["id"]}/facts/${Exclude<P["facts"][number]["kind"], `${P["id"]}/${string}`>}:foreign-fact`
    | (P extends { readonly effects: unknown } ? `${P["id"]}/effects:unsupported-reactions` : never)
  : never;
export type CompositionErrors<O extends CompositionOptions> =
  | (number extends O["programs"]["length"] ? "programs:programs-not-tuple" : never)
  | MetadataErrors<O["programs"][number]>
  | `programs/${Repeated<Ids<O["programs"]>>}:duplicate-id`
  | `facts/${Repeated<Facts<O["programs"]>>}:duplicate-fact`
  | `minds/programs/${Exclude<O["minds"]["programs"][number], O["programs"][number]["id"]>}:missing-mind`
  | `minds/programs/${Repeated<O["minds"]["programs"]>}:duplicate-mind`
  | (O["minds"]["assistants"] extends true
      ? O["identities"] extends true
        ? never
        : "minds/assistants:assistants-require-identities"
      : never);
export type RequireValid<O extends CompositionOptions> = {
  readonly [Reason in CompositionErrors<O> as `ERROR ${Reason}`]: never;
};
