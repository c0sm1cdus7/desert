import type { HumanSurface } from '../web/types.ts';
import type { ViewJourney } from './program-schema.ts';
type Summary=NonNullable<NonNullable<Extract<ViewJourney,{kind:'presentation'}>['collections']>[number]['summary']>;

/** Widget metrics may count only all values of an explicitly exposed enum. */
export function validateWidgetBinding(summary:Summary|undefined,
  read:Extract<HumanSurface['journeys'][number],{kind:'read'}>,visible:readonly string[]) {
  if(!summary)throw new Error('INVALID_WIDGET_BINDING');
  const {field,segments}=summary;
  const values=(read.detailSchema.properties[field.field] as {enum?:readonly unknown[]}|undefined)?.enum;
  if(field.object!==read.subject||!visible.includes(field.field)||!values||
    new Set(segments.map(segment=>segment.value)).size!==segments.length||
    values.length!==segments.length||segments.some(segment=>!values.includes(segment.value)))throw new Error('INVALID_WIDGET_FIELD');
}
