import { SecretCustody } from "./secret-custody.ts";
import { heldMaterial } from "./retained-material.ts";
/** Internal bridge for the unchanged action contract; never hand this dictionary to a program adapter. */
export class RedactionCustody extends SecretCustody {
  dictionary(): Map<string, string> {
    return heldMaterial(this.state);
  }
}
