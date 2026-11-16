// What each identity prefers not to see: any member of the house says it, about itself alone.
import { actCatalog } from "./own-acts.ts";
import { ids } from "./ids.ts";
import { effect } from "./facts.ts";
import { accepted, ownAct } from "../tools/act-definition.ts";
import type { OwnAct, Program } from "../tools/tool-contract.ts";
export const preferenceAct = <X extends Program>(): OwnAct<X> =>
  ownAct<X, typeof actCatalog.prefer.input>(ids.self, "prefer", actCatalog.prefer, (input, { by }) =>
    accepted(effect("preferred", input, by)),
  );
