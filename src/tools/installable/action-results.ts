// Preserves result destinations and rejection callbacks across the program's local boundary.
import type { ActContext, ActResult, Program } from "../tool-contract.ts";
import type { ProgramAct } from "../promises-contract.ts";
import { localState } from "./runtime.ts";
import { folderOf, localTarget, objectOf } from "./destinations.ts";
type Accepted<X extends Program> = Extract<ActResult<X>, { status: "accepted" }>;
/** Only the owning action's accepted result enters this callback boundary. */
function localAccepted<X extends Program>(result: Accepted<Program>): Accepted<X>;
function localAccepted(result: Accepted<Program>): Accepted<Program> {
  return result;
}
export function adaptReject<X extends Program>(
  id: string,
  group: string,
  act: ProgramAct<X>,
): Pick<ProgramAct<Program>, "reject"> {
  if (!act.reject) return {};
  return {
    reject: (context, result) => {
      const { execute: _execute, ...core } = context;
      const local: ActContext<X> = {
        ...core,
        state: localState<X>(context.state, id),
        target: localTarget(id, group, context.target),
      };
      return act.reject?.(
        local,
        localAccepted<X>({
          ...result,
          ...(result.target ? { target: localTarget(id, group, result.target) } : {}),
          ...(result.made ? { made: result.made.map(value => localTarget(id, group, value)) } : {}),
        }),
      );
    },
  };
}
export function mapResult<R extends ActResult<Program>>(id: string, group: string, result: R): R;
export function mapResult(id: string, group: string, result: ActResult<Program>): ActResult<Program> {
  if (result.status !== "accepted") return result;
  const target = (value: string) => (value === group ? folderOf(id, group) : objectOf(id, group, value));
  return {
    ...result,
    ...(result.target ? { target: target(result.target) } : {}),
    ...(result.made ? { made: result.made.map(value => objectOf(id, group, value)) } : {}),
  };
}
