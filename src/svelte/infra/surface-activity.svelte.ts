import { getContext, setContext, untrack } from 'svelte';

const activityKey = Symbol('desert.surface-activity');
export function provideSurfaceActivity(active: () => boolean): void {
  const parent = getContext<(() => boolean) | undefined>(activityKey);
  setContext(activityKey, () => (parent?.() ?? true) && active());
}
export function dismissWhenInactive(dismiss: () => void): void {
  const active = getContext<(() => boolean) | undefined>(activityKey);
  $effect(() => { if (active && !active()) untrack(dismiss); });
}
