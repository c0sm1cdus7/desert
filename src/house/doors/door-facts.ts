// Door credentials and invitations persist only fingerprints, never their bearer material.
import { Type } from "@sinclair/typebox";
import { object } from "../../fields/visible-text.ts";
import { name } from "../own-acts.ts";
const fingerprint = Type.String({ pattern: "^[a-f0-9]{64}$" });
export const doorKind = Type.Union([Type.Literal("agente"), Type.Literal("terminal")]);
export const doorFacts = {
  "door-key-issued": object({ id: name, identity: name, door: doorKind, fingerprint }),
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
