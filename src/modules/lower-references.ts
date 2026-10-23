import { declarationArray, declarationRecord } from "./declaration-data.ts";
import { moduleKinds } from "./references.ts";
import type { ReferenceAdmission } from "./admission.ts";
import { authoredActivity, type ActivityDefinition } from "../activities/authoring.ts";

/** The only lowering pass. It runs after identity admission, before canonical JSON/schema checks. */
export function lowerOwnedReferences(source: Record<string, unknown>, admission: ReferenceAdmission) {
  const resolve = (target: unknown, kind: "view" | "journey" | "destination", execution = false) =>
    admission.admit(target, kind, kind === "journey" ? execution ? "execution" : "navigation" : "reference").id;
  function view(value: unknown) {
    const item = declarationRecord(value);
    return { ...item, ...Object.fromEntries(["leftDock", "rightDock"].filter(key => Object.hasOwn(item, key)).map(key => {
      const dock = declarationRecord(item[key]);
      return [key, { ...dock, view: resolve(dock.view, "view") }];
    })) };
  }
  function presentation(value: unknown) {
    const item = declarationRecord(value);
    return {
      ...item,
      ...Object.fromEntries(["view", "detailView"].filter(key => Object.hasOwn(item, key)).map(key => [key, resolve(item[key], "view")])),
      ...(Object.hasOwn(item, "source") ? { source: admission.admit(item.source, "journey", "read-source").id } : {}),
      ...(Object.hasOwn(item, "initializeFrom") ? { initializeFrom: { ...declarationRecord(item.initializeFrom),
        source: admission.admit(declarationRecord(item.initializeFrom).source, "journey", "read-source").id } } : {}),
      ...(Object.hasOwn(item, "collections") ? { collections: declarationArray(item.collections).map(value => {
        const binding = declarationRecord(value);
        const preview = binding.preview === undefined ? undefined : declarationRecord(binding.preview);
        return { ...binding, read: admission.admit(binding.read, "journey", "read-source").id,
          ...(preview ? { preview: { ...preview, read: admission.admit(preview.read, "journey", "read-source").id } } : {}) };
      }) } : {}),
      ...(Object.hasOwn(item, "related") ? { related: declarationArray(item.related).map(value => {
        const binding = declarationRecord(value);
        const membership = binding.membership === undefined ? undefined : declarationRecord(binding.membership);
        return { ...binding, read: admission.admit(binding.read, "journey", "read-source").id,
          ...(membership ? { membership: { ...membership, update: admission.admit(membership.update, "journey", "execution").id } } : {}) };
      }) } : {}),
      ...(item.kind === "activity" ? { activity: authoredActivity(item.activity as ActivityDefinition,
        value => resolve(value, "journey", true), value => resolve(value, "view")) } : {}),
      outputs: declarationArray(item.outputs).map(value => {
        const output = declarationRecord(value), action = declarationRecord(output.action);
        return { ...output, view: resolve(output.view, "view"), action: action.kind === "journey"
          ? { ...action, journey: resolve(action.journey, "journey") } : action };
      }),
    };
  }
  function object(value: unknown) {
    const item = declarationRecord(value);
    if (!Object.hasOwn(item, "presentation")) return item;
    const publication = declarationRecord(item.presentation);
    return { ...item, presentation: { ...publication, view: resolve(publication.view, "view"),
      actions: declarationArray(publication.actions).map(value => {
        const action = declarationRecord(value);
        return { ...action, journey: resolve(action.journey, "journey", true) };
      }) } };
  }
  const transforms = {
    objects: object, views: view,
    journeys: (value: unknown) => {
      const registration = declarationRecord(value);
      return { ...registration, ...(Object.hasOwn(registration, "presentation")
        ? { presentation: presentation(registration.presentation) } : {}) };
    },
    destinations: (value: unknown) => {
      const destination = declarationRecord(value);
      return { ...destination, entryJourney: resolve(destination.entryJourney, "journey") };
    },
  };
  return { ...source, ...Object.fromEntries(Object.entries(transforms).filter(([key]) => Object.hasOwn(source, key))
    .map(([key, transform]) => [key, declarationArray(source[key]).map(transform)])),
    ...(Object.hasOwn(source, "exports") ? { exports: Object.fromEntries(moduleKinds
      .filter(kind => Object.hasOwn(declarationRecord(source.exports), kind))
      .map(kind => [kind, Object.values(admission.aliases()[kind]).map(entry => entry.id)])) } : {}),
  };
}

export function lowerProductReferences(source: Record<string, unknown>, admission: ReferenceAdmission) {
  return { ...lowerOwnedReferences(source, admission),
    workspace: admission.admit(source.workspace, "view").id,
    entry: admission.admit(source.entry, "destination").id,
    navigation: declarationArray(source.navigation).map(value => {
      const item = declarationRecord(value);
      return { ...item, destination: admission.admit(item.destination, "destination").id };
    }),
    surfaces: declarationArray(source.surfaces).map(value => {
      const item = declarationRecord(value);
      return { ...item, journeys: declarationArray(item.journeys).map(target => admission.admit(target, "journey", "execution").id) };
    }),
  };
}
