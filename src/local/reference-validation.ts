import type { PoolClient } from 'pg';
import type { LocalProgram } from './program.ts';
import type { Facts } from './types.ts';
import { ownedObject } from './records.ts';

/** Both prepare and commit reauthenticate targets under the same canonical owner policy. */
export async function validateReferences(client:PoolClient,program:LocalProgram,actor:string,type:string,facts:Facts,subject:string) {
  const targets: {type:string,id:string,media?:string,memberOf?:string,where?:Readonly<Record<string,string>>}[]=[];
  for (const [name,field] of Object.entries(program.objects.get(type)?.facts ?? {})) {
    if (field.kind !== 'labels' || !field.reference) continue;
    const value=facts[name];
    if (!Array.isArray(value)) throw new Error('INVALID_REFERENCE_VALUE');
    for (const id of value) targets.push({type:field.reference.object,id,...('media' in field.reference ? {media:field.reference.media,
      ...(field.reference.memberOf?{memberOf:field.reference.memberOf}:{}),...(field.reference.where?{where:field.reference.where}:{})} : {})});
  }
  for (const target of targets.sort((a,b)=>`${a.type}:${a.id}`.localeCompare(`${b.type}:${b.id}`))) {
    const record=await ownedObject(client,program,actor,target.type,target.id);
    if(target.media){const asset=record.facts[target.media];
      if(!asset || typeof asset!=='object' || !('kind' in asset) || asset.kind!=='asset' || ('media' in asset && asset.media!=='image')) throw new Error('INVALID_REFERENCE_MEDIA');}
    if(target.memberOf){const members=record.facts[target.memberOf];
      if(!Array.isArray(members) || !members.includes(subject))throw new Error('INVALID_REFERENCE_MEMBERSHIP');}
    if(Object.entries(target.where ?? {}).some(([name,value])=>record.facts[name]!==value))throw new Error('INVALID_REFERENCE_TARGET');
  }
}
