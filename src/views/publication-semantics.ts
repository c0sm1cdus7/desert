import type { ObjectDefinition } from "../contracts.ts";
import type { Frozen } from "../json.ts";
import type { JourneyDefinition } from "../program-grammar.ts";
import type { ObjectPresentation } from "./object-presentation.ts";

type Publication = Pick<ObjectPresentation, "title" | "actions">;

/** Shared invariants apply equally to authored definitions and serialized references. */
export function publicationReferenceIssue(objectId: string, publication: Publication) {
  if (publication.title.object !== objectId) return "FOREIGN_OBJECT_TITLE";
  const actions = new Set<string>();
  const selections = new Set<string>();
  for (const { journey, selection } of publication.actions) {
    if (actions.has(journey)) return "DUPLICATE_OBJECT_JOURNEY";
    actions.add(journey);
    if (selection) {
      if (selection.fact.object !== objectId) return "FOREIGN_SELECTION_FACT";
      const key = `${selection.fact.field}:${selection.value}`;
      if (selections.has(key)) return "DUPLICATE_SELECTION_VALUE";
      selections.add(key);
    }
  }
  return undefined;
}

/** A subject is present only for a canonical update, never a read or creation. */
export function publicationSubjectIssue(objectId: string, subject: string | undefined) {
  return subject === objectId ? undefined : "INVALID_OBJECT_SUBJECT_JOURNEY";
}

/** The caller owns registry resolution; presentation cannot acquire missing definitions. */
export function resolvedPublicationIssue(object: Frozen<ObjectDefinition>, publication: Publication,
  journeys: readonly Frozen<JourneyDefinition>[]) {
  const references = publicationReferenceIssue(object.id, publication);
  if (references) return references;
  const field = object.facts[publication.title.field];
  if (!field) return "UNKNOWN_OBJECT_TITLE_FIELD";
  if (field.kind === "principal" || field.kind === "asset" || field.kind === "labels") return "INVALID_OBJECT_TITLE_FIELD";
  for (const journey of journeys) {
    const subject = journey.kind === "mutation" && journey.command.kind === "update" ? journey.command.object : undefined;
    const issue = publicationSubjectIssue(object.id, subject);
    if (issue) return issue;
    const selection = publication.actions.find(action => action.journey === journey.id)?.selection;
    if (selection) {
      const field = object.facts[selection.fact.field];
      const effect = journey.kind === "mutation" && journey.command.kind === "update" ? journey.command.set[selection.fact.field] : undefined;
      if (field?.kind !== "enum" || !field.values.includes(selection.value) || !effect || effect.kind !== "literal" || effect.value !== selection.value ||
        journey.kind !== "mutation" || journey.command.input.length) return "INVALID_SELECTION_COMMAND";
    }
  }
  return undefined;
}
