import { identityWords } from "../../src/tools/core/identities/identity-reading.ts";
// A second composition requests the core explicitly; the original gate shop remains unchanged.
import { identitiesTool } from "../../src/tools/core/identities/identities.ts";
import { shopProgram, shopShown } from "./shop.ts";
export const identitiesProgram = {
  ...shopProgram,
  identities: true,
  registry: [...shopProgram.registry, identitiesTool(shopProgram.registry, "house")],
};
export const identitiesShown = { ...shopShown, words: { ...shopShown.words, identities: identityWords } };
