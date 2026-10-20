import { enumeration, objectType, text } from "../../src/contracts.ts";

export function catalogFixture(prefix = "parks") {
  return {
    protocol: "desert.public-catalog/1" as const, id: prefix, title: "Public places",
    description: "Explore public places.",
    object: objectType({ id: `${prefix}.place`, facts: {
      name: text({ minLength: 1 }), story: text(), region: enumeration(["north", "south"]), privateMemo: text(),
    } }),
    source: { id: `${prefix}.source`, revision: "1", assets: [
      { id: `${prefix}.lake`, path: "media/lake.jpg", alt: "A blue lake" },
      { id: `${prefix}.hill`, path: "media/hill.jpg", alt: "A green hill" },
    ], records: [
      { id: `${prefix}.one`, image: `${prefix}.lake`, facts: {
        name: "Blue Lake", story: "A quiet blue lake", region: "north", privateMemo: "unexposed-needle",
      } },
      { id: `${prefix}.two`, image: `${prefix}.hill`, facts: {
        name: "Green Hill", story: "A green hill overlooking a lake", region: "south", privateMemo: "hidden",
      } },
    ] },
    view: { title: "name", description: "story", home: {
      featured: { record: `${prefix}.one`, eyebrow: "Featured place", actionLabel: "Explore" },
      groups: { field: "region", entries: [{ value: "north", title: "Northern places" }, { value: "south", title: "Southern places" }] },
    }, search: { fields: ["name", "story", "region"] } },
  };
}
