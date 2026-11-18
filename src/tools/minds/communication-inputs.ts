// Publica los datos de comunicación de la mente para validarlos y aplicar reglas del core.
import { Type } from "@sinclair/typebox";
import { object } from "../../fields/visible-text.ts";
import { scene } from "../../house/own-acts.ts";
import { mindText } from "../../house/minds/journey-facts.ts";
export const communicationInputs = {
  scene,
  message: object({ to: Type.String(), text: mindText }),
};
