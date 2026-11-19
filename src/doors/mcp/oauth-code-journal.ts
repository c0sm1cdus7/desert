// Persist only code digests and key IDs; replay detection uses fixed-size cryptographic comparisons.
import { effect } from "../../house/facts.ts";
import { credentialEqual } from "../../house/doors/credential-equal.ts";
import type { House } from "../../house/members.ts";
import type { DoorBus } from "../../runtime/door-access.ts";
export function oauthCodeJournal(bus: DoorBus, state: () => House) {
  return {
    issue: (fingerprint: string, key: string) =>
      bus.together(() => bus.emit(effect("door-oauth-issued", { fingerprint, key }, state().admin))),
    deliver: (fingerprint: string) =>
      bus.together(() => bus.emit(effect("door-oauth-delivered", { fingerprint }, state().admin))),
    find: (fingerprint: string) => {
      let found: string | undefined;
      for (const code of state().doors.codes.values())
        if (credentialEqual(code.fingerprint, fingerprint)) found = code.key;
      return found;
    },
    active: () =>
      [...state().doors.codes.values()].filter(code => state().doors.keys.get(code.key)?.revoked === false).length,
  };
}
export type OAuthCodeJournal = ReturnType<typeof oauthCodeJournal>;
