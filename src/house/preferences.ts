// What each identity prefers: what not to see and the language it reads in; each member says it of itself alone.
import { actCatalog } from "./own-acts.ts";
import { ids } from "./ids.ts";
import { effect } from "./facts.ts";
import { accepted, ownAct } from "../tools/act-definition.ts";
import type { OwnAct, Program } from "../tools/tool-contract.ts";
/** An identity says the language it reads the house in; only of itself. */
export const languageAct = <X extends Program>(): OwnAct<X> =>
  ownAct<X, typeof actCatalog.speak.input>(ids.self, "speak", actCatalog.speak, ({ language }, { by }) =>
    accepted(effect("language-set", { identity: by, language }, by)),
  );
export const preferenceAct = <X extends Program>(): OwnAct<X> =>
  ownAct<X, typeof actCatalog.prefer.input>(ids.self, "prefer", actCatalog.prefer, (input, { by }) =>
    accepted(effect("preferred", input, by)),
  );
