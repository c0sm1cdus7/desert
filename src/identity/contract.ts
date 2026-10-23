import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { jsonSnapshot } from "../json.ts";

const closed = { additionalProperties: false };
const Login = Type.String({ pattern: "^[a-z][a-z0-9._-]{2,63}$", maxLength: 64 });
const Password = Type.String({ minLength: 12, maxLength: 256 });
const AvatarSeed = Type.String({ pattern: "^[a-f0-9]{16}$" });
const CreateIdentity = Type.Object({ login: Login,
  displayName: Type.String({ minLength: 1, maxLength: 200, pattern: "\\S" }), password: Password,
  avatarSeed: Type.Optional(AvatarSeed) }, closed);
export const SessionRequests = {
  initialize: CreateIdentity,
  signIn: Type.Object({ login: Login, password: Type.String({ minLength: 1, maxLength: 256 }) }, closed),
  lock: Type.Object({}, closed),
};
export const AccessRequests = {
  ...SessionRequests,
  createIdentity: CreateIdentity,
  disableIdentity: Type.Object({ identityId: Type.String({ pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$" }) }, closed),
};
export type AccessMethod = keyof typeof AccessRequests;
export type AccessInput<K extends AccessMethod> = Static<(typeof AccessRequests)[K]>;
export const HumanIdentitySchema = Type.Object({ kind: Type.Literal("human"),
  id: Type.String({ pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$" }), displayName: Type.String({ minLength: 1 }), login: Login,
  role: Type.Union([Type.Literal("administrator"), Type.Literal("member")]), avatarSeed: Type.Optional(AvatarSeed) }, closed);
export const AccessStateSchema = Type.Union([
  Type.Object({ kind: Type.Literal("onboarding") }, closed), Type.Object({ kind: Type.Literal("locked") }, closed),
  Type.Object({ kind: Type.Literal("ready"), identity: HumanIdentitySchema,
    sessionBinding: Type.String({ pattern: "^[A-Za-z0-9_-]{43}$" }) }, closed),
]);
export const IdentityDirectorySchema = Type.Array(Type.Object({ ...HumanIdentitySchema.properties, disabled: Type.Boolean() }, closed));
export type IdentityDirectory = Static<typeof IdentityDirectorySchema>;
export type HumanIdentity = Readonly<Static<typeof HumanIdentitySchema>>;
export type AccessState = Readonly<Static<typeof AccessStateSchema>>;
export type HumanCredential = Readonly<{ identity: HumanIdentity; token: string }>;

export function accessInput<K extends AccessMethod>(method: K, value: unknown): AccessInput<K> {
  try {
    const snapshot = jsonSnapshot(value);
    if (Value.Check(AccessRequests[method], snapshot)) return snapshot as AccessInput<K>;
  } catch {}
  throw new Error("INVALID_ACCESS_REQUEST");
}
