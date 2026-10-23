import { Type, type Static } from '@sinclair/typebox';
import type { AssetReference } from '../assets/types.ts';
const text=Type.String({minLength:1});
export const RelatedSelectionEventSchema=Type.Union([
  Type.Object({kind:Type.Literal('related.change'),input:text,id:text,checked:Type.Boolean()},{additionalProperties:false}),
  Type.Object({kind:Type.Literal('related.recover'),input:text},{additionalProperties:false}),
]);
export type RelatedSelectionEvent=Static<typeof RelatedSelectionEventSchema>;
export type RelatedSelectionItem={readonly id:string;readonly label:string;readonly checked:boolean;readonly asset?:AssetReference};
export type RelatedSelectionGroup={readonly input:string;readonly label:string;readonly items:readonly RelatedSelectionItem[];
  readonly loading:boolean;readonly busy:boolean;readonly uncertain:boolean;readonly disabled?:boolean;readonly error?:string};
export type RelatedSelectionSnapshot={readonly groups:readonly RelatedSelectionGroup[];readonly busy:boolean;readonly uncertain:boolean;
  readonly dirty:boolean;readonly committing:boolean;readonly revision:number};
