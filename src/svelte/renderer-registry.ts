import type { WebRendererBank } from "./renderer-contracts.ts";
import TextInput from "./pieces/TextInput.svelte";
import Action from "./pieces/Action.svelte";
import Availability from "./pieces/Availability.svelte";
import Drawer from "./pieces/Drawer.svelte";
import Problem from "./pieces/Problem.svelte";
import Facts from "./Facts.svelte";
import Fields from "./Fields.svelte";
import Collection from "./Collection.svelte";
import ContextPanel from "./ContextPanel.svelte";
import Review from "./Review.svelte";
import SelectControl from "./controls/SelectControl.svelte";
import PopoverControl from "./controls/PopoverControl.svelte";
import FileControl from "./controls/FileControl.svelte";
import OptionsControl from "./controls/OptionsControl.svelte";
import MoneyControl from "./controls/MoneyControl.svelte";
import DateControl from "./controls/DateControl.svelte";
import MediaControl from "./controls/MediaControl.svelte";
import CatalogCard from "./explorer/CatalogCard.svelte";
import CatalogHome from "./explorer/CatalogHome.svelte";
import CatalogDetail from "./explorer/CatalogDetail.svelte";

export const webRenderers: WebRendererBank = Object.freeze({
  "input.text": TextInput,
  "input.multiline": TextInput,
  fact: Facts,
  action: Action,
  availability: Availability,
  collection: Collection,
  form: Fields,
  context: ContextPanel,
  review: Review,
  transient: Drawer,
  problem: Problem,
  "control.select": SelectControl,
  "control.popover": PopoverControl,
  "control.files": FileControl,
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
