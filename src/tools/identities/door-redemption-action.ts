// The catalog guides administrators; only the invitation presenter receives a scoped private delivery.
import { meant } from "../../fields/phrases.ts";
import { redemptionRecipient } from "./redemption-recipient.ts";
import { text } from "../../fields/fields.ts";
import { object } from "../../fields/visible-text.ts";
import { issueDoorKey } from "../../house/doors/door-material.ts";
import { effect } from "../../house/facts.ts";
import { mindTool } from "../../house/kit.ts";
import { doorTexts as words } from "../../texts/doors.texts.ts";
import { identityTexts } from "../../texts/identities.texts.ts";
import { programAct } from "../promises.ts";
import type { Program } from "../tool-contract.ts";
import { targetIdentity } from "./identity-reading.ts";
export function redeemInvitationAction<X extends Program>() {
  return programAct<X, ReturnType<typeof input>>({
    ...words.redeem,
    input: input(),
    on: "thing",
    undoable: true,
    refuses: [identityTexts.only, words.noInvitation, identityTexts.ownActions],
    offered: (_, target) => (mindTool(targetIdentity(target)) ? identityTexts.ownActions : undefined),
    stops: ({ invitation }, { house }, target, at) => {
      const found = typeof invitation === "string" ? house.doors.invitations.get(invitation) : undefined;
      return found &&
        !found.redeemed &&
        at < found.expires &&
        found.identity === targetIdentity(target) &&
        house.grants.has(found.identity)
        ? undefined
        : words.noInvitation;
    },
    run: ({ invitation }, { state, by }) => {
      const found = state.house.doors.invitations.get(invitation);
      if (!found) throw new Error(meant(words.noInvitation));
      const recipient = redemptionRecipient(invitation);
      if (!recipient) return { status: "accepted", text: words.guided, effects: [] };
      const issued = issueDoorKey(found.identity, found.door, by, recipient.material, recipient.oauth);
      recipient.deliver(issued.material);
      return {
        status: "accepted",
        text: words.redeemed,
        effects: [issued.fact, effect("door-invitation-redeemed", { invitation, key: issued.fact.data.id }, by)],
      };
    },
    cases,
  });
}
const input = () => object({ invitation: text(words.invitationId, words.invitationId) });

const cases = [
  {
    promise: words.promises.redeemed,
    on: "identities/beto",
    given: [{ invitation: { id: "case-invitation", identity: "beto" } }],
    input: { invitation: "case-invitation" },
    then: { says: words.guided, facts: [] },
  },
  {
    promise: words.promises.missingInvitation,
    on: "identities/beto",
    input: { invitation: "missing" },
    then: { refused: words.noInvitation },
  },
  {
    promise: words.promises.redeemAdmin,
    by: "beto",
    on: "identities/beto",
    input: { invitation: "missing" },
    then: { refused: identityTexts.only },
  },
  {
    promise: words.promises.expiredInvitation,
    on: "identities/beto",
    given: [{ invitation: { id: "case-invitation", identity: "beto" } }, { days: 2 }],
    input: { invitation: "case-invitation" },
    then: { refused: words.noInvitation },
  },
] as const;
