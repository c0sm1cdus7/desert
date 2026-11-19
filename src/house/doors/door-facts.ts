// Door credentials and invitations persist only fingerprints, never their bearer material.
import { Type } from "@sinclair/typebox";
import { object } from "../../fields/visible-text.ts";
import { name } from "../own-acts.ts";
const fingerprint = Type.String({ pattern: "^[a-f0-9]{64}$" });
export const doorKind = Type.Union([Type.Literal("agent"), Type.Literal("terminal")]);
export const doorFacts = {
  "door-key-issued": object({
    id: name,
    identity: name,
    door: doorKind,
    fingerprint,
    oauth: Type.Optional(Type.Literal(true)),
    length: Type.Optional(Type.Integer({ minimum: 1 })),
  }),
  "door-oauth-issued": object({ fingerprint, key: name }),
  "door-oauth-delivered": object({ fingerprint }),
  "door-key-revoked": object({ key: name }),
  "door-invitation-issued": object({
    id: name,
    identity: name,
    door: doorKind,
    fingerprint,
    expires: Type.Integer({ minimum: 0 }),
  }),
  "door-invitation-redeemed": object({ invitation: name, key: name }),
};
