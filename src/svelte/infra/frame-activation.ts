// The nonvisual half of frame continuity: a main-view action enters a retained panel once. The action records the frame
// it leaves (a string key, ViewEventOwner.key); the frame change away from it claims the activation exactly once; an
// unclaimed one expires after the update. Where focus was, and whether it moved away, belong to an observing foundation
// (the modal), which may cancel; this module holds no element.
import { getContext, onDestroy, setContext, tick } from "svelte";

/** What an observer learns when an activation starts; `cancel` ends it (focus moved elsewhere before the frame changed). */
export type FrameActivationStart = Readonly<{ id: string; previous: string; cancel: () => void }>;
/** The claim of the frame that replaced `previous`: current until it finishes, is cancelled or is replaced. */
export type FrameActivationClaim = Readonly<{ id: string; current: () => boolean; finish: () => void }>;
/** Called at each start; the function it returns, if any, runs once when that activation ends. */
export type FrameActivationObserver = (start: FrameActivationStart) => (() => void) | void;

export type FrameActivation = Readonly<{
  activate: (previous: string, invoke: () => void) => void;
  take: (previous: string | undefined, next: string | undefined) => FrameActivationClaim | undefined;
  observe: (observer: FrameActivationObserver) => () => void;
  dispose: () => void;
}>;

type Pending = { id: string; previous: string; claimed: boolean; releases: (() => void)[] };

export function frameActivation(): FrameActivation {
  const observers = new Set<FrameActivationObserver>();
  let pending: Pending | undefined, issued = 0;
  const clear = (entry: Pending) => {
    if (pending !== entry) return;
    pending = undefined;
    for (const release of entry.releases) release();
  };
  return Object.freeze({
    activate(previous: string, invoke: () => void) {
      if (pending) clear(pending);
      issued += 1;
      const entry: Pending = { id: `activation-${issued}`, previous, claimed: false, releases: [] };
      pending = entry;
      const start: FrameActivationStart = Object.freeze({ id: entry.id, previous, cancel: () => clear(entry) });
      for (const observer of observers) {
        const release = observer(start);
        if (release) entry.releases.push(release);
      }
      try { invoke(); } catch (error) { clear(entry); throw error; }
      void tick().then(() => { if (!entry.claimed) clear(entry); });
    },
    take(previous: string | undefined, next: string | undefined) {
      const entry = pending;
      if (!entry || entry.claimed || entry.previous !== previous || next === previous) return undefined;
      entry.claimed = true;
      return Object.freeze({ id: entry.id, current: () => pending === entry, finish: () => clear(entry) });
    },
    observe(observer: FrameActivationObserver) {
      observers.add(observer);
      return () => { observers.delete(observer); };
    },
    dispose() { if (pending) clear(pending); },
  });
}

const key = Symbol("desert.frame-activation");

/** Provides one activation to the component subtree being initialised, disposed when that component is destroyed. */
export function provideFrameActivation(): FrameActivation {
  const activation = frameActivation();
  onDestroy(activation.dispose);
  return setContext(key, activation);
}

/** The activation provided above the component being initialised, if any. */
export function useFrameActivation(): FrameActivation | undefined {
  return getContext<FrameActivation | undefined>(key);
}
