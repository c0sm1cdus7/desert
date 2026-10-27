// The local example data of the shared-owner specimens: the records, views, signals and commands they draw. It is
// witness data (what a person would have written), never a product definition, query or controller connection.
import type { ResolvedView } from "../../../../views/resolved.ts";
import { ResolvedNodeVersion, type ResolvedNodeFor } from "../../../../interaction/resolved-node.ts";
import type { RelatedSelectionSnapshot } from "../../../../interaction/related-selection.ts";
import type { ToolbarAction } from "../../../../interaction/toolbar.ts";
import type { AttentionSignal } from "../../../../attention.ts";
import type { AttentionSnapshot } from "../../../../web/client/attention-feed.ts";
import { surfaceFrame, SurfaceFrameVersion } from "../../../../interaction/surface-frame.ts";

export const gallery: ResolvedView = { view: { version: 'desert.view/1', id: 'gallery-fixture', layout: 'gallery', outputs: ['open'], content: [
  { kind: 'stack', id: 'collections', title: 'Collections', items: [{ kind: 'collection', id: 'collection-grid', input: 'collections', output: 'open' }] },
  { kind: 'stack', id: 'media', title: 'Media', items: [{ kind: 'collection', id: 'media-grid', input: 'media', output: 'open' }] },
] }, disabledOutputs: [], bindings: {
  collections: { version: ResolvedNodeVersion, kind: 'collection', object: 'collection', fields: ['title'], labels: { 'collection.title': 'Title' },
    loaded: true, disabled: false, selectedId: null,
    presentation: { kind: 'collection-grid', title: 'title', previews: [{ id: 'travel', count: 3 }, { id: 'research', count: 2 }] },
    records: [{ id: 'travel', version: 1, facts: { title: 'Travel' } }, { id: 'research', version: 1, facts: { title: 'Research' } }] },
  media: { version: ResolvedNodeVersion, kind: 'collection', object: 'media', fields: ['image'], labels: { 'media.image': 'Image' },
    loaded: true, disabled: false, selectedId: null, presentation: { kind: 'media-grid', image: 'image', layout: 'grid' },
    records: [1, 2, 3].map(index => ({ id: `image-${index}`, version: 1, facts: { image: '/bank-image.svg' } })) },
} };

export const attentionSignal: AttentionSignal = { version: 'desert.attention/1', recipient: 'specimen',
  source: { kind: 'activity', id: '10000000-0000-4000-8000-000000000001', revision: 1, journey: 'note' },
  target: { kind: 'activity', id: '10000000-0000-4000-8000-000000000001' }, reason: 'activity.resume', resolution: 'producer' };

export const widget: ResolvedNodeFor<'collection'> = { version: ResolvedNodeVersion, kind: 'collection', object: 'task', fields: ['status'],
  labels: { 'task.status': 'Status' }, loaded: true, disabled: false, selectedId: null,
  presentation: { kind: 'summary-widget', title: 'Tasks', description: 'Work at a glance', totalLabel: 'Tasks', field: 'status',
    segments: [{ value: 'open', label: 'Open' }, { value: 'completed', label: 'Completed' }] },
  records: [{ id: 'first', version: 1, facts: { status: 'open' } }, { id: 'second', version: 1, facts: { status: 'open' } },
    { id: 'third', version: 1, facts: { status: 'completed' } }] };

/** The summary widget as it reads in one connection state. */
export const widgetIn = (state: string): ResolvedNodeFor<'collection'> => ({ ...widget, loaded: state !== 'loading',
  ...(state === 'loading' ? { records: [] } : {}),
  connection: state === 'offline' ? 'offline' : state === 'loading' ? 'loading' : 'ready' });

export const overview: ResolvedView = { view: { version: 'desert.view/1', id: 'overview-fixture', layout: 'overview', outputs: ['tasks'],
  content: [{ kind: 'attention', id: 'attention' },
    { kind: 'stack', id: 'widgets', title: 'Widgets', items: [{ kind: 'collection', id: 'task-summary', input: 'task-summary', output: 'tasks',
      presentation: { kind: 'summary-widget', title: 'Tasks', description: 'Work at a glance', totalLabel: 'Tasks' } }] }] },
  bindings: { 'task-summary': widget }, disabledOutputs: [],
  attention: { loaded: true, error: null, objectSignals: {}, items: [{ id: 'draft', journey: 'note', title: 'Finish your note',
    description: 'Continue where you left off.', available: true, signals: [attentionSignal] }] } };

export const attention: AttentionSnapshot = { loaded: true, error: null, objectSignals: {}, items: [
  { id: "draft", journey: "note", title: "Finish your note", description: "Continue where you left off.", available: true, signals: [attentionSignal] },
  { id: "unavailable", journey: "note", title: "Saved activity", description: "This activity needs a compatible version.", available: false,
    signals: [{ ...attentionSignal, reason: 'activity.compatibility' }] }] };

export const relation: RelatedSelectionSnapshot = { revision: 0, busy: false, uncertain: false, dirty: false, committing: false, groups: [
  { input: "media", label: "Media in this collection", loading: false, busy: false, uncertain: false,
    items: [{ id: "image", label: "Image 1", checked: true }, { id: "video", label: "Video 2", checked: false }, { id: "audio", label: "Audio 3", checked: false }] }] };

/** The status selector of an object, with the state it shows. */
export const statusSelector = (value: string) => ({ field: 'status', label: 'Status', value, disabled: false, options: [
  { value: 'open', label: 'Open', journey: 'open', available: true },
  { value: 'completed', label: 'Completed', journey: 'completed', available: true }] });

export const notes: ResolvedNodeFor<'collection'> = { version: ResolvedNodeVersion, kind: 'collection', object: 'note', fields: ['title', 'details'],
  labels: { 'note.title': 'Title', 'note.details': 'Details' }, loaded: true, disabled: false, selectedId: null,
  records: [{ id: 'one-line', version: 1, facts: { title: 'Design ideas', details: '' } },
    { id: 'two-lines', version: 1, facts: { title: 'Next steps', details: 'Only show secondary content when it exists.' } }] };

export const actions: readonly ToolbarAction[] = [
  { label: "Create note", icon: "create", state: "ready", intent: { kind: "journey", journey: "specimen.create" } },
  { label: "View options", icon: "review", state: "ready", intent: { kind: "journey", journey: "specimen.options" } },
];

export const confirmation = surfaceFrame({ version: SurfaceFrameVersion, kind: "confirmation", top: { title: "Move note to Trash?", face: { kind: "icon", icon: "archive" } },
  content: { kind: "message", text: "You can restore the note from Trash." },
  bottom: { secondary: { label: "Cancel", icon: "back", state: "ready", intent: { kind: "back" } },
    primary: { label: "Move to Trash", icon: "archive", state: "ready", intent: { kind: "accept" } } } });
