// The props of CatalogNavigation: none. It is retired (the shell draws the navigation pane from data) and draws nothing.
import { Type } from "@sinclair/typebox";

export const CatalogNavigationContract = {
  props: Type.Object({}, { additionalProperties: false }),
} as const;
