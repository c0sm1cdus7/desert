import type { Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { HeadingContract } from "./heading.contract.ts";

/** Meaning determines the owner's type role: the contract is the one schema, and this rejects anything outside it at
 * runtime (CSS, markup, a level, a prop of another kind, a symbol key). Raises INVALID_HEADING_CONTENT. */
export type HeadingContent = Static<typeof HeadingContract.props>;
export function assertHeadingContent(value: unknown): asserts value is HeadingContent {
  if (!value || typeof value !== "object" || Reflect.ownKeys(value).some(key => typeof key === "symbol")
    || !Check(HeadingContract.props, value)) throw new Error("INVALID_HEADING_CONTENT");
}
