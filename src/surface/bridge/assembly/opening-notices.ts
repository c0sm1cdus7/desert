// Shows opening notices in the house thread until continuing to the menu.
import { journalTexts } from "../../../texts/journal.texts.ts";
import type { Router } from "../../router/router.ts";
export function withOpeningNotices(router: Router, notices: readonly string[]): Router {
  let pending = notices.length > 0;
  return {
    ...router,
    screen: viewport => {
      const screen = router.screen(viewport);
      return pending
        ? {
            ...screen,
            title: journalTexts.opening,
            body: { kind: "thread", events: notices.map(text => ({ text: [{ text, tone: "t1" }] })) },
            hints: [{ intent: "confirm", does: journalTexts.continue }],
            menu: true,
          }
        : screen;
    },
    send: intent => {
      if (!pending || intent.kind === "quit") return router.send(intent);
      if (["confirm", "cancel", "menu"].includes(intent.kind)) pending = false;
      return true;
    },
  };
}
