import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { CustodyError } from "./house-keys.ts";
import type { SecretRef } from "./custody-contract.ts";
export const factSchema = Type.Object({
  authentication: Type.Optional(Type.String()),
  batchSize: Type.Optional(Type.Integer({ minimum: 1 })),
  batchIndex: Type.Optional(Type.Integer({ minimum: 0 })),
  id: Type.String(),
  kind: Type.Union([
    Type.Literal("credential-bound"),
    Type.Literal("credential-unusable"),
    Type.Literal("credential-released"),
    Type.Literal("credential-cleanup-pending"),
    Type.Literal("credential-purged"),
  ]),
  actor: Type.String(),
  tool: Type.String(),
  target: Type.String(),
  slot: Type.String(),
  revision: Type.Integer({ minimum: 0 }),
  cause: Type.String(),
  refs: Type.Record(Type.String(), Type.TemplateLiteral("secret:${string}")),
});
export function factFrom(body: unknown): Static<typeof factSchema> {
  try {
    const value: unknown = typeof body === "string" ? JSON.parse(body) : undefined;
    if (!Value.Check(factSchema, value)) throw new CustodyError("E-CUSTODY-INTEGRITY");
    return value;
  } catch {
    throw new CustodyError("E-CUSTODY-INTEGRITY");
  }
}
export const secretRef = (value: unknown): value is SecretRef =>
  typeof value === "string" && /^secret:[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/u.test(value);
