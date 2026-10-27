import type { PoolClient } from "pg";
import type { LocalProgram } from "./program.ts";
import type { Facts } from "./types.ts";
import { ownedObjects } from "./records.ts";
import { requireUUID } from "./types.ts";

type Target = { media?: string; memberOf?: string; where?: Readonly<Record<string, string>> };

/** Both prepare and commit reauthenticate targets under the same canonical owner policy: each referenced type is read
 * once from its generated table, locked in type then id order, and every target must be the actor's (Postgres also
 * refuses a dangling reference through the join table's foreign keys). */
export async function validateReferences(client: PoolClient, program: LocalProgram, actor: string, type: string, facts: Facts, subject: string) {
  const targets = new Map<string, Map<string, Target[]>>();
  for (const [name, field] of Object.entries(program.objects.get(type)?.facts ?? {})) {
    if (field.kind !== "labels" || !field.reference) continue;
    const value = facts[name];
    if (!Array.isArray(value)) throw new Error("INVALID_REFERENCE_VALUE");
    const reference = field.reference, target: Target = "media" in reference ? { media: reference.media,
      ...(reference.memberOf ? { memberOf: reference.memberOf } : {}), ...(reference.where ? { where: reference.where } : {}) } : {};
    const byId = targets.get(reference.object) ?? new Map<string, Target[]>();
    for (const id of value) { requireUUID(id); byId.set(id, [...byId.get(id) ?? [], target]); }
    if (byId.size) targets.set(reference.object, byId);
  }
  for (const [targetType, byId] of [...targets].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)) {
    const records = new Map((await ownedObjects(client, program, actor, targetType, { ids: [...byId.keys()], lock: true }))
      .map(record => [record.id, record]));
    for (const [id, checks] of [...byId].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)) {
      const record = records.get(id);
      if (!record) throw new Error("NOT_FOUND");
      for (const target of checks) {
        if (target.media) {
          const asset = record.facts[target.media];
          if (!asset || typeof asset !== "object" || !("kind" in asset) || asset.kind !== "asset" || ("media" in asset && asset.media !== "image")) {
            throw new Error("INVALID_REFERENCE_MEDIA");
          }
        }
        if (target.memberOf) {
          const members = record.facts[target.memberOf];
          if (!Array.isArray(members) || !members.includes(subject)) throw new Error("INVALID_REFERENCE_MEMBERSHIP");
        }
        if (Object.entries(target.where ?? {}).some(([name, value]) => record.facts[name] !== value)) throw new Error("INVALID_REFERENCE_TARGET");
      }
    }
  }
}
