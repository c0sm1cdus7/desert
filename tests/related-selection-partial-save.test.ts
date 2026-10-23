import test from 'node:test';
import assert from 'node:assert/strict';
import { modelRelatedSelection } from '../src/web/client/model-related-selection.ts';
import { TransportError, type ControllerTransport } from '../src/web/client/transport.ts';
import type { HumanSurface, ValidateInput } from '../src/web/types.ts';
import type { ViewProgram } from '../src/views/program-schema.ts';

test('a partial membership save retains confirmed progress and retries only unsaved members',async()=>{
  const parent='f8000000-0000-4000-8000-000000000001',other='f8000000-0000-4000-8000-000000000002';
  const first='f8000000-0000-4000-8000-000000000003',second='f8000000-0000-4000-8000-000000000004';
  const records=new Map([first,second].map(id=>[id,{id,version:3,facts:{memberships:[other]}}]));
  const runs=new Map<string,{subject?:string}>(),intents=new Map<string,{id:string;runId:string;subject:string;values:string[]}>();
  const accepted:string[]=[];let rejected=false;
  const program={journeys:[{id:'parents',kind:'read',view:'list',detailView:'detail',related:[{input:'items',read:'members',
    where:{field:{object:'member',field:'memberships'},includes:'subject'},membership:{update:'set',input:'memberships'}}]}],
    views:[{id:'detail',content:[]}]} as unknown as ViewProgram;
  const surface={journeys:[{id:'set',kind:'mutation',subject:true,object:'member',commandId:'set-command'}],
    language:{journeys:{members:'Members'}}} as unknown as HumanSurface;
  const transport={call:async(method:string,input:any)=>{
    if(method==='begin'){const id=`run-${runs.size}`;runs.set(id,input);return {id};}
    if(method==='read'){const run=runs.get(input.runId)!;return structuredClone(run.subject?[records.get(run.subject)]:[...records.values()]);}
    if(method==='prepare'){
      const subject=runs.get(input.runId)!.subject!,record=records.get(subject)!;
      if(subject===second && !rejected){rejected=true;record.version++;throw new TransportError('STALE_RECORD');}
      assert.equal(input.options.expectedVersion,record.version,'each retry rereads the current version');
      const id=`intent-${intents.size}`;intents.set(id,{id,runId:input.runId,subject,values:input.input.memberships});
      return {id,runId:input.runId,journeyId:'set',confirmationDigest:'digest',object:{id:subject,type:'member',expectedVersion:record.version}};
    }
    if(method==='accept'){
      const intent=intents.get(input.intentId)!,record=records.get(intent.subject)!;
      accepted.push(intent.subject);record.facts.memberships=intent.values;record.version++;
      return {id:intent.id,runId:intent.runId,commandId:'set-command',status:'completed',object:{id:record.id,type:'member',version:record.version}};
    }
    throw new Error(method);
  }} as unknown as ControllerTransport;
  const model=modelRelatedSelection(program,surface,transport,(()=>true) as ValidateInput,()=>{});
  await model.updateContext({readJourneyId:'parents',parentId:parent,editing:true,active:true});
  for(const id of [first,second])await model.event({kind:'related.change',input:'items',id,checked:true});
  assert.deepEqual(accepted,[]);
  assert.equal(await model.commit(),false);
  assert.deepEqual(accepted,[first]);assert.equal(model.snapshot().revision,1);
  assert.equal(model.snapshot().committing,true);assert.equal(model.snapshot().dirty,true);
  assert.match(model.snapshot().groups[0]!.error!,/already saved/);
  await model.event({kind:'related.recover',input:'items'});
  assert.deepEqual(accepted,[first,second],'successful writes are not replayed during recovery');
  assert.equal(model.snapshot().revision,2);assert.equal(model.snapshot().committing,false);assert.equal(model.snapshot().dirty,false);
  for(const record of records.values())assert.deepEqual(record.facts.memberships,[other,parent]);
  model.stop();
});
