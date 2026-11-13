// Rendering and choosing are program execution too: their defects get one public screen and a support record.
import { surfaceTexts } from "../../texts/surface.texts.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import type { Screen } from "../contract.ts";
import type { Router } from "../router.ts";
import type { Bar, Session } from "../screen.ts";
import type { Tool } from "../shown-tool.ts";

export type DefectReporter = (error: unknown, tool: string, target: string, option: string) => string;
export function routerDefects(tools: readonly Tool[], session: () => Session, bar: () => Bar, report?: DefectReporter) {
  let reason: string | undefined;
  const failed = (error: unknown): string => {
    const place = session().at(-1);
    const tool = place && "tool" in place ? place.tool : "program";
    const option = place?.kind === "act" ? place.act : tool;
    const target = place && "target" in place ? (place.target ?? tool) : tool;
    const known = tools.find(known => known.id === tool);
    const label = known?.acts[option]?.label ?? known?.actsOn?.[option]?.label ?? option;
    reason = toolTexts.defect(label);
    reason = report?.(error, tool, target, option) ?? reason;
    return reason;
  };
  const screen = (): Screen => ({
    state: bar().state,
    clock: bar().clock,
    title: surfaceTexts.error,
    body: { kind: "thread", events: [{ text: [{ text: reason ?? "", tone: "cut" }] }] },
    hints: [{ intent: "cancel", does: surfaceTexts.keys.goBack }],
    menu: true,
  });
  const protect = (router: Router) =>
    protectRouter(
      router,
      screen,
      failed,
      () => reason,
      () => {
        reason = undefined;
      },
    );
  return { failed, protect };
}
function protectRouter(
  router: Router,
  screen: () => Screen,
  failed: (error: unknown) => string,
  reason: () => string | undefined,
  clear: () => void,
): Router {
  return {
    ...router,
    screen: viewport => {
      if (reason() !== undefined) return screen();
      try {
        return router.screen(viewport);
      } catch (error) {
        failed(error);
        return screen();
      }
    },
    send: intent => {
      try {
        if (reason() === undefined) return router.send(intent);
        if (intent.kind !== "cancel" && intent.kind !== "menu") return true;
        clear();
        return router.send({ kind: "menu" });
      } catch (error) {
        failed(error);
        return true;
      }
    },
  };
}
