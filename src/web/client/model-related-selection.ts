import { Check } from '@sinclair/typebox/value';
import { AssetReferenceSchema, type AssetReference } from '../../assets/types.ts';
import type { RelatedSelectionEvent, RelatedSelectionGroup, RelatedSelectionSnapshot } from '../../interaction/related-selection.ts';
import type { ViewProgram, ViewJourney } from '../../views/program-schema.ts';
import { viewInputs } from '../../views/ports.ts';
import type { HumanSurface, Prepared, RecordView, ValidateInput } from '../types.ts';
import { acceptanceOutcomeUnknown, TransportError, type ControllerTransport } from './transport.ts';
import { requireMutationReceipt } from './mutation-receipt.ts';
import { privateImageAccess, type PrivateImageContext } from './private-images.ts';

type Context={readJourneyId?:string;parentId?:string;editing:boolean;active:boolean};
type Binding=NonNullable<Extract<ViewJourney,{kind:'read'}>['related']>[number];
type State={binding:Binding;records:readonly RecordView[];group:RelatedSelectionGroup;desired:Map<string,boolean>;loadRevision:number;
  pending?:{prepared:Prepared;id:string;checked:boolean;values:readonly string[]}};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

/** Membership choices are a draft until the host explicitly saves. Sequential
 * canonical writes retain confirmed progress and uncertain receipts, not rollback. */
