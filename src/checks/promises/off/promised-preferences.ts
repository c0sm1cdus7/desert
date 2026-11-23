// Preferences used by derived checks are changed through the same keys a person uses.
import { strictEqual } from "node:assert/strict";
import type { Hideable } from "../../../house/own-acts.ts";
import { genericTexts as generic } from "../../../texts/generic-surface.texts.ts";
import { surfaceTexts as surface } from "../../../texts/surface.texts.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import { type, view, type Seat } from "../promised-keys.ts";
const preferences = generic.preferences;
/** A preference set the way a person sets it: Preferences from the Menu, the row of what to hide, and the answer. */
export async function prefer<X extends Program>(seat: Seat<X>, what: Hideable, hide: boolean): Promise<void> {
  const { router } = seat;
  type(router, preferences.key);
  strictEqual(router.screen(view).title, seat.say(preferences.name));
  type(router, preferences[what].key + (hide ? preferences.hide.key : preferences.show.key));
  await router.idle();
  router.send({ kind: "cancel" });
  router.send({ kind: "menu" });
  strictEqual(router.screen(view).title, seat.say(surface.menu));
}
