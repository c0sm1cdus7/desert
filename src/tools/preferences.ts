// What each identity prefers not to see: any member of the house says it, about itself alone.
import { actCatalog } from "../catalogs/acts.ts";
import { ids } from "../catalogs/ids.ts";
import { effect } from "../journal/events.ts";
import { accepted, ownAct } from "./act-definition.ts";
import type { OwnAct, Program } from "./tool-contract.ts";

export const preferenceAct = <X extends Program>(): OwnAct<X> =>
  ownAct<X, typeof actCatalog.prefer.input>(ids.self, "prefer", actCatalog.prefer, (input, { by }) =>
    accepted(effect("preferred", input, by)),
  );
