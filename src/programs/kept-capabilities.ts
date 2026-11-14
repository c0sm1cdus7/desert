// References are evidence. Every material operation stays unavailable during inspection.
import type { AdapterComposition } from "../adapters/declared/adapter-contract.ts";
import type { CredentialFact } from "../adapters/secrets/custody/custody-contract.ts";
import { sameScope } from "../adapters/secrets/custody/custody-contract.ts";
import { CustodyError } from "../adapters/secrets/custody/house-keys.ts";
import type { CapabilityFactory } from "../tools/execution/capabilities.ts";
const denied = (): never => {
  throw new CustodyError("E-CUSTODY-DENIED");
};
function inspectionPorts(program: AdapterComposition) {
  return Object.fromEntries(
    Object.entries(program.adapters ?? {}).map(([id, adapter]) => [
      id,
      Object.fromEntries(Object.keys(adapter.methods).map(name => [name, denied])),
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
      if (!live || !program.credentialSlots?.[scope.tool]?.includes(slot)) return denied();
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
        replace: denied,
        release: denied,
      },
      capture: denied,
      apply: () => false,
      together: work => work(),
      close: () => {
        live = false;
      },
    };
  };
}
