import { getContext, setContext } from "svelte";
import type { AccessClient } from "../../web/client/access.ts";
type AccessContext = { client: AccessClient; snapshot: AccessClient["snapshot"] };
const context = Symbol("desert.access");
export function provideAccess(value: AccessContext) { setContext(context, value); }
export function useAccess() { return getContext<AccessContext | undefined>(context); }
