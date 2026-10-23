// Generated from catalog-manifest.ts. Run scripts/web-catalog.ts --write; do not edit.
import type { WebRendererBank } from "./renderer-contracts.ts";
import TextInput from "./catalog/foundations/text-input/TextInput.svelte";
import Action from "./catalog/foundations/action/Action.svelte";
import Availability from "./catalog/foundations/availability/Availability.svelte";
import Drawer from "./catalog/foundations/drawer/Drawer.svelte";
import Problem from "./catalog/compositions/problem/Problem.svelte";
import Facts from "./catalog/renderer/facts/Facts.svelte";
import Fields from "./catalog/compositions/fields/Fields.svelte";
import Collection from "./catalog/compositions/collection/Collection.svelte";
import ContextPanel from "./catalog/compositions/context-panel/ContextPanel.svelte";
import Review from "./catalog/compositions/review/Review.svelte";
import SelectControl from "./catalog/compositions/select-control/SelectControl.svelte";
import PopoverControl from "./catalog/compositions/popover-control/PopoverControl.svelte";
import FileControl from "./catalog/compositions/file-control/FileControl.svelte";
import LabelsControl from "./catalog/compositions/labels-control/LabelsControl.svelte";
import OptionsControl from "./catalog/compositions/options-control/OptionsControl.svelte";
import MoneyControl from "./catalog/compositions/money-control/MoneyControl.svelte";
import DateControl from "./catalog/foundations/date-control/DateControl.svelte";
import MediaControl from "./catalog/compositions/media-control/MediaControl.svelte";
import CatalogCard from "./catalog/foundations/catalog-card/CatalogCard.svelte";
import CatalogHome from "./catalog/compositions/catalog-home/CatalogHome.svelte";
import CatalogDetail from "./catalog/compositions/catalog-detail/CatalogDetail.svelte";

export const webRenderers: WebRendererBank = Object.freeze({
  "input.text": TextInput,
  "input.multiline": TextInput,
  action: Action,
  availability: Availability,
  transient: Drawer,
  problem: Problem,
  fact: Facts,
  form: Fields,
  collection: Collection,
  context: ContextPanel,
  review: Review,
  "control.select": SelectControl,
  "control.popover": PopoverControl,
  "control.files": FileControl,
  "control.labels": LabelsControl,
  "control.options": OptionsControl,
  "control.money": MoneyControl,
  "control.date": DateControl,
  "control.tag": MediaControl,
  "control.image": MediaControl,
  "control.avatar": MediaControl,
  "catalog.card": CatalogCard,
  "catalog.home": CatalogHome,
  "catalog.detail": CatalogDetail,
} satisfies WebRendererBank);
