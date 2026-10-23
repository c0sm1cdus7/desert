import type { ProductDefinition } from './contracts.ts';
import type { JourneyDefinition } from './program-grammar.ts';
export type ReferenceCapability = {object:string;label:string;color?:string;read:string;create?:string;
  colors:readonly string[];maxLength:number};
export function referenceCapabilities(product:ProductDefinition,exposed:readonly JourneyDefinition[]) {
  const result:Record<string,ReferenceCapability>={};
  for (const object of product.objects) for (const [name,field] of Object.entries(object.facts)) {
    if (field.kind !== 'labels' || !field.reference || 'media' in field.reference || !exposed.some(journey => journey.kind === 'read'
      ? journey.object === object.id && journey.fields.includes(name)
      : journey.command.object === object.id && journey.command.input.includes(name))) continue;
    const reference=field.reference;
    const target=product.objects.find(item => item.id === reference.object)!;
    const label=target.facts[reference.label]!, color=reference.color ? target.facts[reference.color] : undefined;
    const reads=exposed.filter(journey => journey.kind === 'read' && journey.object === target.id
      && !journey.where && journey.collection.includes(reference.label) && (!reference.color || journey.collection.includes(reference.color)));
    const creates=exposed.filter(journey => journey.kind === 'mutation' && journey.command.kind === 'create'
      && journey.command.object === target.id && journey.command.input.length === (reference.color ? 2 : 1)
      && journey.command.input.includes(reference.label) && (!reference.color || journey.command.input.includes(reference.color)));
    if (reads.length !== 1 || creates.length !== 1 || label.kind !== 'text' || color && color.kind !== 'enum'
      || color?.kind === 'enum' && color.values.some(value => !['blue','violet','rose','green','amber','slate'].includes(value))) throw new Error('REFERENCE_CAPABILITY_REQUIRED');
    result[`${object.id}.${name}`]={...field.reference,read:reads[0]!.id,create:creates[0]!.id,
      colors:color?.kind === 'enum' ? color.values : [],maxLength:label.maxLength ?? 64};
  }
  return result;
}
