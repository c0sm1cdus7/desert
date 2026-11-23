// Reports every runtime composition problem with a stable reason and path before building any maps.
import { meant } from "../../fields/phrases.ts";
import { distributionContractIssues } from "./program-contracts.ts";
import { contractTexts } from "../../texts/contracts.texts.ts";
import { distributionTexts } from "../../texts/distributions.texts.ts";
import { DESERT_CONTRACT } from "../../tools/installable/program.ts";
import type { CompositionOptions } from "./validation-types.ts";
export type CompositionIssue = Readonly<{
  path: string;
  reason: string;
}>;
export class CompositionError extends Error {
  readonly issues: readonly CompositionIssue[];
  constructor(issues: readonly CompositionIssue[]) {
    super([meant(distributionTexts.failed), ...issues.map(issueText)].join("\n"));
    this.name = "CompositionError";
    this.issues = Object.freeze(issues.map(issue => Object.freeze({ ...issue })));
  }
}
type Add = (path: string, reason: CompositionIssue["reason"]) => void;
type Program = CompositionOptions["programs"][number];
const validId = (id: string) => /^[a-z][a-z0-9.-]*$/.test(id);
function programIssues(program: Program, ids: Set<string>, facts: Set<string>, add: Add): void {
  for (const dependency of program.dependencies ?? [])
    if (dependency.kind === "distribution")
      add(`${program.id}/dependencies/${dependency.name}`, "distribution-dependency");
  if (program.desert !== DESERT_CONTRACT) add(`${program.id}/desert`, "desert-contract");
  if (ids.has(program.id)) add(`programs/${program.id}`, "duplicate-id");
  // `supervisor` is reserved: its mind would be the house supervisor's actor, mind:supervisor.
  if (!validId(program.id) || ["identities", "preferences", "me", "supervisor"].includes(program.id))
    add(`programs/${program.id}`, "invalid-id");
  ids.add(program.id);
  for (const fact of program.facts) {
    if (facts.has(fact.kind)) add(`facts/${fact.kind}`, "duplicate-fact");
    facts.add(fact.kind);
    if (!fact.kind.startsWith(`${program.id}/`) || fact.kind === `${program.id}/`)
      add(`${program.id}/facts/${fact.kind}`, "foreign-fact");
  }
  for (const [name, group] of Object.entries(program.tools)) {
    if (!validId(name)) add(`${program.id}/tools/${name}`, "invalid-id");
    Object.keys(group.acts)
      .filter(action => !validId(action))
      .forEach(action => add(`${program.id}/tools/${name}/actions/${action}`, "invalid-id"));
    if (group.effects !== undefined) add(`${program.id}/tools/${name}/effects`, "unsupported-reactions");
  }
  if (program.effects !== undefined) add(`${program.id}/effects`, "unsupported-reactions");
}
export function diagnose(options: CompositionOptions): readonly CompositionIssue[] {
  const issues: CompositionIssue[] = [];
  const add: Add = (path, reason) => {
    issues.push({ path, reason });
  };
  const ids = new Set<string>();
  const facts = new Set<string>();
  for (const program of options.programs) programIssues(program, ids, facts, add);
  const minds = new Set<string>();
  for (const id of options.minds.programs) {
    if (!ids.has(id)) add(`minds/programs/${id}`, "missing-mind");
    if (minds.has(id)) add(`minds/programs/${id}`, "duplicate-mind");
    minds.add(id);
  }
  if (options.minds.assistants && !options.identities) add("minds/assistants", "assistants-require-identities");
  issues.push(...distributionContractIssues(options.programs, options.contracts));
  return [...new Map(issues.map(issue => [`${issue.path}:${issue.reason}`, issue])).values()];
}

function issueText(issue: CompositionIssue): string {
  const known = Object.entries(distributionTexts.reasons).find(([reason]) => reason === issue.reason)?.[1];
  const message = known === undefined ? `${meant(contractTexts.invalidComposition)} (${issue.reason})` : meant(known);
  return `${issue.path}: ${message}`;
}
