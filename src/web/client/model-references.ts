import type { HumanSurface, Prepared, ValidateInput } from '../types.ts';
import type { HumanStore } from './state.ts';
import type { ControllerTransport } from './transport.ts';
import { acceptanceOutcomeUnknown } from './transport.ts';
import { requireMutationReceipt } from './mutation-receipt.ts';
import type { ReferenceEvent, ReferenceState } from '../../interaction/labels-control.ts';

/** Canonical companion reads/creates. This owner never swaps or submits the host draft. */
export function modelReferences(surface:HumanSurface,store:HumanStore,transport:ControllerTransport,active:()=>boolean,validate:ValidateInput,object?:string) {
  const capabilities=Object.fromEntries(Object.entries(surface.fieldReferences ?? {}).filter(([key]) => object !== undefined && key.startsWith(`${object}.`)));
  let generation=0;
  let stopped=false;
  type Origin={journey:string|undefined;values:unknown;subject:string|undefined};
  type Operation={key:string;epoch:number};
  let operation:Operation|undefined;
  const pending=new Map<string,Prepared>();
  const origins=new Map<string,Origin>();
  const loading=new Map<string,{epoch:number;promise:Promise<boolean>}>();
  function base(key:string):ReferenceState {
    const ref=capabilities[key]!;
    return {options:[],loading:false,busy:false,uncertain:false,...(ref.create ? {createLabel:surface.language.journeys[ref.create]!} : {}),colors:ref.colors,maxLength:ref.maxLength};
  }
  function update(key:string,patch:Partial<Omit<ReferenceState,'error'>> & {error?:string|undefined}) {
    const {error:previous,...before}=store.get().references?.[key] ?? base(key);
    const {error,...changes}=patch;
    const shown=Object.hasOwn(patch,'error') ? error : previous;
    if (active()) store.update({references:{...store.get().references,[key]:{...base(key),...before,...changes,...(shown ? {error:shown} : {})}}});
  }
  function currentKey(field:string) {
    const state=store.get();
    const journey=surface.journeys.find(item => item.id === (state.editing?.journeyId ?? state.creationJourneyId));
    if (!['create','edit'].includes(state.view) || journey?.kind !== 'mutation' || !journey.inputFields.includes(field)) return;
    const key=`${journey.object}.${field}`;
    return capabilities[key] ? key : undefined;
  }
  function load(key:string,fresh=false):Promise<boolean> {
    const capability=capabilities[key];
    const epoch=generation,previous=loading.get(key);
    if(previous)return fresh ? previous.promise.then(()=>generation===epoch ? load(key,true) : false) : previous.promise;
    if (!capability || stopped || !active() || !store.get().availability.journeys[capability.read]?.dependenciesReady) return Promise.resolve(false);
    // Install the request before publishing loading, so a subscriber cannot create a duplicate.
    const promise:Promise<boolean>=Promise.resolve().then(async()=>{
      try {
        if(stopped || !active() || epoch!==generation)return false;
        update(key,{loading:true});
        const run=await transport.call('begin',{journeyId:capability.read});
        if (!active() || epoch !== generation) return false;
        const records=await transport.call('read',{runId:run.id});
        if (!active() || epoch !== generation) return false;
        const journey=surface.journeys.find(item => item.id === capability.read);
        if (journey?.kind !== 'read' || !Array.isArray(records) || records.some(record =>
          !/^[a-f0-9-]{36}$/.test(record.id) || typeof record.facts[capability.label] !== 'string'
          || String(record.facts[capability.label]).length > capability.maxLength || capability.color && !capability.colors.includes(String(record.facts[capability.color])))) throw new Error('INVALID_REFERENCE_RESPONSE');
        const options=records.map(record => ({value:record.id,label:String(record.facts[capability.label]),...(capability.color ? {color:String(record.facts[capability.color])} : {})}));
        update(key,{options,loading:false,...(store.get().references?.[key]?.error==='Could not load choices. Try again.' ? {error:undefined} : {})});
        return true;
      } catch { if (active() && epoch === generation) update(key,{loading:false,error:'Could not load choices. Try again.'}); return false; }
      finally { if(loading.get(key)?.promise===promise)loading.delete(key); }
    });
    loading.set(key,{epoch,promise});
    return promise;
  }
  async function finish(key:string,prepared:Prepared) {
    const capability=capabilities[key]!;
    const journey=surface.journeys.find(item => item.id === capability.create);
    const receipt=await transport.call('accept',{intentId:prepared.id,confirmationDigest:prepared.confirmationDigest});
    requireMutationReceipt(prepared,journey,receipt);
    return receipt;
  }
  async function event(event:ReferenceEvent) {
    const key=currentKey(event.control); if (!key || !active()) return;
    if (event.kind === 'reference.refresh') { await load(key); return; }
    const capability=capabilities[key]!, state=store.get();
    if (!capability.create) return;
    if (state.busy) return;
    if (!state.availability.journeys[capability.create]?.dependenciesReady) {
      update(key,{error:'Creation is unavailable. Try again when the connection is ready.'}); return;
    }
    if(state.uncertain && event.kind!=='reference.recover' || event.kind==='reference.recover' && !pending.has(key))return;
    if (event.kind === 'reference.create' && pending.has(key)) return;
    const host=surface.journeys.find(item => item.id === (state.editing?.journeyId ?? state.creationJourneyId));
    const max=host?.kind === 'mutation' ? host.inputSchema.properties[event.control]?.maxItems : undefined;
    const values=state.draft[event.control];
    if (event.kind === 'reference.create' && (!Array.isArray(values) || typeof max !== 'number' || values.length >= max)) return;
    const currentOperation=operation={key,epoch:generation};
    const owns=()=>!stopped && active() && operation===currentOperation && generation===currentOperation.epoch;
    const origin=origins.get(key) ?? {values:state.draft[event.control],journey:host?.id,subject:state.editing?.subject};
    store.update({busy:true}); update(key,{busy:true,error:undefined});
    try {
      let prepared=pending.get(key);
      const journey=surface.journeys.find(item => item.id === capability.create);
      if (journey?.kind !== 'mutation' || journey.subject) throw new Error('INVALID_REFERENCE_CAPABILITY');
      if (event.kind === 'reference.create') {
        const input={[capability.label]:event.name,...(capability.color ? {[capability.color]:event.color} : {})};
        if (!validate(journey.commandId,input) || capability.color && (!event.color || !capability.colors.includes(event.color))) throw new Error('INVALID_REFERENCE_INPUT');
        const run=await transport.call('begin',{journeyId:journey.id});
        if (!owns()) return;
        prepared=await transport.call('prepare',{runId:run.id,input});
        if (!owns()) return;
        if (prepared.runId !== run.id || prepared.journeyId !== journey.id || prepared.object.type !== capability.object) throw new Error('INVALID_REFERENCE_RESPONSE');
        pending.set(key,prepared); origins.set(key,origin);
      }
      if (!prepared || !owns()) return;
      let receipt=event.kind === 'reference.recover' ? await transport.call('receipt',{intentId:prepared.id}) : null;
      if(!owns())return;
      if (!receipt) receipt=await finish(key,prepared);
      requireMutationReceipt(prepared,journey,receipt);
      if (!owns()) return;
      const loaded=await load(key,true);
      if (!owns()) return;
      if(!loaded){
        update(key,{uncertain:true,error:'The item was created, but choices could not be refreshed. Check this same operation.'});
        store.update({uncertain:true}); return;
      }
      const current=store.get();
      const sameDraft=currentKey(event.control) === key && (current.editing?.journeyId ?? current.creationJourneyId) === origin.journey
        && current.editing?.subject===origin.subject && current.draft[event.control]===origin.values;
      if (sameDraft) {
        const before=current.draft[event.control],values=Array.isArray(before) ? before : [];
        if (!values.includes(receipt.object.id)) store.update({draft:{...current.draft,[event.control]:[...values,receipt.object.id]},
          draftRevision:current.draftRevision+1,touchedFields:[...new Set([...current.touchedFields,event.control])]});
      }
      pending.delete(key); origins.delete(key);
      update(key,{uncertain:false,error:sameDraft ? undefined : 'The item was created. Select it in the current draft.'}); store.update({uncertain:pending.size>0});
    } catch (error) {
      if (!owns()) return;
      const uncertain=pending.has(key) && acceptanceOutcomeUnknown(error);
      if (!uncertain) {pending.delete(key);origins.delete(key);}
      update(key,{uncertain,error:uncertain ? 'The result is not confirmed. Check this same operation.' : 'Could not create this item. Check the name and try again.'});
      store.update({uncertain:pending.size>0});
    } finally {
      if(operation===currentOperation){
        operation=undefined;
        if(!stopped){
          const before=store.get().references?.[key] ?? base(key),interrupted=!active() || generation!==currentOperation.epoch;
          const uncertain=pending.has(key);
          store.update({busy:false,...(interrupted ? {uncertain:pending.size>0} : {}),references:{...store.get().references,
            [key]:{...before,busy:false,...(interrupted ? {uncertain,error:uncertain
              ? 'Creation was interrupted. Check this same operation.' : 'Creation was interrupted. Try again.'} : {})}}});
        }
      }
    }
  }
  return {event,refresh(){return Promise.all(Object.keys(capabilities).map(key=>load(key))).then(()=>{});},
    invalidate(){
      generation++;loading.clear();
      const interrupted=operation;operation=undefined;
      const previous=store.get().references ?? {};
      const keys=[...new Set([...pending.keys(),...Object.keys(previous).filter(key=>previous[key]?.error),...(interrupted ? [interrupted.key] : [])])];
      const references=Object.fromEntries(keys.map(key=>[key,
        {...base(key),uncertain:pending.has(key),error:pending.has(key)
          ? 'Creation was interrupted. Check this same operation.' : interrupted?.key===key
            ? 'Creation was interrupted. Try again.' : previous[key]!.error!}]));
      store.update({references,...(interrupted ? {busy:false,uncertain:pending.size>0} : pending.size ? {uncertain:true} : {})});
    },
    stop(){stopped=true;generation++;operation=undefined;pending.clear();origins.clear();loading.clear();}};
}
