import type { ResolvedNodeId } from '../../../../interaction/catalog.ts';

/** Human-readable identity for each canonical component, never another inventory. */
export const catalogPurpose = {
  'input.text': 'Write a single line with a persistent label, field help and validation feedback.',
  'input.multiline': 'Write longer text in a field that keeps its label and help attached to the input.',
  fact: 'Read a labeled value, including the difference between an empty value and an unknown value.',
  action: 'Invoke one command with a text button or an icon button, never competing text and icons.',
  availability: 'Understand whether a capability is ready, unavailable or not yet known.',
  collection: 'Browse objects with shared row geometry, or present media in a gallery.',
  form: 'Complete the inputs of one operation while retaining drafts and showing local feedback.',
  context: 'Read an object and use its contextual commands without leaving its destination.',
  review: 'Inspect the prepared result before accepting a change or recovering an uncertain result.',
  transient: 'Open a temporary surface over its parent with content and top or bottom toolbars, never lateral child surfaces.',
  problem: 'Explain a warning or error and keep any available recovery action beside it.',
  'catalog.card': 'Open a media item from a card composed of artwork and its supporting content.',
  'catalog.home': 'Arrange a catalog overview from the same content, media and navigation compositions.',
  'catalog.detail': 'Read one catalog item with its media and details in the current destination.',
  'control.select': 'Choose one value from a labeled field and a shared options popover.',
  'control.popover': 'Read contextual information in a temporary surface anchored to its trigger.',
  'control.files': 'Select supported local files and inspect their limits before an operation uses them.',
  'control.labels': 'Choose or create labels using the shared field, value rail and selection rows.',
  'control.options': 'Choose one or several values from a divided group of options.',
  'control.money': 'Enter an amount and choose its currency without losing the lexical draft.',
  'control.date': 'Choose a date with the same field boundary and calendar interaction.',
  'control.tag': 'Read a short semantic label without turning it into an action.',
  'control.image': 'Display an image with its aspect ratio, accessible description and unavailable state.',
  'control.avatar': 'Identify a person with an image or a seed-generated avatar, never initials.',
} as const satisfies Record<ResolvedNodeId,string>;
