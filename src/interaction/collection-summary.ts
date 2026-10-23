import type { RecordView } from '../web/types.ts';

/** Pure descriptive aggregation. Domain states are never an attention signal. */
export function collectionSummary(records:readonly RecordView[], definition:{readonly field:string;
  readonly segments:readonly {readonly value:string;readonly label:string}[]}) {
  const counts=new Map(definition.segments.map(segment=>[segment.value,0]));
  if(counts.size!==definition.segments.length)throw new Error('INVALID_WIDGET_SEGMENTS');
  for(const record of records){
    const value=record.facts[definition.field];
    if(typeof value!=='string'||!counts.has(value))throw new Error('INVALID_WIDGET_VALUE');
    counts.set(value,counts.get(value)!+1);
  }
  return {total:records.length,segments:definition.segments.map(segment=>({...segment,count:counts.get(segment.value)!}))};
}
