// Shows opening notices in the house thread until continuing to the menu, in the language of the screen under them.
import { said, wordsIn, type Text } from "../../../fields/phrases.ts";
import { journalTexts } from "../../../texts/journal.texts.ts";
import type { Router } from "../../router/router.ts";
export function withOpeningNotices(router: Router, notices: readonly Text[]): Router {
  let pending = notices.length > 0;
  return {
    ...router,
    screen: viewport => {
      const screen = router.screen(viewport);
      const words = wordsIn(journalTexts, screen.language);
      return pending
        ? {
            ...screen,
            title: words.opening,
            body: {
              kind: "thread",
              events: notices.map(text => ({ text: [{ text: said(text, screen.language), tone: "t1" }] })),
            },
            hints: [{ intent: "confirm", does: words.continue }],
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
