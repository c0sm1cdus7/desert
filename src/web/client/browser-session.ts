import type { viewProgramModel } from "./view-program.ts";

type Model = ReturnType<typeof viewProgramModel>;

/** Browser session lifecycle, without any visual or command-execution authority. */
export function mountBrowserSession(model: Model, changed: (snapshot: ReturnType<Model["snapshot"]>) => void): () => void {
  const unsubscribe = model.subscribe(() => changed(model.snapshot()));
  const invitation = new URLSearchParams(location.hash.slice(1)).get("access");
  history.replaceState(null, "", location.pathname + location.search);
  void model.start(invitation ?? undefined);
  const protectDraft = (event: BeforeUnloadEvent) => {
    const { state } = model.snapshot();
    if (Object.values(state.draft).some(Boolean) || state.prepared) {
      event.preventDefault(); event.returnValue = "";
    }
  };
  window.addEventListener("beforeunload", protectDraft);
  return () => {
    unsubscribe(); model.stop();
    window.removeEventListener("beforeunload", protectDraft);
  };
}

/** What the access lifecycle drives: the access client's subscription, start, refresh and stop. */
type AccessSessionClient = Readonly<{
  subscribe: (listener: () => void) => () => void;
  start: (invitation?: string) => Promise<void>;
  refresh: () => Promise<void>;
  stop: () => void;
}>;

/** How often a visible page asks the controller whether its access changed. */
const accessRefreshInterval = 5000;

/** Access lifecycle (DESIGN §8 Q3): consume the launch invitation once, start the client, and refresh it every five
 * seconds and whenever the page returns to view (window focus, visible again), but only while the page is visible. */
export function mountAccessSession(client: AccessSessionClient, changed: () => void): () => void {
  const unsubscribe = client.subscribe(changed);
  const invitation = new URLSearchParams(location.hash.slice(1)).get("access");
  history.replaceState(null, "", location.pathname + location.search);
  void client.start(invitation ?? undefined);
  const refresh = () => { if (document.visibilityState === "visible") void client.refresh(); };
  let timer = setTimeout(function tick() { timer = setTimeout(tick, accessRefreshInterval); refresh(); }, accessRefreshInterval);
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", refresh);
  return () => {
    unsubscribe(); client.stop(); clearTimeout(timer);
    window.removeEventListener("focus", refresh);
    document.removeEventListener("visibilitychange", refresh);
  };
}
