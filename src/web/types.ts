import type { compile } from "../compile.ts";
import type { LocalSession } from "../local/session.ts";
import type { AvailabilitySnapshot } from "../availability-types.ts";
import type { Method, RequestInput } from "./protocol.ts";
import type { Json } from "../json.ts";
import type { ValidationResult } from "../validation-result.ts";

export type Surface = ReturnType<ReturnType<typeof compile>["surface"]>;
export type HumanSurface = Surface & Required<Pick<Surface, "language" | "connection" | "commit" | "fieldRepresentations">>;
export type Journey = Surface["journeys"][number];
export type Mutation = Extract<Journey, { kind: "mutation" }>;
export type Read = Extract<Journey, { kind: "read" }>;
export type RecordView = Awaited<ReturnType<LocalSession["read"]>>[number];
export type Prepared = Awaited<ReturnType<LocalSession["prepare"]>>;
export type Receipt = NonNullable<Awaited<ReturnType<LocalSession["receipt"]>>>;
export type Offer = Awaited<ReturnType<LocalSession["offer"]>>;
export type Evidence = { snapshot: AvailabilitySnapshot, validForMs: number };
export type ValidateInput = ((commandId: string, input: Json) => boolean) & {
  /** Generated modules retain diagnostics; boolean-only adapters remain compatible. */
  inspect?: (commandId: string, input: Json) => ValidationResult;
};
export type ApiMethods = {
  [K in Method]: { input: RequestInput<K>, output: Awaited<ReturnType<LocalSession[K]>> }
};
