import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "../src/compile.ts";
import { attentionFeed } from "../src/web/client/attention-feed.ts";
import type { ControllerTransport } from "../src/web/client/transport.ts";
import { ActivityNotebook, guidedProgram } from "./fixtures/activity-experience.ts";
import type { HumanSurface } from "../src/web/types.ts";
import { compileViewProgram } from "../src/views/program.ts";
import {objectAttentionKey,type AttentionSignal} from '../src/attention.ts';
const uuid=(n:number)=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const signal=(n:number,target?:AttentionSignal['target']):AttentionSignal=>({version:'desert.attention/1',
  source:{kind:'activity',id:uuid(n),revision:1,journey:'create-note'},recipient:'identity-a',
  target:target ?? {kind:'activity',id:uuid(n)},reason:'activity.resume',resolution:'producer'});

test('initial connection observation is loading, not a false empty result or connection failure', () => {
  const surface=compile(ActivityNotebook).surface('human') as HumanSurface;
  const feed=attentionFeed(compileViewProgram(guidedProgram,surface),surface,{} as ControllerTransport,()=>{});
  feed.availability(false, true);
  assert.equal(feed.snapshot().loaded,false);
  assert.equal(feed.snapshot().error,null);
  feed.availability(false, false);
  assert.ok(feed.snapshot().error,'a real failed observation is still disclosed');
  feed.dispose();
});

test("Attention only discovers existing scoped activities, handles all pages and never acknowledges them", async () => {
  const surface = compile(ActivityNotebook).surface("human") as HumanSurface;
  const program = compileViewProgram(guidedProgram, surface);
  const calls: string[] = [];
  const item = (n: number, phase:"draft"|"prepared") => ({id:uuid(n),journey:"create-note",phase,revision:1,
    attention:{...signal(n),reason:phase==='draft'?'activity.resume':'activity.confirm'},
    availability:"available" as const,createdAt:"2026-10-22T12:00:00Z",expiresAt:"2026-11-22T12:00:00Z"});
  const transport = { call: async (method:string,input: {after?:string}) => {
    calls.push(method);
    assert.equal(method,"activityList");
    return input.after ? {items:[item(2,"prepared")]} : {items:[item(1,"draft")],nextCursor:uuid(1)};
  } } as unknown as ControllerTransport;
  const feed = attentionFeed(program,surface,transport,()=>{});
  await feed.refresh();
  assert.deepEqual(feed.snapshot().items.map(item=>item.id),[uuid(1),uuid(2)]);
  assert.deepEqual(calls,["activityList","activityList"]);
  await feed.refresh();
  assert.equal(feed.snapshot().items.length,2,"Viewing does not dismiss attention");
  feed.dispose();
  assert.equal(feed.snapshot().items.length,0,"No private cache survives disposal");
});

test('one signal projection deduplicates targets, retains read-only cached items on disconnect, and never infers domain state',async()=>{
  const surface=compile(ActivityNotebook).surface('human') as HumanSurface;
  const program=compileViewProgram(guidedProgram,surface);
  const target={kind:'object' as const,object:'note',id:uuid(9)};
  const records=[signal(1,target),signal(2,target)];
  let fail=false;
  const feed=attentionFeed(program,surface,{call:async()=>{
    if(fail)throw new Error('offline');
    return {items:records.map(attention=>({id:attention.source.id,revision:1,journey:'create-note',phase:'draft',availability:'available',attention}))};
  }} as unknown as ControllerTransport,()=>{});
  await feed.refresh();
  assert.equal(feed.snapshot().items.length,1);
  assert.deepEqual(feed.snapshot().items[0]!.signals,records);
  assert.deepEqual(feed.snapshot().objectSignals[objectAttentionKey('note',uuid(9))],records);
  assert.equal(feed.snapshot().objectSignals[objectAttentionKey('task','Open')],undefined);
  feed.availability(false);
  assert.deepEqual(feed.snapshot().objectSignals,{});assert.ok(feed.snapshot().error);
  assert.equal(feed.snapshot().items.length,1);assert.equal(feed.snapshot().items[0]!.available,false);
  feed.availability(true);assert.equal(feed.snapshot().loaded,true);
  assert.equal(feed.snapshot().items[0]!.available,false,'a reconnected transport does not authorize stale cached resume');
  fail=true;await feed.refresh();assert.ok(feed.snapshot().error);assert.equal(feed.snapshot().items.length,1);
  fail=false;await feed.refresh();assert.equal(feed.snapshot().items.length,1);
  feed.dispose();assert.deepEqual(feed.snapshot().objectSignals,{});
});

test('malformed or mixed-identity signals fail closed instead of becoming counts',async()=>{
  const surface=compile(ActivityNotebook).surface('human') as HumanSurface;
  const program=compileViewProgram(guidedProgram,surface);
  for(const values of [[{...signal(1),recipient:'a'},{...signal(2),recipient:'b'}],[{...signal(1),reason:'open'}]]){
    const feed=attentionFeed(program,surface,{call:async()=>({items:values.map(attention=>({id:attention.source.id,revision:1,journey:'create-note',phase:'draft',availability:'available',attention}))})} as unknown as ControllerTransport,()=>{});
    await feed.refresh();assert.ok(feed.snapshot().error);assert.deepEqual(feed.snapshot().objectSignals,{});feed.dispose();
  }
});

test("An old identity's delayed response cannot repopulate a disposed feed", async () => {
  const surface = compile(ActivityNotebook).surface("human") as HumanSurface;
  const program = compileViewProgram(guidedProgram,surface);
  let finish!: (value:unknown)=>void;
  const response = new Promise(resolve=>{finish=resolve;});
  const feed = attentionFeed(program,surface,{call:()=>response} as unknown as ControllerTransport,()=>{});
  const pending = feed.refresh(); feed.dispose();
  finish({items:[{id:"old-private-activity",journey:"create-note",phase:"draft",availability:"available"}]});
  await pending;
  assert.deepEqual(feed.snapshot().items,[]);
});
