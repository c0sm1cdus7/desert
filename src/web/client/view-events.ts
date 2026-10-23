import { bankEvent, type BankEvent } from "../../interaction/bank-events.ts";
import type { ResolvedPanel, ResolvedView } from "../../views/resolved.ts";

declare const instance: unique symbol;
/** Runtime-local render identity, never a product ID or controller authority. */
export type ViewEventOwner = Readonly<{ epoch: number; [instance]: true }>;
export type OwnedViewEvent = Readonly<{ owner: ViewEventOwner; event: BankEvent }>;
export type OwnedResolvedView = ResolvedView & { readonly owner: ViewEventOwner };
export type OwnedResolvedPanel = ResolvedPanel & { readonly owner: ViewEventOwner };

/** Capture once for the mounted instance, never look up a newer owner on dispatch. */
export function bindViewEvents(owner: ViewEventOwner, send: (value: OwnedViewEvent) => void) {
  return (event: BankEvent) => send(Object.freeze({ owner, event }));
}

export function viewEventOwnership() {
  const issued = new WeakSet<object>();
  let epoch = 0, stopped = false;
  let previous: readonly unknown[] | undefined;
  let owners: { main: ViewEventOwner; panel: ViewEventOwner | null };
  function issue(): ViewEventOwner {
    const owner = Object.freeze({ epoch: ++epoch }) as ViewEventOwner;
    issued.add(owner);
    return owner;
  }
  return {
    sync(identity: readonly unknown[], panel: boolean) {
      if (!previous || identity.length !== previous.length || identity.some((part, index) => part !== previous![index])) {
        previous = [...identity];
        owners = { main: issue(), panel: panel ? issue() : null };
      }
      return owners;
    },
    read(value: unknown, policy: { kind: "exclusive" } | { kind: "navigation"; view: string } = { kind: "exclusive" }): BankEvent | null {
      if (stopped) return null;
      if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
        throw new Error("INVALID_VIEW_EVENT_ENVELOPE");
      }
      const entries = Object.getOwnPropertyDescriptors(value), keys = Reflect.ownKeys(entries);
      if (keys.length !== 2 || !entries.owner || !entries.event ||
        !("value" in entries.owner) || !("value" in entries.event)) throw new Error("INVALID_VIEW_EVENT_ENVELOPE");
      const owner: unknown = entries.owner.value;
      if (!owner || typeof owner !== "object" || !issued.has(owner)) throw new Error("INVALID_VIEW_EVENT_OWNER");
      if (owner !== owners.main && owner !== owners.panel) return null;
      const event = bankEvent(entries.event.value);
      if (owner === owners.panel || !owners.panel) return event;
      return policy.kind === "navigation" && event.kind === "surface.invoke" && (event.intent.kind === "back" ||
        event.intent.kind === "view.output" && event.intent.view === policy.view) ? event : null;
    },
    stop() { stopped = true; },
  };
}
