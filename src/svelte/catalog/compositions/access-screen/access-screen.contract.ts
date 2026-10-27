// The props of AccessScreen: the product name, the access client that authenticates and refreshes, and its current
// snapshot (access state, last error, whether a request is in flight).
import { Type } from "@sinclair/typebox";
import type { AccessClient, BrowserAccessState } from "../../../../web/client/access.ts";

export const AccessScreenContract = {
  props: Type.Object({
    productLabel: Type.String(),
    current: Type.Object({
      state: Type.Unsafe<BrowserAccessState>(),
      error: Type.Union([Type.String(), Type.Null()]),
      busy: Type.Boolean(),
    }, { additionalProperties: false }),
    client: Type.Unsafe<AccessClient>(),
  }, { additionalProperties: false }),
} as const;
