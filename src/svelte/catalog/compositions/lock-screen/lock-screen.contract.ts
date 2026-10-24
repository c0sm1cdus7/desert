// The props of LockScreen: the `profile` remembered on this device (null to ask for the identity name), `busy` while a
// request is in flight, and `onsubmit`, awaited with the sign-in input.
import { Type } from "@sinclair/typebox";
import type { AccessInput } from "../../../../identity/contract.ts";
import type { AccessProfile } from "../../../infra/access-profile.ts";

export const LockScreenContract = {
  props: Type.Object({
    profile: Type.Optional(Type.Union([Type.Unsafe<AccessProfile>(), Type.Null()])),
    busy: Type.Optional(Type.Boolean()),
    onsubmit: Type.Function([Type.Unsafe<AccessInput<"signIn">>()], Type.Promise(Type.Void())),
  }, { additionalProperties: false }),
} as const;
