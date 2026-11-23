// Routes contract actions through the actor's executor and tells core failures from business refusals.
import { meant } from "../../fields/phrases.ts";
import { Value } from "@sinclair/typebox/value";
import { publicValue } from "../../adapters/public-value.ts";
import type {
  ContractExecution,
  ContractInvocation,
  ContractResponse,
  CoreFailure,
} from "../../tools/contract-port.ts";
import type { ContractAction } from "../../tools/contracts/contract-types.ts";
import { projectValue } from "./project-value.ts";
export const coreFailure = (reason: CoreFailure["reason"]): CoreFailure => ({ status: "core-failure", reason });
/** A refusal before running (`offered`, `stops`) says only its cause: it reaches the consumer as `{ reason }`, a
 * business refusal when that fits the declared refusals, and a defect when it does not. Between programs a cause
 * is data: it travels as its English words, the id both sides declare. */
const refusedBefore = (result: ContractExecution) =>
  result.status === "rejected" && result.reason !== undefined ? { reason: meant(result.reason) } : undefined;
export function contractAction(
  need: ContractAction,
  have: ContractAction & { route: string },
  provider: string,
  invocation: ContractInvocation,
): (input: unknown) => Promise<ContractResponse> {
  return async input => {
    if (invocation.signal?.aborted || invocation.alive?.() === false) return coreFailure("interrupted");
    try {
      const safe = publicValue(input);
      if (!Value.Check(need.input, safe) || !Value.Check(have.input, safe)) return coreFailure("invalid-reference");
      const slash = have.route.lastIndexOf("/");
      const result = await invocation.execute({
        target: `${provider}/${have.route.slice(0, slash)}`,
        act: have.route,
        input: safe,
      });
      if (result.coreFailure && !result.declined) return coreFailure(result.coreFailure);
      if (result.status === "inconclusive") return coreFailure("inconclusive");
      if (result.status === "interrupted") return coreFailure("interrupted");
      if (result.status !== "accepted" && result.status !== "rejected") return coreFailure("defect");
      const said = result.value ?? refusedBefore(result);
      if (said === undefined) return coreFailure("defect");
      const schema = result.status === "accepted" ? have.output : have.rejections;
      const wanted = result.status === "accepted" ? need.output : need.rejections;
      const value = publicValue(said);
      if (!Value.Check(schema, value)) return coreFailure("defect");
      return { status: result.status, value: projectValue(wanted, value) };
    } catch {
      return coreFailure("defect");
    }
  };
}
