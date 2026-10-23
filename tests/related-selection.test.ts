import test from 'node:test';
import assert from 'node:assert/strict';
import { modelRelatedSelection } from '../src/web/client/model-related-selection.ts';
import { TransportError, type ControllerTransport } from '../src/web/client/transport.ts';
import type { HumanSurface, ValidateInput } from '../src/web/types.ts';
import type { ViewProgram } from '../src/views/program-schema.ts';

const parent='f7000000-0000-4000-8000-000000000001', other='f7000000-0000-4000-8000-000000000002';
const item='f7000000-0000-4000-8000-000000000003';
function setup(loseAcceptance=false) {
  const calls:{method:string,input:any}[]=[];
  let memberships=[other], version=3, receipt:any=null;
  let holdList:Promise<void>|undefined;
  const surface={journeys:[{id:'collections',kind:'read',subject:'collection'},
    {id:'media',kind:'read',subject:'media',fields:['collections','description'],collection:['collections','description']},
    {id:'set',kind:'mutation',subject:true,object:'media',commandId:'set-command',inputFields:['collections']}],language:{journeys:{media:'Media'},fields:{}},fieldKinds:{},fieldReferences:{}} as unknown as HumanSurface;
  const program={journeys:[{id:'collections',kind:'read',view:'list',detailView:'detail',related:[{input:'items',read:'media',where:{field:{object:'media',field:'collections'},includes:'subject'},membership:{update:'set',input:'collections'}}]}],views:[{id:'detail',content:[]}]} as unknown as ViewProgram;
  const transport={call:async(method:string,input:any)=>{
    calls.push({method,input});
    if(method==='begin') return {id:input.subject?'detail-run':'list-run'};
    if(method==='read') {
      const records=[{id:item,version,facts:{description:'A photo',collections:[...memberships]}}];
      if(input.runId==='list-run')await holdList;
      return records;
    }
    if(method==='prepare') return {id:'intent',runId:input.runId,journeyId:'set',confirmationDigest:'digest',object:{id:item,type:'media',expectedVersion:version}};
    if(method==='accept') {
      memberships=calls.findLast(call=>call.method==='prepare')!.input.input.collections;version++;
      receipt={id:'intent',runId:'detail-run',commandId:'set-command',status:'completed',object:{id:item,type:'media',version}};
      if(loseAcceptance){loseAcceptance=false;throw new TransportError('CONNECTION_LOST');}
      return receipt;
    }
    if(method==='receipt') return receipt;
    throw new Error(method);
  }} as unknown as ControllerTransport;
  const model=modelRelatedSelection(program,surface,transport,(()=>true) as ValidateInput,()=>{});
  return {model,calls,get memberships(){return memberships;},holdList(value:Promise<void>){holdList=value;}};
}
test('membership editing rereads the candidate, preserves other memberships and commits with its current version',async()=>{
  const fixture=setup();
  await fixture.model.updateContext({readJourneyId:'collections',parentId:parent,editing:true,active:true});
  assert.equal(fixture.model.snapshot().groups[0]?.items[0]?.checked,false);
  await fixture.model.event({kind:'related.change',input:'items',id:item,checked:true});
  assert.equal(fixture.model.snapshot().dirty,true);
  assert.equal(fixture.model.snapshot().revision,0);
  assert.deepEqual(fixture.memberships,[other],'checkbox selection does not execute a write');
  assert.equal(fixture.calls.filter(call=>['prepare','accept'].includes(call.method)).length,0);
  assert.equal(await fixture.model.commit(),true);
  assert.deepEqual(fixture.memberships,[other,parent]);
  const prepared=fixture.calls.find(call=>call.method==='prepare')!.input;
  assert.deepEqual(prepared.options,{expectedVersion:3});
  assert.deepEqual(prepared.input,{collections:[other,parent]});
  assert.equal(fixture.calls.filter(call=>call.method==='read').length,2);
  assert.equal(fixture.model.snapshot().groups[0]?.items[0]?.checked,true);
  assert.equal(fixture.model.snapshot().dirty,false);
  assert.equal(fixture.model.snapshot().committing,false);
});
test('an unknown acceptance locks the editor and recovery checks the same receipt without preparing or accepting twice',async()=>{
  const {model,calls}=setup(true);
  await model.updateContext({readJourneyId:'collections',parentId:parent,editing:true,active:true});
  await model.event({kind:'related.change',input:'items',id:item,checked:true});
  assert.equal(await model.commit(),false);
  assert.equal(model.snapshot().uncertain,true);
  assert.equal(model.snapshot().committing,true);
  await model.event({kind:'related.change',input:'items',id:item,checked:false});
  await model.updateContext({readJourneyId:'collections',parentId:parent,editing:false,active:true});
  assert.equal(model.snapshot().dirty,true,'unconfirmed effects cannot be discarded by closing the draft');
  await model.event({kind:'related.recover',input:'items'});
  assert.equal(model.snapshot().uncertain,false);
  assert.equal(model.snapshot().committing,false);
  assert.equal(calls.filter(call=>call.method==='prepare').length,1);
  assert.equal(calls.filter(call=>call.method==='accept').length,1);
});
test('read-only or unknown candidates cannot mutate and stopping revokes the editor',async()=>{
  const {model,calls}=setup();
  await model.updateContext({readJourneyId:'collections',parentId:parent,editing:false,active:true});
  await model.event({kind:'related.change',input:'items',id:item,checked:true});
  assert.equal(calls.length,0);
  await model.updateContext({readJourneyId:'collections',parentId:parent,editing:true,active:true});
  await model.event({kind:'related.change',input:'items',id:'unknown',checked:true});
  model.stop();
  await model.event({kind:'related.change',input:'items',id:item,checked:true});
  assert.equal(calls.filter(call=>call.method==='prepare').length,0);
});
test('temporary dependency loss preserves uncertain intent and recovery after availability returns',async()=>{
  const {model,calls}=setup(true);
  const context={readJourneyId:'collections',parentId:parent,editing:true,active:true};
  await model.updateContext(context);
  await model.event({kind:'related.change',input:'items',id:item,checked:true});
  await model.updateContext({...context,active:false});
  await model.updateContext(context);
  assert.equal(model.snapshot().dirty,true,'an unsaved selection survives temporary unavailability');
  assert.equal(model.snapshot().groups[0]?.items[0]?.checked,true);
  assert.equal(await model.commit(),false);
  await model.updateContext({...context,active:false,editing:false});
  assert.equal(model.snapshot().uncertain,true);
  assert.equal(model.snapshot().groups[0]?.disabled,true);
  await model.event({kind:'related.recover',input:'items'});
  assert.equal(calls.filter(call=>call.method==='receipt').length,0);
  await model.updateContext(context);
  await model.event({kind:'related.recover',input:'items'});
  assert.equal(model.snapshot().uncertain,false);
  assert.equal(model.snapshot().revision,1);
  assert.equal(calls.filter(call=>call.method==='prepare').length,1);
  assert.equal(calls.filter(call=>call.method==='accept').length,1);
});
test('an editor opened while unavailable hydrates its choices when dependencies recover',async()=>{
  const {model,calls}=setup();
  const context={readJourneyId:'collections',parentId:parent,editing:true,active:false};
  await model.updateContext(context);assert.equal(calls.length,0);
  await model.updateContext({...context,active:true});
  assert.equal(model.snapshot().groups[0]?.items.length,1);
  assert.equal(model.snapshot().groups[0]?.disabled,false);
});
test('Cancel discards the selection draft without writes and reopening loads canonical membership',async()=>{
  const {model,calls}=setup();
  const context={readJourneyId:'collections',parentId:parent,editing:true,active:true};
  await model.updateContext(context);
  await model.event({kind:'related.change',input:'items',id:item,checked:true});
  await model.updateContext({...context,editing:false});
  await model.updateContext(context);
  assert.equal(model.snapshot().dirty,false);
  assert.equal(model.snapshot().groups[0]?.items[0]?.checked,false);
  assert.equal(calls.filter(call=>['prepare','accept'].includes(call.method)).length,0);
});
test('Save during dependency loss retains an explicit recoverable draft rather than silently stranding the host',async()=>{
  const {model,calls}=setup();
  const context={readJourneyId:'collections',parentId:parent,editing:true,active:true};
  await model.updateContext(context);
  await model.event({kind:'related.change',input:'items',id:item,checked:true});
  await model.updateContext({...context,active:false});
  assert.equal(await model.commit(),false);
  assert.equal(model.snapshot().committing,true);
  assert.equal(model.snapshot().groups[0]?.disabled,true);
  assert.match(model.snapshot().groups[0]?.error??'',/Saving paused/);
  assert.equal(calls.filter(call=>call.method==='prepare').length,0);
  await model.updateContext(context);
  assert.match(model.snapshot().groups[0]?.error??'',/Saving paused/);
  await model.event({kind:'related.recover',input:'items'});
  assert.equal(model.snapshot().committing,false);
  assert.equal(model.snapshot().dirty,false);
  assert.equal(calls.filter(call=>call.method==='accept').length,1);
});
test('Save supersedes a pending list refresh and late list pixels cannot restore old membership',async()=>{
  const fixture=setup(),{model,calls}=fixture;
  const context={readJourneyId:'collections',parentId:parent,editing:true,active:true};
  await model.updateContext(context);
  await model.event({kind:'related.change',input:'items',id:item,checked:true});
  await model.updateContext({...context,active:false});
  let release!:()=>void;
  fixture.holdList(new Promise<void>(resolve=>{release=resolve;}));
  const refresh=model.updateContext(context);
  await new Promise<void>(resolve=>setImmediate(resolve));
  assert.equal(model.snapshot().groups[0]?.loading,true);
  assert.equal(await model.commit(),true);
  release();await refresh;
  assert.equal(model.snapshot().committing,false);
  assert.equal(model.snapshot().groups[0]?.loading,false);
  assert.equal(model.snapshot().groups[0]?.items[0]?.checked,true);
  assert.equal(calls.filter(call=>call.method==='accept').length,1);
});
