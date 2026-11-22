// Produces binding effects whose authority stays with the session that issued them.
import { effect } from "../house/facts.ts";
import type { Emission } from "../journal/vocabulary.ts";
import { credentialCommand, type CredentialOperations, type SecretRefs } from "../tools/capabilities-contract.ts";
import type { CredentialSession, SecretCustody } from "../keychain/custody/secret-custody.ts";
/** A command is usable only by the lease that issued it; copies and bus writes carry no authority. */
export function credentialEffects(custody: SecretCustody, session: CredentialSession, check: (slot: string) => void) {
  let changed = false;
  const commands = new WeakMap<object, () => void>();
  function command(slot: string, expected: number, refs?: SecretRefs) {
    check(slot);
    const held = refs ? Object.freeze({ ...refs }) : undefined;
    const { actor, tool, target } = session.scope;
    const detail = { credentialRequest: { slot, expected, refs: held ?? {}, release: held === undefined } };
    const request = {
      ...effect("tool-entry", { tool, target, author: actor, text: "", silent: true, detail }, actor),
      [credentialCommand]: true as const,
    };
    commands.set(request, () => {
      check(slot);
      custody.confirm(session, slot, expected, held);
      changed = true;
    });
    return request;
  }
  const replace: CredentialOperations["replace"] = (slot, refs, expected) => command(slot, expected, refs);
  const release: CredentialOperations["release"] = (slot, expected) => command(slot, expected);
  return {
    replace,
    release,
    changed: () => changed,
    recognizes: (emission: Emission) => commands.has(emission),
    apply: (emission: Emission, accepted: boolean) => {
      const commit = commands.get(emission);
      if (!commit) return false;
      commands.delete(emission);
      if (accepted) commit();
      return true;
    },
  };
}
