// The cases of the lane D composition parity test: every media and catalog composition in each of its forms, at the
// place insets of a catalog workspace, as one page that a frozen and a current tree both render.
const id = (n: number) => `10000000-0000-4000-8000-00000000000${n}`;
const collection = { version: "desert.bank-node/1", kind: "collection", object: "item", fields: ["photo", "caption"],
  labels: { "item.photo": "Photo", "item.caption": "Caption" }, loaded: true, disabled: false, selectedId: id(1),
  attention: { [id(1)]: [{ kind: "review" }] } };
const records = [
  { id: id(1), version: 1, facts: { photo: "/media/harbour.jpg", caption: "Harbour at dusk" } },
  { id: id(2), version: 1, facts: { photo: { kind: "asset", reference: id(3), media: "video" }, caption: "Night ferry" } },
  { id: id(4), version: 1, facts: { photo: "", caption: "" } }];
const grid = { ...collection, records, presentation: { kind: "media-grid", image: "photo", description: "caption" } };
const list = { ...collection, records, presentation: { kind: "media-grid", image: "photo", description: "caption", layout: "list" } };
const covers = { ...collection, fields: ["title"], labels: { "item.title": "Title" }, presentation: { kind: "collection-grid", title: "title",
  previews: [{ id: id(1), count: 3, media: { kind: "asset", reference: id(3), media: "image" } }, { id: id(2), count: 1 }] },
  records: [{ id: id(1), version: 1, facts: { title: "Travel" } }, { id: id(2), version: 1, facts: { title: "Family" } }] };
const control = { version: "desert.control/1", disabled: false };
const tag = { ...control, kind: "tag", id: "tag", label: "Travel", tone: "accent" };
const avatar = { ...control, kind: "avatar", id: "avatar", label: "AlexandraVeryLongUnbrokenFamilyName Rivera", source: null, seed: "5c2e9b71a0d4f386" };
const image = { ...control, kind: "image", id: "image", label: "Cover", alt: "Lake", aspect: "landscape", source: "/media/lake.jpg" };
const card = (record: string, title: string) => ({ version: "desert.bank-node/1", kind: "catalog.card", presentation: "item", record, title, mediaType: "audio" });
const home = { version: "desert.bank-node/1", kind: "catalog.home",
  featured: { version: "desert.bank-node/1", kind: "catalog.card", presentation: "featured", record: "coast", title: "Shared gallery", eyebrow: "Featured",
    actionLabel: "Open", mediaType: "audio" },
  groups: [{ id: "albums", title: "Albums", items: [card("coast", "Coast"), card("peaks", "Peaks")] },
    { id: "trips", title: "Trips", items: [card("dunes", "Dunes")] }] };
const detail = { version: "desert.bank-node/1", kind: "catalog.detail", record: "lake", title: "Lake", description: "A lake.\nIts shore.",
  image: { asset: "lake", alt: "Lake" }, gallery: [{ asset: "lake", alt: "Lake" }, { asset: "lake", alt: "Lake again" }] };

/** Cases whose probes match exactly, and cases whose pieces may move only on the block axis (DESIGN §7.3). */
export const mediaCases = {
  inline: ["tiles", "list", "covers", "tag", "avatar", "image", "object-image", "object-missing"],
  block: ["home-nested", "home-page", "detail"],
} as const;

/** The place insets of a catalog workspace (surface-reading.css), with a docked navigation's leading inset on the page. */
const place = "--place-surface-inset:26px;--place-content-inset:42px";
export const mediaPage = `<script lang="ts">
  import MediaGrid from "@desert/svelte/catalog/compositions/media-grid/MediaGrid.svelte";
  import MediaCollectionGrid from "@desert/svelte/catalog/compositions/media-collection-grid/MediaCollectionGrid.svelte";
  import MediaControl from "@desert/svelte/catalog/compositions/media-control/MediaControl.svelte";
  import MediaObject from "@desert/svelte/catalog/compositions/media-object/MediaObject.svelte";
  import CatalogHome from "@desert/svelte/catalog/compositions/catalog-home/CatalogHome.svelte";
  import CatalogDetail from "@desert/svelte/catalog/compositions/catalog-detail/CatalogDetail.svelte";
  import StackItem from "@desert/svelte/catalog/foundations/stack-item/StackItem.svelte";
</script>
<main data-renderer-profile="apple-reference" style="display:grid;grid-template-columns:minmax(0,1fr);gap:24px;width:640px;padding:16px">
  <div data-case="tiles"><MediaGrid node={${JSON.stringify(grid)}} select={() => {}} /></div>
  <div data-case="list"><MediaGrid node={${JSON.stringify(list)}} select={() => {}} /></div>
  <div data-case="covers"><MediaCollectionGrid node={${JSON.stringify(covers)}} select={() => {}} /></div>
  <div data-case="tag"><MediaControl node={${JSON.stringify(tag)}} /></div>
  <div data-case="avatar" style="width:320px"><MediaControl node={${JSON.stringify(avatar)}} /></div>
  <div data-case="image"><MediaControl node={${JSON.stringify(image)}} /></div>
  <div data-case="object-image"><MediaObject facts={{ media: "/media/lake.jpg", caption: "A lake at dawn" }} presentation={{ kind: "media-object", media: "media", description: "caption" }} /></div>
  <div data-case="object-missing"><MediaObject facts={{ media: "", caption: "Not uploaded yet" }} presentation={{ kind: "media-object", media: "media", description: "caption" }} /></div>
  <div data-case="home-nested" style="${place}"><StackItem placement="surface" kind="catalog.home"><CatalogHome node={${JSON.stringify(home)}} onevent={() => {}} /></StackItem></div>
  <div data-case="home-page" style="${place};--place-leading-inset:40px" data-catalog-scroll><div><CatalogHome node={${JSON.stringify(home)}} onevent={() => {}} bodyOnly placement="page" /></div></div>
  <div data-case="detail" style="${place}"><CatalogDetail node={${JSON.stringify(detail)}} onevent={() => {}} /></div>
</main>`;
