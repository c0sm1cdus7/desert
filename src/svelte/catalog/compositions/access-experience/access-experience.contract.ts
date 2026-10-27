// The props of AccessExperience: the product name, the access snapshot (state, last error, whether a request is in
// flight), the profile remembered on this device, the access client's `authenticate` and `refresh`, and optionally the
// appearance `preferences` the caller owns with `onappearancechange`, raised when the person picks another appearance.
import { Type } from "@sinclair/typebox";
import type { AccessClient, BrowserAccessState } from "../../../../web/client/access.ts";
import type { AccessProfile } from "../../../infra/access-profile.ts";
import type { AppearancePreferences } from "../../../infra/appearance-preferences.ts";

export const AccessExperienceContract = {
  props: Type.Object({
    productLabel: Type.String(),
    current: Type.Object({
      state: Type.Unsafe<BrowserAccessState>(),
      error: Type.Union([Type.String(), Type.Null()]),
      busy: Type.Boolean(),
    }, { additionalProperties: false }),
    profile: Type.Optional(Type.Union([Type.Unsafe<AccessProfile>(), Type.Null()])),
    preferences: Type.Optional(Type.Union([Type.Unsafe<AppearancePreferences>(), Type.Undefined()])),
    authenticate: Type.Unsafe<AccessClient["authenticate"]>(),
    refresh: Type.Unsafe<AccessClient["refresh"]>(),
  }, { additionalProperties: false }),
  events: Type.Object({
    appearancechange: Type.Unsafe<AppearancePreferences>(),
  }, { additionalProperties: false }),
} as const;
