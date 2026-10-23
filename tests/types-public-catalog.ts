import { enumeration, integer, objectType, text } from "../src/contracts.ts";
import { publicCatalog, type AuthoredPublicCatalog } from "../src/public-catalog/authoring.ts";
import type { ResolvedNodeFor } from "../src/interaction/resolved-node.ts";
import type { CatalogEvent } from "../src/public-catalog/events.ts";

const Place = objectType({ id: "place", facts: { name: text(), story: text(), region: enumeration(["north", "south"]), count: integer() } });
const valid: AuthoredPublicCatalog<typeof Place> = {
  protocol: "desert.public-catalog/1", id: "catalog", title: "Places", object: Place,
  description: "Explore public places.",
  source: { id: "source", revision: "1", assets: [{ id: "lake", path: "images/lake.jpg", alt: "Lake" }],
    records: [{ id: "one", image: "lake", facts: { name: "Lake", story: "Blue water", region: "north", count: 1 } }] },
  view: { title: "name", description: "story", home: { featured: { record: "one", eyebrow: "Featured", actionLabel: "Explore" },
    groups: { field: "region", entries: [{ value: "north", title: "North" }, { value: "south", title: "South" }] } }, search: { fields: ["name"] } },
};
publicCatalog(valid);
// @ts-expect-error A title must reference a declared text fact.
publicCatalog({ ...valid, view: { ...valid.view, title: "missing" } });
// @ts-expect-error An integer cannot be the title text.
publicCatalog({ ...valid, view: { ...valid.view, title: "count" } });
// @ts-expect-error A group must reference an enum fact.
publicCatalog({ ...valid, view: { ...valid.view, home: { ...valid.view.home, groups: { ...valid.view.home.groups, field: "name" } } } });
// @ts-expect-error Facts derive from the authored object, including integer types.
publicCatalog({ ...valid, source: { ...valid.source, records: [{ id: "one", image: "lake", facts: { name: "Lake", story: "Water", region: "north", count: "one" } }] } });
// @ts-expect-error Product authoring has no presentation stylesheet escape hatch.
publicCatalog({ ...valid, css: "color:red" });

const item: ResolvedNodeFor<"catalog.card"> = { version: "desert.bank-node/1", kind: "catalog.card", presentation: "item",
  record: "one", title: "Lake", image: { asset: "lake", alt: "Lake" } };
// @ts-expect-error Featured anatomy requires an eyebrow and an action label.
const incomplete: ResolvedNodeFor<"catalog.card"> = { ...item, presentation: "featured" };
// @ts-expect-error An ordinary item cannot add featured-only anatomy.
const contradictory: ResolvedNodeFor<"catalog.card"> = { ...item, eyebrow: "Featured" };
// @ts-expect-error Media host paths are not portable image references.
const imageUrl: ResolvedNodeFor<"catalog.card"> = { ...item, image: { asset: "lake", alt: "Lake", url: "/lake.jpg" } };
// @ts-expect-error Descriptors cannot contain render callbacks.
const callback: ResolvedNodeFor<"catalog.card"> = { ...item, onclick: () => {} };
// @ts-expect-error Catalog navigation is not a business command.
const save: CatalogEvent = { kind: "catalog.save", record: "one" };
void [item, incomplete, contradictory, imageUrl, callback, save];
