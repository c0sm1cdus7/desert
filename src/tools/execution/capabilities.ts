import type { Emission } from "../../journal/events.ts";
import type { CredentialScope, ToolCapabilities } from "../capabilities-contract.ts";
/** Internal lifetime of the public methods lent to one action or startup. */
export type CapabilityLease = ToolCapabilities &
  Readonly<{ close(): void; together<T>(work: () => T): T; apply(emission: Emission, accepted: boolean): boolean }>;
export type CapabilityFactory = (scope: CredentialScope) => CapabilityLease;
const denied = (): never => {
  throw new Error("E-CREDENTIAL-DENIED");
};
export const noCapabilities: ToolCapabilities = Object.freeze({
  ports: Object.freeze({}),
  credentials: Object.freeze({ current: () => undefined, revision: () => 0, replace: denied, release: denied }),
});
