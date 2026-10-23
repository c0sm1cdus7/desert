import type { ApiMethods, HumanSurface } from "../types.ts";
import type { ViewProgram } from "../../views/program-schema.ts";
import type { ControllerTransport } from "./transport.ts";
import {Check} from '@sinclair/typebox/value';
import {AttentionSignalSchema,attentionTargetKey,objectAttentionKey,type AttentionSignal} from '../../attention.ts';

export type AttentionItem = { readonly id: string; readonly journey: string; readonly title: string;
  readonly description: string; readonly available: boolean; readonly signals:readonly AttentionSignal[] };
export type AttentionSnapshot = { readonly loaded: boolean; readonly items: readonly AttentionItem[]; readonly error: string | null;
  readonly objectSignals:Readonly<Record<string,readonly AttentionSignal[]>> };
export const emptyAttention=():AttentionSnapshot=>({loaded:false,items:[],error:null,objectSignals:{}});

/** The authenticated discovery endpoint owns inclusion. Reading never acknowledges attention. */
export function attentionFeed(program: ViewProgram, surface: HumanSurface, transport: ControllerTransport, notify: () => void) {
  let state: AttentionSnapshot = emptyAttention();
  let epoch = 0, disposed = false,suspended=false,running: Promise<void> | undefined;
  let connecting = false;
  const installed = new Set(program.journeys.filter(item => item.kind === "activity").map(item => item.id));
  const suspendedSnapshot=(error:string|null):AttentionSnapshot=>({loaded:state.loaded||error!==null,
    items:state.items.map(item=>({...item,available:false})),objectSignals:{},error});
  async function read() {
    const version = ++epoch;
    try {
      const items: ApiMethods["activityList"]["output"]["items"][number][] = [];
      const cursors = new Set<string>();
      let after: string | undefined;
      if (installed.size) do {
        const page = await transport.call("activityList", { limit: 100, ...(after ? { after } : {}) });
        if (disposed || suspended||version !== epoch) return;
        items.push(...page.items); after = page.nextCursor;
        if (after && cursors.has(after)) throw new Error("INVALID_ACTIVITY_CURSOR");
        if (after) cursors.add(after);
      } while (after);
      if (disposed || suspended||version !== epoch) return;
      const groups=new Map<string,AttentionItem>(),objectSignals:Record<string,AttentionSignal[]>={},sources=new Set<string>();
      let recipient:string|undefined;
      for(const item of items.filter(item=>installed.has(item.journey))){
        const signal=item.attention;
        if(!Check(AttentionSignalSchema,signal)||signal.source.id!==item.id||signal.source.revision!==item.revision
          ||signal.source.journey!==item.journey||(recipient!==undefined&&recipient!==signal.recipient))throw new Error('INVALID_ATTENTION_SIGNAL');
        recipient=signal.recipient;
        if(sources.has(signal.source.id))continue;sources.add(signal.source.id);
        const key=attentionTargetKey(signal),previous=groups.get(key),signals=[...(previous?.signals ?? []),signal];
        const retained=previous?.available||item.availability!=='available'?previous:undefined;
        groups.set(key,{id:retained?.id ?? item.id,journey:retained?.journey ?? item.journey,
          title:retained?.title ?? surface.language.journeys[item.journey]!,signals,
          description:signals.length>1?`${signals.length} saved activities need your attention.`
            :signal.reason==='activity.compatibility'?'This saved activity needs a compatible version.'
            :signal.reason==='activity.confirm'?'Ready for your confirmation.':'Continue where you left off.',
          available:Boolean(previous?.available||item.availability==='available')});
        if(signal.target.kind==='object') (objectSignals[objectAttentionKey(signal.target.object,signal.target.id)] ??=[]).push(signal);
      }
      state = { loaded: true, error: null,items:[...groups.values()],objectSignals };
    } catch {
      if (disposed || suspended||version !== epoch) return;
      state = suspendedSnapshot("Attention is unavailable. Last loaded items are read-only until reconnected.");
    }
    notify();
  }
  return {
    snapshot: () => state,
    availability(ready:boolean, pending=false){
      if(disposed||suspended===!ready&&connecting===pending)return;
      suspended=!ready;connecting=pending;epoch++;running=undefined;
      state=suspendedSnapshot(ready||pending?null:'Attention is unavailable. Last loaded items are read-only until reconnected.');
    },
    refresh() {
      if (disposed||suspended) return Promise.resolve();
      if(running)return running;
      const pass=read();running=pass;
      return pass.finally(()=>{if(running===pass)running=undefined;});
    },
    dispose() { disposed = true; epoch++; state = emptyAttention(); },
  };
}
