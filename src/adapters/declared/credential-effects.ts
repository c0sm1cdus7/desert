import { effect, type Emission } from "../../journal/events.ts";
import type { CredentialOperations, SecretRefs } from "../../tools/capabilities-contract.ts";
import type { CredentialSession, SecretCustody } from "../secrets/custody/secret-custody.ts";
/** A command is usable only by the lease that issued it; copies and bus writes carry no authority. */
export function credentialEffects(custody: SecretCustody, session: CredentialSession, check: (slot: string) => void) {
  const commands = new WeakMap<object, () => void>();
  function command(slot: string, expected: number, refs?: SecretRefs) {
    check(slot);
    const held = refs ? Object.freeze({ ...refs }) : undefined;
    const { actor, tool, target } = session.scope;
    const detail = { credentialRequest: { slot, expected, refs: held ?? {}, release: held === undefined } };
    const request = effect("tool-entry", { tool, target, author: actor, text: "", silent: true, detail }, actor);
    commands.set(request, () => {
      check(slot);
      custody.confirm(session, slot, expected, held);
    });
    return request;
  }
  const replace: CredentialOperations["replace"] = (slot, refs, expected) => command(slot, expected, refs);
  const release: CredentialOperations["release"] = (slot, expected) => command(slot, expected);
  return {
    replace,
    release,
    apply: (emission: Emission, accepted: boolean) => {
      const commit = commands.get(emission);
      if (!commit) return false;
      commands.delete(emission);
      if (accepted) commit();
      return true;
    },
  };
}
