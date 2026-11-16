// Rendering and choosing are program execution too: their defects get one public screen and a support record.
import { InvalidMoney } from "../invalid-money.ts";
import { surfaceTexts } from "../../texts/surface.texts.ts";
import type { Screen } from "../contract.ts";
import type { Router } from "../router.ts";
import type { Bar, Session } from "../screen.ts";

export type DefectReporter = (error: unknown, tool: string, target: string, option: string) => string;
export function routerDefects(
  session: () => Session,
  bar: () => Bar,
  report: DefectReporter,
  back: () => void,
  before: () => void = () => {},
) {
  let reason: string | undefined;
  const failed = (error: unknown): string => {
    const place = session().at(-1);
    const tool = place && "tool" in place ? place.tool : "program";
    const option = place?.kind === "act" ? place.act : tool;
    const target = place && "target" in place ? (place.target ?? tool) : tool;
    reason = "";
    const reported = report(error, tool, target, option);
    reason = error instanceof InvalidMoney ? `${reported} · ${surfaceTexts.invalidMoney(error.field)}` : reported;
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
        back();
      },
      before,
    );
  return { failed, protect };
}
function protectRouter(
  router: Router,
  screen: () => Screen,
  failed: (error: unknown) => string,
  reason: () => string | undefined,
  clear: () => void,
  before: () => void,
): Router {
  return {
    ...router,
    screen: viewport => {
      if (reason() !== undefined) return screen();
      try {
        before();
        return router.screen(viewport);
      } catch (error) {
        failed(error);
        return screen();
      }
    },
    send: intent => {
      try {
        before();
        if (reason() === undefined) return router.send(intent);
        if (intent.kind !== "cancel" && intent.kind !== "menu") return true;
        clear();
        return intent.kind === "menu" ? router.send(intent) : true;
      } catch (error) {
        failed(error);
        return true;
      }
    },
  };
}
