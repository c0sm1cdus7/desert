import type { HumanSurface } from '../types.ts';
import type { HumanState } from './state.ts';
import type { ViewJourney } from '../../views/program-schema.ts';
import type { RelatedSelectionSnapshot } from '../../interaction/related-selection.ts';
import type { ResolvedPanel } from '../../views/resolved.ts';
import type { FrameContent } from '../../interaction/surface-frame.ts';
import { surfaceFrame } from '../../interaction/surface-frame.ts';

/** Only an admitted inverse relationship may constrain a cover draft. */
export function relatedMediaDraft(surface: HumanSurface, read: Extract<ViewJourney,{kind:'read'}>,
  state: HumanState, related: RelatedSelectionSnapshot) {
  const source = surface.journeys.find(journey => journey.id === read.id);
  const object = source?.kind === 'read' ? source.subject : undefined;
  const fields: Record<string, ReadonlySet<string>> = {};
  for (const [key, capability] of Object.entries(surface.fieldMediaReferences ?? {})) {
    if (!object || !key.startsWith(`${object}.`) || !capability.memberOf) continue;
    const binding = read.related?.find(binding => binding.membership && binding.read === capability.read &&
      binding.where.field.object === capability.object && binding.where.field.field === capability.memberOf);
    const group = related.groups.find(group => group.input === binding?.input);
    if (!group || group.loading || group.error) continue;
    fields[key.slice(object.length + 1)] = new Set(group.items.filter(item => item.checked).map(item => item.id));
  }
  const mediaReferences = Object.fromEntries(Object.entries(state.mediaReferences ?? {}).map(([field, choices]) => {
    const allowed = object ? fields[field.slice(object.length + 1)] : undefined;
    return [field, allowed ? { ...choices, options: choices.options.filter(option => allowed.has(option.value)) } : choices];
  }));
  const clear = Object.entries(fields).flatMap(([field, allowed]) => {
    const value = state.draft[field];
    return Array.isArray(value) && value.some(id => !allowed.has(id)) ? [field] : [];
  });
  return { state: { ...state, mediaReferences }, clear };
}

/** Once the primary object saved, its immutable draft stays visible while the
 * remaining canonical membership writes finish or recover. */
export function lockRelatedForm(panel: ResolvedPanel): ResolvedPanel {
  const lock = (content: Extract<FrameContent,{kind:'form'}>) =>
    ({ ...content, fields: content.fields.map(field => ({ ...field, disabled: true })) });
  return { ...panel, locked: true, frame: surfaceFrame({ ...panel.frame,
    content: panel.frame.content.kind === 'form' ? lock(panel.frame.content) : panel.frame.content }),
    ...(panel.body ? { body: { ...panel.body, bindings: Object.fromEntries(Object.entries(panel.body.bindings).map(([key,node]) =>
      [key,node.kind === 'form' ? { ...node,content:lock(node.content) } : node])) } } : {}) };
}
