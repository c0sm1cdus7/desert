import { objectType, text, enumeration } from "../../src/index.ts";
import { compilePublicCatalog, type PublicCatalogDefinition } from "../../src/public-catalog/index.ts";
import { loadAppleReference } from "./reference.ts";
import { travelKit } from "./exercises.ts";

const continents = ["Asia", "Africa", "Antarctica", "Australia/Oceania", "Europe", "North America", "South America"] as const;
export const Landmark = objectType({
  id: "landmark",
  facts: { title: text({ minLength: 1 }), description: text({ minLength: 1 }), continent: enumeration([...continents]) },
});

/** Author declares public data and its meaning. No Svelte, CSS, callbacks, or controller impersonation. */
export function landmarksDefinition(source: ReturnType<typeof loadAppleReference>["source"]): PublicCatalogDefinition {
  return {
    protocol: "desert.public-catalog/1", id: "landmarks", title: "Landmarks", object: Landmark, source, exercises: travelKit,
    description: "Explore remarkable places around the world.",
    featuredMedia: { kind:'gallery', images:[
      { asset:'place-1016', alt:'Mount Fuji' }, { asset:'place-1019', alt:'Great Barrier Reef' },
      { asset:'place-1001', alt:'Sahara Desert' },
    ] },
    view: {
      title: "title", description: "description",
      home: {
        featured: { record: "1016", eyebrow: "Featured Landmark", actionLabel: "Learn More" },
        groups: { field: "continent", entries: continents.map(value => ({ value, title: value })) },
      },
      search: { fields: ["title", "description", "continent"] },
    },
  };
}

export function loadLandmarks() {
  const { source, sourceRoot } = loadAppleReference();
  return { application: compilePublicCatalog(landmarksDefinition(source)), sourceRoot };
}
