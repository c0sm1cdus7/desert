import type {PoolClient} from 'pg';
import type {LocalProgram} from '../local/program.ts';
import {ownedObject} from '../local/records.ts';
import type {AttentionSignal} from '../attention.ts';
import type {ActivityRecord} from './records.ts';

/** Existing Activity is the first closed producer. A creation draft is not yet a domain object. */
export async function activityAttention(client:PoolClient,program:LocalProgram,actor:string,surface:string,
  record:Pick<ActivityRecord,'id'|'revision'|'phase'|'plan'|'options'>,compatible:boolean):Promise<AttentionSignal|undefined>{
  const journey=program.journey(surface,record.plan.journey);
  if(journey.kind!=='mutation')return;
  let target:AttentionSignal['target']={kind:'activity',id:record.id};
  if(journey.command.kind==='update'&&compatible){
    if(!record.options.subject)return;
    const reads=program.application.surface(surface).journeys.flatMap(item=>{
      if(item.kind!=='read'||item.subject!==journey.command.object)return [];
      try{const read=program.journey(surface,item.id);return read.kind==='read'?[read]:[];}
      catch(error){if(error instanceof Error&&error.message==='JOURNEY_NOT_INSTALLED')return [];throw error;}
    });
    if(!reads.length)return;
    try{
      const object=await ownedObject(client,program,actor,journey.command.object,record.options.subject,false);
      if(!reads.some(read=>Object.entries(read.where ?? {}).every(([field,value])=>object.facts[field]===value)))return;
      target={kind:'object',object:journey.command.object,id:object.id};
    }catch(error){if(error instanceof Error&&error.message==='NOT_FOUND')return;throw error;}
  }
  return {version:'desert.attention/1',source:{kind:'activity',id:record.id,revision:record.revision,journey:record.plan.journey},
    recipient:actor,target,reason:!compatible?'activity.compatibility':record.phase==='prepared'?'activity.confirm':'activity.resume',resolution:'producer'};
}
