// Enruta acciones contractuales por el ejecutor del actor y separa fallos centrales de rechazos de negocio.
import { Value } from "@sinclair/typebox/value";
import { publicValue } from "../../adapters/public-value.ts";
import type { ContractInvocation, ContractResponse, CoreFailure } from "../../tools/contract-port.ts";
import type { ContractAction } from "./contract-types.ts";
import { projectValue } from "./project-value.ts";
export const coreFailure = (reason: CoreFailure["reason"]): CoreFailure => ({ status: "core-failure", reason });
export function contractAction(
  need: ContractAction,
  have: ContractAction & { ruta: string },
  provider: string,
  invocation: ContractInvocation,
): (input: unknown) => Promise<ContractResponse> {
  return async input => {
    if (invocation.signal?.aborted || invocation.alive?.() === false) return coreFailure("interrupted");
    try {
      const safe = publicValue(input);
      if (!Value.Check(need.entrada, safe) || !Value.Check(have.entrada, safe)) return coreFailure("invalid-reference");
      const slash = have.ruta.lastIndexOf("/");
      const result = await invocation.execute({
        target: `${provider}/${have.ruta.slice(0, slash)}`,
        act: have.ruta,
        input: safe,
      });
      if (result.coreFailure) return coreFailure(result.coreFailure);
      if (result.status === "inconclusive") return coreFailure("inconclusive");
      if (result.status === "interrupted") return coreFailure("interrupted");
      if (result.status !== "accepted" && result.status !== "rejected") return coreFailure("defect");
      if (result.value === undefined) return coreFailure("defect");
      const schema = result.status === "accepted" ? have.salida : have.rechazos;
      const wanted = result.status === "accepted" ? need.salida : need.rechazos;
      const value = publicValue(result.value);
      if (!Value.Check(schema, value)) return coreFailure("defect");
      return { status: result.status, value: projectValue(wanted, value) };
    } catch {
      return coreFailure("defect");
    }
  };
}
