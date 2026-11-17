import { identityWords } from "../../src/tools/identities/identity-reading.ts";
// A second composition requests the core explicitly; the original gate shop remains unchanged.
import { shopProgram, shopShown } from "./shop.ts";
import { withIdentities } from "./shop-variants.ts";
export const identitiesProgram = withIdentities(shopProgram);
export const identitiesShown = { ...shopShown, words: { ...shopShown.words, identities: identityWords } };
