// References are evidence. Every material operation stays unavailable during inspection.
import { promiseTexts as said } from "../../texts/promises.texts.ts";
import type { AdapterComposition } from "../../tools/adapter-contract.ts";
import { type CredentialFact, sameScope } from "../../keychain/custody/custody-contract.ts";

import { InspectionUnavailable } from "../../tools/failures/inspection-unavailable.ts";
import type { CapabilityFactory } from "../../tools/execution/capability-lease.ts";
const denied = (reason: string) => (): never => {
  throw new InspectionUnavailable(reason);
};
function inspectionPorts(program: AdapterComposition) {
  return Object.fromEntries(
    Object.entries(program.adapters ?? {}).map(([id, adapter]) => [
      id,
      Object.fromEntries(Object.keys(adapter.methods).map(name => [name, denied(said.inspectionAdapter(id, name))])),
    ]),
  );
}
export function inspectionCapabilities(
  program: AdapterComposition,
  facts: readonly CredentialFact[],
): CapabilityFactory {
  const ports = inspectionPorts(program);
  return scope => {
    let live = true;
    const latest = (slot: string) => {
      if (!live || !program.credentialSlots?.[scope.tool]?.includes(slot)) return denied(said.inspectionRead)();
      return facts
        .filter(
          fact =>
            sameScope(scope, fact) &&
            fact.slot === slot &&
            ["credential-bound", "credential-released", "credential-unusable"].includes(fact.kind),
        )
        .at(-1);
    };
    return {
      ports,
      credentials: {
        current: slot => {
          const fact = latest(slot);
          return fact?.kind === "credential-bound" ? { revision: fact.revision, refs: { ...fact.refs } } : undefined;
        },
        revision: slot => latest(slot)?.revision ?? 0,
        replace: denied(said.inspectionReplace),
        release: denied(said.inspectionRelease),
      },
      capture: denied(said.inspectionCapture),
      apply: () => false,
      // No custody command exists here (replace and release are denied), so the kit's check recognizes none.
      recognizes: () => false,
      together: work => work(),
      close: () => {
        live = false;
      },
    };
  };
}