export function modelRelatedSelection(program:ViewProgram,surface:HumanSurface,transport:ControllerTransport,validate:ValidateInput,changed:()=>void) {
  let context:Context|undefined, generation=0, stopped=false, revision=0, committing=false;
  const states=new Map<string,State>();
  const active=()=>!stopped && context?.active && context.editing;
  const alive=(epoch:number)=>!stopped && epoch===generation;
  const current=(epoch:number)=>active() && epoch===generation;
  const snapshot=():RelatedSelectionSnapshot=>({groups:[...states.values()].map(state=>({...state.group,disabled:!active()})),
    busy:[...states.values()].some(state=>state.group.busy),uncertain:[...states.values()].some(state=>state.group.uncertain),
    dirty:[...states.values()].some(state=>state.desired.size>0),committing,revision});
  const images=privateImageAccess(imageContext);
  function patch(state:State,changes:Partial<RelatedSelectionGroup>) {state.group={...state.group,...changes};images.refresh();changed();}
  function imageContext(asset:AssetReference):PrivateImageContext|undefined {
    if(!active() || !transport.image)return;
    for(const state of states.values()) {
      const item=state.group.items.find(item=>item.asset?.reference===asset.reference);
      const record=state.records.find(record=>record.id===item?.id);if(!record)continue;
      const epoch=generation;
      const valid=()=>Boolean(current(epoch) && state.records.some(next=>next.id===record.id && next.version===record.version)
        && state.group.items.some(item=>item.id===record.id && item.asset?.reference===asset.reference));
      return {valid,async read(variant,signal){const run=await transport.call('begin',{journeyId:state.binding.read,subject:record.id});
        if(!valid() || signal.aborted)throw new TransportError('IMAGE_READ_EXPIRED');
        return transport.image!({runId:run.id,reference:asset.reference,variant},{signal});}};
    }
  }
  function recordsValid(records:readonly RecordView[],field:string) {
    return Array.isArray(records) && new Set(records.map(record=>record.id)).size===records.length && records.every(record=>
      uuid.test(record.id) && Number.isSafeInteger(record.version) && record.version>0 &&
      Array.isArray(record.facts[field]) && (record.facts[field] as unknown[]).every(value=>typeof value==='string' && uuid.test(value)));
  }
  function items(state:State,records:readonly RecordView[]) {
    const journey=program.journeys.find(item=>item.id===context?.readJourneyId);
    const view=journey?.kind==='read' ? program.views.find(item=>item.id===journey.detailView) : undefined;
    const port=view && viewInputs(view).find(item=>item.kind==='collection' && item.input===state.binding.input);
    const media=port?.kind==='collection' && port.presentation?.kind==='media-grid' ? port.presentation : undefined;
    return records.map((record,index)=>{
      const value=media && record.facts[media.image.field];
      const asset=value && Check(AssetReferenceSchema,value) ? value : undefined;
      const description=media?.description && record.facts[media.description.field];
      const label=typeof description==='string' && description.trim() ? description : asset
        ? `${asset.media==='video'?'Video':asset.media==='audio'?'Audio':'Image'} ${index+1}`
        : `${state.group.label} ${index+1}`;
      return {id:record.id,label,checked:state.desired.get(record.id) ??
        (record.facts[state.binding.where.field.field] as readonly string[]).includes(context!.parentId!),...(asset?{asset}:{})};
    });
  }
  async function load(state:State) {
    if(!active())return;
    const epoch=generation,request=++state.loadRevision;
    const valid=()=>current(epoch) && request===state.loadRevision;
    patch(state,{loading:true});
    try {
      const run=await transport.call('begin',{journeyId:state.binding.read});if(!valid())return;
      const records=await transport.call('read',{runId:run.id});if(!valid())return;
      if(!recordsValid(records,state.binding.where.field.field))throw new TransportError('INVALID_RESPONSE');
      state.records=records;
      const {error,...group}=state.group;state.group=group;
      patch(state,{items:items(state,records),loading:false});
    } catch {if(valid())patch(state,{loading:false,error:'Could not load items. Try again.'});}
  }
  async function write(state:State,id:string,checked:boolean):Promise<boolean> {
    const capability=state.binding.membership;
    const mutation=surface.journeys.find(item=>item.id===capability?.update);
    if(!active() || !capability || mutation?.kind!=='mutation' || !mutation.subject)return false;
    const epoch=generation;
    const {error,...group}=state.group;state.group=group;patch(state,{busy:true});
    try {
      const recovering=Boolean(state.pending);
      if(!state.pending) {
        const run=await transport.call('begin',{journeyId:state.binding.read,subject:id});if(!current(epoch))return false;
        const records=await transport.call('read',{runId:run.id});if(!current(epoch))return false;
        if(records.length!==1 || records[0]?.id!==id || !recordsValid(records,state.binding.where.field.field))throw new TransportError('INVALID_RESPONSE');
        const record=records[0],before=record.facts[state.binding.where.field.field] as readonly string[];
        if(before.includes(context!.parentId!)===checked){state.desired.delete(id);return true;}
        const values=checked ? [...new Set([...before,context!.parentId!])] : before.filter(value=>value!==context!.parentId);
        const input={[capability.input]:values};
        if(!validate(mutation.commandId,input))throw new TransportError('INVALID_INPUT');
        const execution=await transport.call('begin',{journeyId:mutation.id,subject:id});if(!current(epoch))return false;
        const prepared=await transport.call('prepare',{runId:execution.id,input,options:{expectedVersion:record.version}});if(!alive(epoch))return false;
        if(prepared.runId!==execution.id || prepared.journeyId!==mutation.id || prepared.object.id!==id ||
          prepared.object.type!==mutation.object || prepared.object.expectedVersion!==record.version)throw new TransportError('INVALID_RESPONSE');
        state.pending={prepared,id,checked,values};
        if(!active()){patch(state,{uncertain:true,error:'Saving paused. Check this operation when the connection returns.'});return false;}
      }
      const pending=state.pending;if(!pending || !current(epoch))return false;
      const prepared=pending.prepared;
      let receipt=recovering ? await transport.call('receipt',{intentId:prepared.id}) : null;
      if(!current(epoch))return false;
      if(!receipt)receipt=await transport.call('accept',{intentId:prepared.id,confirmationDigest:prepared.confirmationDigest});
      requireMutationReceipt(prepared,mutation,receipt);if(!alive(epoch))return false;
      state.records=state.records.map(record=>record.id===pending.id ? {...record,version:receipt.object.version,
        facts:{...record.facts,[state.binding.where.field.field]:pending.values}} : record);
      state.desired.delete(pending.id);delete state.pending;revision++;
      patch(state,{uncertain:false,items:items(state,state.records)});return true;
    } catch(error) {
      if(!alive(epoch))return false;
      const uncertain=Boolean(state.pending) && acceptanceOutcomeUnknown(error);
      if(!uncertain)delete state.pending;
      patch(state,{uncertain,error:uncertain?'Some changes may be saved. Check this same operation to continue.'
        :'Saving paused. Changes already saved are kept; try again to finish.'});return false;
    } finally {if(alive(epoch))patch(state,{busy:false});}
  }
  async function commit():Promise<boolean> {
    if(stopped || snapshot().busy)return false;
    if(!snapshot().dirty){committing=false;changed();return true;}
    const epoch=generation;
    committing=true;
    // A refreshed list is not the write base. Discard it and reread each subject
    // below so a late list response cannot overwrite confirmed membership.
    for(const state of states.values()){state.loadRevision++;state.group={...state.group,loading:false};}
    changed();
    if(!active()){
      for(const state of states.values())if(state.desired.size)patch(state,{error:'Saving paused. Try again when the connection returns.'});
      return false;
    }
    for(const state of states.values())for(const [id,checked] of state.desired) {
      if(!await write(state,id,checked)) {
        if(alive(epoch) && !state.group.error)patch(state,{error:'Saving paused. Try again when the connection returns.'});
        return false;
      }
    }
    committing=false;changed();return true;
  }
  async function event(event:RelatedSelectionEvent) {
    const state=states.get(event.input);
    if(!active() || !state || snapshot().busy)return;
    if(event.kind==='related.recover') {if(committing)await commit();else await load(state);return;}
    if(committing || state.group.loading)return;
    const candidate=state.group.items.find(item=>item.id===event.id);
    const record=state.records.find(item=>item.id===event.id);
    if(!candidate || !record || candidate.checked===event.checked)return;
    const base=(record.facts[state.binding.where.field.field] as readonly string[]).includes(context!.parentId!);
    if(base===event.checked)state.desired.delete(event.id);else state.desired.set(event.id,event.checked);
    patch(state,{items:items(state,state.records)});
  }
  async function updateContext(next:Context) {
    if(stopped)return;
    if(committing && context && (context.readJourneyId!==next.readJourneyId || context.parentId!==next.parentId || !next.editing)) {
      // Retaining an uncertain write never retains authority or pixel leases.
      if(!next.active){context={...context,active:false};images.refresh();changed();}
      return;
    }
    if(context && context.readJourneyId===next.readJourneyId && context.parentId===next.parentId && context.editing===next.editing && context.active===next.active)return;
    if(context && context.readJourneyId===next.readJourneyId && context.parentId===next.parentId && context.editing===next.editing && (states.size>0 || !next.active)){
      context=next;images.refresh();changed();
      if(active() && !snapshot().busy && !committing)await Promise.all([...states.values()].map(load));
      return;
    }
    generation++;context=next;states.clear();
    const read=program.journeys.find(item=>item.id===next.readJourneyId);
    if(active() && next.parentId && uuid.test(next.parentId) && read?.kind==='read')for(const binding of read.related??[]) {
      if(!binding.membership)continue;
      states.set(binding.input,{binding,records:[],desired:new Map(),loadRevision:0,group:{input:binding.input,label:surface.language.journeys[binding.read]??'Items',items:[],loading:false,busy:false,uncertain:false}});
    }
    images.refresh();changed();await Promise.all([...states.values()].map(load));
  }
  return {updateContext,event,commit,snapshot,images,stop(){generation++;stopped=true;committing=false;context=undefined;states.clear();images.close();}};
}
