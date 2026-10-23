import type { AccessLockBarrier } from "../../src/web/client/access.ts";

export function accessLockFixture(): AccessLockBarrier {
  let locked = false;
  let generation = 0;
  const listeners = new Set<() => void>();
  return {
    isLocked: () => locked,
    lock() { locked = true; for (const listener of listeners) listener(); },
    clear() { locked = false; for (const listener of listeners) listener(); },
    generation: () => String(generation),
    advance() { generation++; for (const listener of listeners) listener(); },
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
