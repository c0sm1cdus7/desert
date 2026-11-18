// Enlaza pedidos con su único proveedor y presta puertos acotados al contexto real de una acción.
import { contractRecord, copyContractPackages } from "./contract-record.ts";
import { present } from "../../house/kit.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { Execution } from "../../tools/execution-contract.ts";
import type { ContractAccess, ContractCut, ContractFactory, ContractInvocation } from "../../tools/contract-port.ts";
import { contractTexts } from "../../texts/contracts.texts.ts";
import type { ContractPackage } from "./package-contracts.ts";
import type { ContractHistory } from "./contract-history.ts";
import { structuralContractErrors } from "./package-checks.ts";
import { contractAction } from "./contract-actions.ts";
import { objectPorts, noticePorts, type ReadingScope } from "./contract-readings.ts";
export class ContractCompositionError extends Error {
  readonly errors: readonly string[];
  constructor(errors: readonly string[]) {
    super(contractTexts.invalidComposition);
    this.errors = errors;
  }
}
function checkBindings<X extends Program>(programs: readonly ContractPackage[], ports: Pick<Execution<X>, "registry">) {
  const errors = structuralContractErrors(programs);
  for (const program of programs)
    for (const [tool, actions] of Object.entries(program.herramientas)) {
      const bound = ports.registry.find(each => each.id === program.id);
      const missing = actions.filter(action => !bound || !Object.hasOwn(bound.acts, `${tool}/${action}`));
      errors.push(...missing.map(action => `${program.id}/${tool}/${action}:ruta-sin-ejecutor`));
    }
  if (errors.length) throw new ContractCompositionError(errors);
}
function requestedPorts<X extends Program>(
  programs: readonly ContractPackage[],
  consumer: string,
  invocation: ContractInvocation,
  scope: ReadingScope<X>,
) {
  return contractRecord(
    Object.entries(programs.find(program => program.id === consumer)?.pide ?? {}).map(([name, request]) => {
      const provider = programs.find(program => Object.hasOwn(program.ofrece, name));
      const offer = provider?.ofrece[name];
      if (!provider || !offer) throw new ContractCompositionError([`sin-proveedor:${consumer}/${name}`]);
      const actions = contractRecord(
        Object.entries(request.acciones).map(([name, need]) => {
          const have = offer.acciones[name];
          if (!have) throw new ContractCompositionError([`${name}:ausente`]);
          return [name, contractAction(need, have, provider.id, invocation)];
        }),
      );
      return [
        name,
        Object.freeze({
          actions: Object.freeze(actions),
          objects: Object.freeze(objectPorts(provider, offer, request, scope)),
          notices: Object.freeze(noticePorts(offer, request, scope)),
        }),
      ];
    }),
  );
}
export function createContractRuntime<X extends Program>(
  programs: readonly ContractPackage[],
  ports: Pick<Execution<X>, "state" | "registry">,
  history: ContractHistory<X>,
) {
  checkBindings(programs, ports);
  programs = copyContractPackages(programs);
  const cuts = new WeakSet<ContractCut>();
  const cut = (sequence = ports.state().through): ContractCut => {
    const value = Object.freeze({ sequence });
    cuts.add(value);
    return value;
  };
  const open = (consumer: string, invocation: ContractInvocation): ContractAccess => {
    const allowed = () =>
      !invocation.signal?.aborted &&
      invocation.alive?.() !== false &&
      present(ports.registry, ports.state().house, invocation.by);
    const scope = { history, cut, allowed, valid: (value: ContractCut) => cuts.has(value) };
    const contracts = requestedPorts(programs, consumer, invocation, scope);
    return { contracts: Object.freeze(contracts), cut: cut() };
  };
  const context: ContractFactory = invocation =>
    open(programs.find(program => program.id === invocation.tool)?.id ?? "", invocation);
  return { context, open, cut };
}
