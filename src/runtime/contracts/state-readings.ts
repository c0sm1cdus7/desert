// Lets an installable program read its providers from the state its callbacks receive, with the same projection.
import { allowedAct } from "../../house/kit.ts";
import type { ContractReader, ContractReadings } from "../../tools/contract-port.ts";
import type { ContractPackage } from "../../tools/contracts/package-contracts.ts";
import type { Program, State, ToolRegistry } from "../../tools/tool-contract.ts";
import { projection } from "./contract-readings.ts";
/** What a program reads of every contract it requests, in a given state; nothing when it requests none. Whoever
 * looks is the state's own reader: `can` asks the house whether they hold the provider's act in their kit. */
export function stateReadings(
  packages: readonly ContractPackage[],
  consumer: string,
  registry: () => ToolRegistry<Program>,
): ((state: State<Program>) => ContractReadings) | undefined {
  const requests = Object.entries(packages.find(program => program.id === consumer)?.requests ?? {}).flatMap(
    ([name, request]) => {
      const provider = packages.find(program => Object.hasOwn(program.offers, name));
      const offer = provider?.offers[name];
      return provider && offer ? [{ name, request, provider, offer }] : [];
    },
  );
  if (!requests.length) return undefined;
  return state =>
    Object.fromEntries(
      requests.map(({ name, request, provider, offer }): [string, ContractReader] => {
        const objects = Object.fromEntries(
          Object.entries(request.objects).map(([object, need]) => [
            object,
            (key: unknown) => projection(provider, offer.objects[object], need, state, key),
          ]),
        );
        const can = (action: string) => {
          const route = Object.hasOwn(request.actions, action) ? offer.actions[action]?.route : undefined;
          return route !== undefined && allowedAct(state.house, state.by, provider.id, route, registry());
        };
        return [name, Object.assign(objects, { can })];
      }),
    );
}
