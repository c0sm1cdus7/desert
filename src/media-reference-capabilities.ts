import type { ProductDefinition } from './contracts.ts';
import type { JourneyDefinition } from './program-grammar.ts';
export type MediaReferenceCapability={object:string;media:string;read:string;memberOf?:string};
export function mediaReferenceCapabilities(product:ProductDefinition,exposed:readonly JourneyDefinition[]){
  const result:Record<string,MediaReferenceCapability>={};
  for(const object of product.objects)for(const [name,field]of Object.entries(object.facts)){
    if(field.kind!=='labels'||!field.reference||!('media'in field.reference)||!exposed.some(journey=>journey.kind==='read'
      ?journey.object===object.id&&journey.fields.includes(name):journey.command.object===object.id&&journey.command.input.includes(name)))continue;
    const reference=field.reference;
    const reads=exposed.filter(journey=>journey.kind==='read'&&journey.object===reference.object
      &&journey.collection.includes(reference.media)&&(!reference.memberOf||journey.collection.includes(reference.memberOf))
      &&Object.keys(journey.where ?? {}).length===Object.keys(reference.where ?? {}).length
      &&Object.entries(reference.where ?? {}).every(([name,value])=>journey.where?.[name]===value));
    if(reads.length!==1)throw new Error('MEDIA_REFERENCE_CAPABILITY_REQUIRED');
    result[`${object.id}.${name}`]={...reference,read:reads[0]!.id};
  }
  return result;
}
