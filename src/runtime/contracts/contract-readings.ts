// Serves objects and notices from authentic cuts, with current presence and data trimmed to the request.
import { meant } from "../../fields/phrases.ts";
import { contractRecord } from "./contract-record.ts";
import { contractTexts } from "../../texts/contracts.texts.ts";
import { Value } from "@sinclair/typebox/value";
import { readonlyState } from "../../journal/readonly-state.ts";
import { publicValue } from "../../adapters/public-value.ts";
import type { Program, State } from "../../tools/tool-contract.ts";
import type {
  ContractCut,
  ContractPort,
  ContractReading,
  ContractPublicNotice,
  StateReading,
} from "../../tools/contract-port.ts";
import type { ContractHistory } from "./contract-history.ts";
import type { ContractPackage, ContractOffer, ContractRequest } from "../../tools/contracts/package-contracts.ts";
import { projectValue } from "./project-value.ts";
import { coreFailure } from "./contract-actions.ts";
export type ReadingScope<X extends Program> = Readonly<{
  history: ContractHistory<X>;
  valid: (cut: ContractCut) => boolean;
  cut: (sequence: number) => ContractCut;
  allowed: () => boolean;
}>;
function ownState<X extends Program>(provider: ContractPackage, state: State<X>) {
  const own = state.tools[provider.id];
  if (own === null || typeof own !== "object" || Array.isArray(own)) throw new Error(meant(contractTexts.invalidValue));
  return readonlyState(Object.fromEntries(Object.entries(own)));
}
/** A provider's object as its projector reads it from a state, checked against the offer and trimmed to the request:
 * the same reading at a cut and in the state a consumer's callback receives. */
export function projection<X extends Program>(
  provider: ContractPackage,
  have: ContractOffer["objects"][string] | undefined,
  need: ContractRequest["objects"][string],
  state: State<X> | undefined,
  key: unknown,
): StateReading {
  try {
    if (!have || !Value.Check(need.key, publicValue(key))) return coreFailure("invalid-reference");
    if (!state) return { status: "unavailable" };
    const project = provider.projectors[have.projector];
    if (!project) return coreFailure("defect");
    const value = project(ownState(provider, state), readonlyState(publicValue(key)));
    if (value === undefined) return { status: "unavailable" };
    const copy = publicValue(value);
    if (!Value.Check(have.data, copy)) return coreFailure("defect");
    return { status: "found", value: projectValue(need.data, copy) };
  } catch {
    return coreFailure("defect");
  }
}
function readObject<X extends Program>(
  provider: ContractPackage,
  have: ContractOffer["objects"][string] | undefined,
  need: ContractRequest["objects"][string],
  scope: ReadingScope<X>,
  key: unknown,
  cut: ContractCut,
): ContractReading {
  if (!scope.allowed()) return coreFailure("forbidden");
  if (!scope.valid(cut)) return coreFailure("invalid-reference");
  const read = projection(provider, have, need, scope.history.at(cut.sequence), key);
  if (read.status === "unavailable") return { status: "unavailable", sequence: cut.sequence };
  if (read.status !== "found") return read;
  const reference = { provider: provider.id, artifact: provider.artifact, key: publicValue(key) };
  return { ...read, sequence: cut.sequence, reference: readonlyState(reference) };
}
export function objectPorts<X extends Program>(
  provider: ContractPackage,
  offer: ContractOffer,
  request: ContractRequest,
  scope: ReadingScope<X>,
): ContractPort["objects"] {
  return contractRecord(
    Object.entries(request.objects).map(([name, need]) => {
      const have = offer.objects[name];
      const read = (key: unknown, cut: ContractCut) => readObject(provider, have, need, scope, key, cut);
      return [
        name,
        {
          read,
          readReference: (reference, cut) =>
            reference.provider === provider.id && reference.artifact === provider.artifact
              ? read(reference.key, cut)
              : coreFailure("invalid-reference"),
        } satisfies ContractPort["objects"][string],
      ];
    }),
  );
}
export function noticePorts<X extends Program>(
  offer: ContractOffer,
  request: ContractRequest,
  scope: ReadingScope<X>,
): ContractPort["notices"] {
  return contractRecord(
    Object.entries(request.notices).map(([name, need]) => [
      name,
      (cut: ContractCut) => {
        if (!scope.allowed()) return coreFailure("forbidden");
        if (!scope.valid(cut)) return coreFailure("invalid-reference");
        if (!scope.history.at(cut.sequence)) return coreFailure("invalid-reference");
        const have = offer.notices[name];
        if (!have) return coreFailure("defect");
        try {
          const notices: ContractPublicNotice[] = scope.history
            .events(cut.sequence)
            .filter(event => event.layer === "program" && event.kind === have.fact)
            .map(event => {
              if (!Value.Check(have.data, event.data)) throw new Error(meant(contractTexts.invalidValue));
              return {
                id: event.id,
                sequence: event.seq,
                author: event.by,
                causes: Object.freeze([...event.cause]),
                value: projectValue(need.data, event.data),
                cut: scope.cut(event.seq),
              };
            });
          return Object.freeze(notices.map(notice => Object.freeze(notice)));
        } catch {
          return coreFailure("defect");
        }
      },
    ]),
  );
}
