import type { PrimitiveId } from '../../interaction/catalog.ts';
import type { DiscoveryGroup } from '../../interaction/catalog-ownership.ts';
import { sharedCatalogOwners, type SharedOwner } from './shared-owners.ts';

type Description = {title:string; purpose:string; group:DiscoveryGroup; partOf?:PrimitiveId|SharedOwner};
/** Implementation parts remain discoverable under the component they explain. */
export const sharedPurpose: Record<SharedOwner,Description> = {
  Place: {title:'Surface', group:'compositions', purpose:'Arrange content and top or bottom toolbars, with lateral surfaces only at the root. Mounted surfaces keep their own content and toolbars.'},
  ToolbarLayout: {title:'Toolbar', group:'compositions', purpose:'Keep navigation and contextual commands in the surface toolbar; reveal its title and subtitle only after the content header scrolls away.'},
  SpeedDial: {title:'Overflow commands', group:'compositions', partOf:'ToolbarLayout', purpose:'Reveal overflowing contextual commands beside their readable labels, without putting content navigation in the toolbar.'},
  FactRow: {title:'Fact row', group:'compositions', partOf:'fact', purpose:'Keep a capitalized label on the left and its value right-aligned, with shared horizontal dividers and balanced wrapping.'},
  ReadingContent: {title:'Reading content', group:'foundations', purpose:'Read paragraphs at a comfortable measure, outside the two-column layout used for properties.'},
  Information: {title:'Information', group:'compositions', partOf:'fact', purpose:'Group related facts in one pane while leaving reading paragraphs in the content stack.'},
  InspectionCatalog: {title:'Visual catalog', group:'compositions', purpose:'Discover foundations and compositions through the same action rows and destination navigation used by the product.'},
  ViewDestinationLink: {title:'Action row', group:'compositions', purpose:'Navigate or invoke an action through a row with a representative icon, distinct from object rows.'},
  ConfirmationDialog: {title:'Confirmation dialog', group:'compositions', purpose:'Ask for explicit confirmation in a compact temporary surface with clear primary and secondary actions.'},
  AppearancePreferences: {title:'Appearance', group:'compositions', purpose:'Choose mode, text size, tint and a system wallpaper with immediate local preview.'},
  AppearancePreview: {title:'Appearance preview', group:'compositions', partOf:'AppearancePreferences', purpose:'Compare Dark and Light using the same surface, tint and wallpaper tokens as the running interface.'},
  SeedAvatar: {title:'Seed avatar', group:'foundations', partOf:'control.avatar', purpose:'Generate a deterministic visual identity from a seed without displaying letters or initials.'},
  AvatarShuffle: {title:'Avatar shuffle', group:'compositions', partOf:'control.avatar', purpose:'Generate a new avatar seed on activation and reveal the shuffle overlay on hover or focus.'},
  Wallpaper: {title:'Wallpaper', group:'foundations', purpose:'Provide system-generated Silk, Mist or Plain backgrounds that follow the selected appearance.'},
  AccessExperience: {title:'Onboarding', group:'compositions', purpose:'Create an identity in one step and choose appearance in the second, without a confirmation step.'},
  LockScreen: {title:'Lock screen', group:'compositions', purpose:'Unlock the selected identity while its private content stays hidden.'},
  ObjectStateControl: {title:'State selector', group:'foundations', purpose:'Choose an object state through a contextual command; a retained selection is not a required form input.'},
  ContextProperties: {title:'Object properties', group:'compositions', purpose:'Read related facts and use state commands in one shared pane, separate from reading paragraphs.'},
  ObjectStateRow: {title:'Object state row', group:'compositions', partOf:'ObjectStateControl', purpose:'Use a named state selector that dispatches canonical commands without adding toolbar shortcuts.'},
  AttentionIndicator: {title:'Attention indicator', group:'foundations', purpose:'Mark objects needing attention with the same amber indicator everywhere, steady when reduced motion is enabled.'},
  AttentionList: {title:'Attention list', group:'compositions', purpose:'Bring every object or activity needing the identity’s attention into one consistent Home list.'},
  AttentionStatus: {title:'Attention status', group:'compositions', partOf:'AttentionIndicator', purpose:'Pair the shared attention indicator with readable context for the attention signal.'},
  LabelRail: {title:'Label rail', group:'compositions', partOf:'control.labels', purpose:'Present selected labels in a wrapping rail using the same value representation as the field.'},
  ColorBullet: {title:'Color bullet', group:'foundations', partOf:'control.labels', purpose:'Show a label’s color alongside its text without using color as its only meaning.'},
  ReferenceValues: {title:'Reference values', group:'compositions', partOf:'ReferenceSelector', purpose:'Read selected object references using their labels and shared value layout.'},
  ReferenceSelector: {title:'Reference selector', group:'foundations', purpose:'Choose referenced objects through a labeled field and the shared selection popover.'},
  LabelsControl: {title:'Labels field', group:'compositions', partOf:'control.labels', purpose:'Compose the field well, value rail and options from the same shared owners as every labels control.'},
  MediaReferenceSelector: {title:'Media selector', group:'foundations', purpose:'Select media references from a shared field without introducing another media library or creation path.'},
  Flow: {title:'Content flow', group:'compositions', purpose:'Arrange reading, overview or gallery stacks within the shared content measures and responsive layout.'},
  SummaryWidget: {title:'Summary widget', group:'compositions', purpose:'Show module status at a glance and open its destination.'},
  RelatedSelection: {title:'Related selection', group:'compositions', purpose:'Edit related objects within the current context using shared choices and explicit local feedback.'},
};

export const sharedIndexOwners=(group:DiscoveryGroup)=>sharedCatalogOwners.filter(owner=>sharedPurpose[owner].group===group&&!sharedPurpose[owner].partOf);
export const sharedParts=(id:PrimitiveId|SharedOwner)=>sharedCatalogOwners.filter(owner=>sharedPurpose[owner].partOf===id);
