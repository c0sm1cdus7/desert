// Admin-only invitation recovery and key revocation use the normal identity action engine.
import { oneOf, option, text } from "../../fields/fields.ts";
import { object } from "../../fields/visible-text.ts";
import { issueInvitation } from "../../house/doors/door-material.ts";
import { effect } from "../../house/facts.ts";
import { mindTool } from "../../house/kit.ts";
import { doorTexts as words } from "../../texts/doors.texts.ts";
import { identityTexts } from "../../texts/identities.texts.ts";
import { programAct } from "../promises.ts";
import type { Program } from "../tool-contract.ts";
import { invitationCases, revocationCases } from "./door-cases.ts";
import { redeemInvitationAction } from "./door-redemption-action.ts";
import { targetIdentity } from "./identity-reading.ts";
function inviteAction<X extends Program>() {
  const invitation = object({
    door: oneOf(words.door, option("agente", words.agent, "a"), option("terminal", words.terminal, "t")),
  });
  return programAct<X, typeof invitation>({
    ...words.invitation,
    input: invitation,
    on: "thing",
    undoable: true,
    refuses: [identityTexts.only, words.absent, identityTexts.ownActions],
    offered: ({ house }, target) => {
      if (mindTool(targetIdentity(target))) return identityTexts.ownActions;
      return house.grants.has(targetIdentity(target)) ? undefined : words.absent;
    },
    run: ({ door }, { by, target, at }) => {
      const invitation = issueInvitation(targetIdentity(target), door, by, at);
      return {
        status: "accepted",
        text: words.issued,
        private: words.receipt(invitation.code),
        effects: [invitation.fact],
      };
    },
    cases: invitationCases<X>(),
  });
}
function revokeAction<X extends Program>() {
  const revoke = object({ key: text(words.key, words.key) });
  return programAct<X, typeof revoke>({
    ...words.revoke,
    input: revoke,
    on: "thing",
    undoable: false,
    refuses: [identityTexts.only, words.noKey, identityTexts.ownActions],
    offered: (_, target) => (mindTool(targetIdentity(target)) ? identityTexts.ownActions : undefined),
    confirms: () => words.sureRevoke,
    stops: ({ key }, { house }, target) => {
      if (typeof key !== "string") return undefined;
      const found = house.doors.keys.get(key);
      return found && !found.revoked && found.identity === targetIdentity(target) ? undefined : words.noKey;
    },
    run: ({ key }, { by }) => ({
      status: "accepted",
      text: words.revoked,
      effects: [effect("door-key-revoked", { key }, by)],
    }),
    cases: revocationCases<X>(),
  });
}
export const doorActions = <X extends Program>() => ({
  invite: inviteAction<X>(),
  "revoke-key": revokeAction<X>(),
  "redeem-invitation": redeemInvitationAction<X>(),
});
