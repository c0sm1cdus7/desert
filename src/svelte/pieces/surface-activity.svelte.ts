import { getContext, setContext, untrack } from 'svelte';

const activityKey = Symbol('desert.surface-activity');
export function provideSurfaceActivity(active: () => boolean): void { setContext(activityKey, active); }
export function dismissWhenInactive(dismiss: () => void): void {
  const active = getContext<(() => boolean) | undefined>(activityKey);
  $effect(() => { if (active && !active()) untrack(dismiss); });
}
