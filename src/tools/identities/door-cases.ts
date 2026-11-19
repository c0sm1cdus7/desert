// Declared cases cover identity door administration and its refusal boundaries.
import { doorTexts as words } from "../../texts/doors.texts.ts";
import { identityTexts } from "../../texts/identities.texts.ts";
import type { Case } from "../promises.ts";
import type { Program } from "../tool-contract.ts";
type InvitationCase<X extends Program> = Case<X> & { input: { door: "agent" | "terminal" } };
type RevokeCase<X extends Program> = Case<X> & { input: { key: string } };
export const invitationCases = <X extends Program>(): readonly [InvitationCase<X>, ...InvitationCase<X>[]] => [
  {
    promise: words.promises.invited,
    on: "identities/beto",
    input: { door: "agent" },
    then: { says: words.issued, facts: [] },
  },
  {
    promise: words.promises.inviteAdmin,
    by: "beto",
    on: "identities/beto",
    input: { door: "terminal" },
    then: { refused: identityTexts.only },
  },
  {
    promise: words.promises.inviteAbsent,
    on: "identities/beto",
    given: [{ act: "remove", on: "identities/beto", input: {} }],
    input: { door: "agent" },
    then: { refused: words.absent },
  },
];
export const revocationCases = <X extends Program>(): readonly [RevokeCase<X>, ...RevokeCase<X>[]] => [
  {
    promise: words.promises.revoked,
    given: [{ doorKey: { id: "test-key", identity: "beto", door: "agent" } }],
    on: "identities/beto",
    input: { key: "test-key" },
    then: { says: words.revoked, facts: [], sure: words.sureRevoke },
  },
  {
    promise: words.promises.revokeAdmin,
    by: "beto",
    on: "identities/beto",
    input: { key: "test-key" },
    then: { refused: identityTexts.only },
  },
  {
    promise: words.promises.unknownKey,
    on: "identities/beto",
    input: { key: "missing" },
    then: { refused: words.noKey },
  },
];
