import { Type } from "@sinclair/typebox";

export const RuntimeConnectionPolicy = Object.freeze({
  availability: "journey-dependencies",
  draftRetention: "session-memory",
  reconnect: "refresh-without-replay",
} as const);

export const ConnectionPolicySchema = Type.Object({
  availability: Type.Literal(RuntimeConnectionPolicy.availability),
  draftRetention: Type.Literal(RuntimeConnectionPolicy.draftRetention),
  reconnect: Type.Literal(RuntimeConnectionPolicy.reconnect),
}, { additionalProperties: false });

export function runtimeConnectionPolicyFor(definition: object) {
  if (Object.hasOwn(definition, "connection")) throw new Error("SURFACE_CONNECTION_POLICY_FORBIDDEN");
  return RuntimeConnectionPolicy;
}
