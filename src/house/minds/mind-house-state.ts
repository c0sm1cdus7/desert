// Integra pliegues de mentes en la casa y conserva referencias cuando un hecho no los cambia.
import { mindHouseCatalog, type HouseEvent } from "../facts.ts";
import type { House } from "../members.ts";
import { assistantStep } from "../assistants/assistant-state.ts";
import { mindSettingsStep } from "./mind-settings.ts";
import { mindStep } from "./mind-state.ts";
import { journeyStep } from "./journey-state.ts";
import { modelCallStep } from "./model-call-state.ts";
export function mindHouseStep(state: House, event: HouseEvent): House {
  if (event.kind === "boot") return mindSettingsStep(state, event);
  if (!Object.hasOwn(mindHouseCatalog, event.kind)) return state;
  state = assistantStep(state, event);
  state = mindSettingsStep(state, event);
  const minds = mindStep(state.minds, event);
  const journeys = journeyStep(state.journeys, event);
  const modelCalls = modelCallStep(state.modelCalls, event);
  return minds === state.minds && journeys === state.journeys && modelCalls === state.modelCalls
    ? state
    : { ...state, minds, journeys, modelCalls };
}
