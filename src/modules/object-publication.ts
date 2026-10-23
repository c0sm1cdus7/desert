import type { OwnedDefinitions } from "./types.ts";
import type { ObjectPresentation } from "../views/object-presentation.ts";
import { resolvedPublicationIssue } from "../views/publication-semantics.ts";
import { validatePublishedFields } from "./human-presentation.ts";

/** Publication references are resolved against the same module-owned registries. */
export function validateObjectPublications(owner: OwnedDefinitions): void {
  for (const object of owner.objects ?? []) {
    const publication = object.presentation;
    if (!publication) continue;
    validatePublishedFields(object, publication.fields ?? []);
    if (!owner.views?.some(view => view.id === publication.view)) throw new Error("UNKNOWN_OBJECT_VIEW");
    const journeys = publication.actions.map(({ journey: id }) => {
      const journey = owner.journeys?.find(item => item.execution?.id === id)?.execution;
      if (!journey) throw new Error("UNKNOWN_OBJECT_JOURNEY");
      return journey;
    });
    const issue = resolvedPublicationIssue(object, publication, journeys);
    if (issue) throw new Error(issue);
  }
}

export function objectPublications(owners: readonly OwnedDefinitions[]): readonly ObjectPresentation[] {
  return owners.flatMap(owner => (owner.objects ?? []).flatMap(object => {
    if (!object.presentation) return [];
    const { fields, ...presentation } = object.presentation;
    return [{ object: object.id, ...presentation }];
  }));
}

/** Presentation never participates in domain persistence or execution digests. */
export function canonicalObjects(owners: readonly OwnedDefinitions[]) {
  return owners.flatMap(owner => (owner.objects ?? []).map(({ id, facts }) => ({ id, facts })));
}
