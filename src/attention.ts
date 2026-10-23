import {Type,type Static} from '@sinclair/typebox';
import type {Frozen} from './json.ts';

const closed={additionalProperties:false};
const name=Type.String({minLength:1,maxLength:200});
const id=Type.String({pattern:'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'});
/** Attention is an authoritative producer signal, not a domain object's status. */
export const AttentionSignalSchema=Type.Object({
  version:Type.Literal('desert.attention/1'),
  source:Type.Object({kind:Type.Literal('activity'),id,revision:Type.Integer({minimum:1}),journey:name},closed),
  recipient:name,
  target:Type.Union([Type.Object({kind:Type.Literal('activity'),id},closed),
    Type.Object({kind:Type.Literal('object'),object:name,id},closed)]),
  reason:Type.Union([Type.Literal('activity.resume'),Type.Literal('activity.confirm'),Type.Literal('activity.compatibility')]),
  resolution:Type.Literal('producer'),
},closed);
export type AttentionSignal=Frozen<Static<typeof AttentionSignalSchema>>;
export function objectAttentionKey(object:string,id:string){return JSON.stringify([object,id]);}
export function attentionTargetKey(signal:AttentionSignal){
  return JSON.stringify([signal.recipient,signal.target.kind,...(signal.target.kind==='object'?[signal.target.object]:[]),signal.target.id]);
}
