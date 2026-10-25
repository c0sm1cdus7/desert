// Generated from the catalog declarations by `node scripts/catalog.ts --write`; do not edit.
import type { NodeRendererTable } from "./renderer-contracts.ts";
import Action from "./catalog/foundations/action/Action.svelte";
import Availability from "./catalog/foundations/availability/Availability.svelte";
import CatalogCard from "./catalog/compositions/catalog-card/CatalogCard.svelte";
import CatalogDetail from "./catalog/compositions/catalog-detail/CatalogDetail.svelte";
import CatalogHome from "./catalog/compositions/catalog-home/CatalogHome.svelte";
import Collection from "./catalog/compositions/collection/Collection.svelte";
import ContextPanel from "./catalog/compositions/context-panel/ContextPanel.svelte";
import DateControl from "./catalog/foundations/date-control/DateControl.svelte";
import Dialog from "./catalog/compositions/dialog/Dialog.svelte";
import Facts from "./catalog/renderer/facts/Facts.svelte";
import Field from "./catalog/foundations/field/Field.svelte";
import Fields from "./catalog/compositions/fields/Fields.svelte";
import Files from "./catalog/foundations/files/Files.svelte";
import LabelsControl from "./catalog/compositions/labels-control/LabelsControl.svelte";
import MediaControl from "./catalog/compositions/media-control/MediaControl.svelte";
import MoneyControl from "./catalog/compositions/money-control/MoneyControl.svelte";
import OptionsControl from "./catalog/compositions/options-control/OptionsControl.svelte";
import PopoverControl from "./catalog/compositions/popover-control/PopoverControl.svelte";
import Review from "./catalog/compositions/review/Review.svelte";
import SelectControl from "./catalog/compositions/select-control/SelectControl.svelte";
import ViewPanel from "./catalog/compositions/view-panel/ViewPanel.svelte";

export const nodeRenderers: NodeRendererTable = Object.freeze({
  action: Action,
  availability: Availability,
  "catalog.card": CatalogCard,
  "catalog.detail": CatalogDetail,
  "catalog.home": CatalogHome,
  collection: Collection,
  context: ContextPanel,
  "control.date": DateControl,
  problem: Dialog,
  fact: Facts,
  "input.text": Field,
  "input.multiline": Field,
  form: Fields,
  "control.files": Files,
  "control.labels": LabelsControl,
  "control.tag": MediaControl,
  "control.image": MediaControl,
  "control.avatar": MediaControl,
  "control.money": MoneyControl,
  "control.options": OptionsControl,
  "control.popover": PopoverControl,
  review: Review,
  "control.select": SelectControl,
  transient: ViewPanel,
} satisfies NodeRendererTable);
