// Sirve objetos y avisos desde cortes auténticos, con presencia vigente y datos recortados al pedido.
import { contractRecord } from "./contract-record.ts";
import { contractTexts } from "../../texts/contracts.texts.ts";
import { Value } from "@sinclair/typebox/value";
import { readonlyState } from "../../journal/readonly-state.ts";
import { publicValue } from "../../adapters/public-value.ts";
import type { Program, State } from "../../tools/tool-contract.ts";
import type { ContractCut, ContractPort, ContractReading, ContractPublicNotice } from "../../tools/contract-port.ts";
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
  if (own === null || typeof own !== "object" || Array.isArray(own)) throw new Error(contractTexts.invalidValue);
  return readonlyState(Object.fromEntries(Object.entries(own)));
}
function readObject<X extends Program>(
  provider: ContractPackage,
  have: ContractOffer["objetos"][string] | undefined,
  need: ContractRequest["objetos"][string],
  scope: ReadingScope<X>,
  key: unknown,
  cut: ContractCut,
): ContractReading {
  if (!scope.allowed()) return coreFailure("forbidden");
  if (!scope.valid(cut)) return coreFailure("invalid-reference");
  try {
    const safe = publicValue(key);
    if (!have || !Value.Check(need.clave, safe)) return coreFailure("invalid-reference");
    const state = scope.history.at(cut.sequence);
    if (!state) return { status: "unavailable", sequence: cut.sequence };
    const project = provider.proyectores[have.proyector];
    if (!project) return coreFailure("defect");
    const value = project(ownState(provider, state), readonlyState(safe));
    if (value === undefined) return { status: "unavailable", sequence: cut.sequence };
    const copy = publicValue(value);
    if (!Value.Check(have.datos, copy)) return coreFailure("defect");
    return {
      status: "found",
      sequence: cut.sequence,
      value: projectValue(need.datos, copy),
      reference: readonlyState({ provider: provider.id, artifact: provider.artifact, key: safe }),
    };
  } catch {
    return coreFailure("defect");
  }
}
export function objectPorts<X extends Program>(
  provider: ContractPackage,
  offer: ContractOffer,
  request: ContractRequest,
  scope: ReadingScope<X>,
): ContractPort["objects"] {
  return contractRecord(
    Object.entries(request.objetos).map(([name, need]) => {
      const have = offer.objetos[name];
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
    Object.entries(request.avisos).map(([name, need]) => [
      name,
      (cut: ContractCut) => {
        if (!scope.allowed()) return coreFailure("forbidden");
        if (!scope.valid(cut)) return coreFailure("invalid-reference");
        if (!scope.history.at(cut.sequence)) return coreFailure("invalid-reference");
        const have = offer.avisos[name];
        if (!have) return coreFailure("defect");
        try {
          const notices: ContractPublicNotice[] = scope.history
            .events(cut.sequence)
            .filter(event => event.layer === "program" && event.kind === have.hecho)
            .map(event => {
              if (!Value.Check(have.datos, event.data)) throw new Error(contractTexts.invalidValue);
              return {
                id: event.id,
                sequence: event.seq,
                author: event.by,
                causes: Object.freeze([...event.cause]),
                value: projectValue(need.datos, event.data),
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
