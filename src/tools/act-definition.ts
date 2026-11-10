import type { Static, TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type { ActContext, ActResult, OwnAct, Program, Reach, ToolAct } from "./tool-contract.ts";
import type { Emission } from "../journal/events.ts";
import { toolTexts } from "../texts/tools.texts.ts";
type Perform<X extends Program, S extends TSchema> = (
  value: Static<S>,
  context: ActContext<X>,
) => ActResult<X> | Promise<ActResult<X>>;
/** Bind execution to the sole schema check, after the tool's own normalization. */
export function toolAct<X extends Program, S extends TSchema>(
  input: S,
  perform: Perform<X, S>,
  reach: Reach = "house",
  normalize: (value: unknown) => unknown = value => value,
): ToolAct<X> {
  return {
    input,
    reach,
    run: (value, context) => {
      const prepared = normalize(value);
      return Value.Check(input, prepared) ? perform(prepared, context) : rejected(toolTexts.invalid);
    },
  };
}
export const ownAct = <X extends Program, S extends TSchema>(
  object: string,
  option: string,
  declaration: { input: S; purpose: string },
  perform: Perform<X, S>,
): OwnAct<X> => ({ object, option, purpose: declaration.purpose, ...toolAct(declaration.input, perform) });
/** Declare that an act returns something to read. */
export const reading = <A extends { readonly output?: boolean }>(act: A): A => ({ ...act, output: true });
export const accepted = <P extends Emission>(...effects: P[]) => ({ status: "accepted" as const, effects });
export const rejected = (reason: string) => ({ status: "rejected" as const, reason });
