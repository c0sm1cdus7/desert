// Every consumer request runs at the provider gate, on an isolated instance of the assembled house.
import { deepStrictEqual } from "node:assert/strict";
import { runContractCases } from "../../runtime/contracts/contract-gate.ts";
import { packagesForContracts } from "../../runtime/distributions/program-contracts.ts";
import { catalogLawTexts } from "../../texts/catalog-laws.texts.ts";
import type { Composition } from "../../tools/promises.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { Check } from "../promises/promised-stage.ts";
import { prepareContractHouse } from "./contract-case-house.ts";
export function contractChecks<X extends Program>(program: Composition<X>): readonly Check[] {
  if (!program.contractSetup) return [];
  const packages = packagesForContracts(program.contractSetup);
  if (!packages) return [missingContractCases];
  const version =
    typeof program.projectionVersion === "string" ? program.projectionVersion : program.projectionVersion.value;
  return packages.flatMap(consumer =>
    Object.entries(consumer.requests).flatMap(([contract, request]) => {
      const provider = packages.find(provider => Object.hasOwn(provider.offers, contract));
      if (!provider) throw new Error(`No contract provider: ${contract}`);
      return request.cases.map(scenario => ({
        name: `${provider.id} ← ${consumer.id} · ${contract} · ${scenario.id}`,
        run: async () => {
          const selected = packages.map(item =>
            item.id === consumer.id
              ? { ...item, requests: { ...item.requests, [contract]: { ...request, cases: [scenario] } } }
              : item,
          );
          const result = await runContractCases({
            programs: selected,
            provider: provider.id,
            consumer: consumer.id,
            contract,
            build: { core: version, executor: version },
            prepare: preparation => prepareContractHouse(program, scenario.actor, preparation),
          });
          deepStrictEqual(
            result.evidence.map(row => row.result),
            ["passed"],
          );
        },
      }));
    }),
  );
}

const missingContractCases: Check = {
  name: catalogLawTexts.contracts,
  run: () => Promise.reject(new Error("Contract setup has no published cases")),
};
