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
