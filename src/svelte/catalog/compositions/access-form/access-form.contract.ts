// The props of AccessForm: `mode` (create an identity or unlock one), `busy` while a request is in flight, the product
// name, optionally the appearance `preferences` the caller owns, and `onsubmit`, awaited with the access input. The
// `onappearancechange` event is raised when the person picks another appearance (without it the form saves it itself).
import { Type } from "@sinclair/typebox";
import type { AccessInput } from "../../../../identity/contract.ts";
import type { AppearancePreferences } from "../../../infra/appearance-preferences.ts";

export const AccessFormContract = {
  props: Type.Object({
    mode: Type.Union([Type.Literal("initialize"), Type.Literal("signIn")]),
    busy: Type.Optional(Type.Boolean()),
    productLabel: Type.Optional(Type.String()),
    preferences: Type.Optional(Type.Union([Type.Unsafe<AppearancePreferences>(), Type.Undefined()])),
    onsubmit: Type.Function([Type.Unsafe<AccessInput<"initialize">>()], Type.Promise(Type.Void())),
  }, { additionalProperties: false }),
  events: Type.Object({
    appearancechange: Type.Unsafe<AppearancePreferences>(),
  }, { additionalProperties: false }),
} as const;
