import type { PoolClient } from "pg";
import { freezeDeep } from "../json.ts";
import type { PreflightOptions, PreflightResult } from "../preflight.ts";
import type { LocalProgram } from "./program.ts";
import { ownedObject } from "./records.ts";
import { matchesConditions } from "./conditions.ts";

export async function preflightMutation(client: PoolClient, program: LocalProgram, actor: string,
  surface: string, journeyId: string, input: unknown, options: PreflightOptions): Promise<PreflightResult> {
  const journey = program.journey(surface, journeyId);
  if (journey.kind !== "mutation") throw new Error("NOT_A_MUTATION_JOURNEY");
  const command = journey.command;
  const blockers: PreflightResult["blockers"][number][] = [];
  if (command.kind === "create") {
    if (options.subject !== undefined) throw new Error("UNEXPECTED_SUBJECT");
    if (options.expectedVersion !== undefined) throw new Error("INVALID_EDIT_BASE");
  } else {
    if (options.subject === undefined) throw new Error("SUBJECT_REQUIRED");
    const record = await ownedObject(client, program, actor, command.object, options.subject, false);
    if (!matchesConditions(record.facts, command.when)) blockers.push("PRECONDITION_FAILED");
    if (command.input.length && options.expectedVersion === undefined) blockers.push("EDIT_BASE_REQUIRED");
    if (options.expectedVersion !== undefined && options.expectedVersion !== record.version) blockers.push("VERSION_CONFLICT");
  }
  const validation = program.application.validateInput(command.id, input);
  const missing = validation.issues.filter(issue => issue.keyword === "required")
    .map(issue => String(issue.params?.missingProperty)).sort();
  const issues = validation.issues.filter(issue => issue.keyword !== "required");
  // Frozen in place: JSON issue parameters make Frozen<PreflightResult> unbounded, and the declared type is already readonly.
  const result: PreflightResult = { journeyId, contractDigest: program.application.digest,
    status: blockers.length ? "blocked" : issues.length ? "invalid" : missing.length ? "incomplete" : "ready",
    missing, issues, blockers };
  freezeDeep(result);
  return result;
}
