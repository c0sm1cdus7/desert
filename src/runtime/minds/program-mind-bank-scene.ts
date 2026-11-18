// Corre una escena del banco con el motor y el runtime reales, estado aislado y la cuenta durable de la casa.
import type { MindDefinition } from "../../tools/minds/mind-contract.ts";
import type { ProgramMindScene } from "../../tools/minds/program-mind-cases.ts";
import type { Card } from "../../adapters/models/catalog.ts";
import { startModelMinds } from "./mind-runtime.ts";
import type { MindBilling, MindRuntimeOptions } from "./mind-runtime-options.ts";
import { ProgramMindBankHouse } from "./program-mind-bank-house.ts";
export async function runProgramMindScene(
  options: MindRuntimeOptions,
  definition: MindDefinition,
  card: Card,
  scene: ProgramMindScene,
  billing: MindBilling,
) {
  const plan = options.programBank;
  if (!plan) throw new Error("bank.program");
  const house = new ProgramMindBankHouse(plan.program, billing);
  let minds: ReturnType<typeof startModelMinds> | undefined;
  try {
    house.prepare(definition, card, scene);
    minds = startModelMinds(
      house,
      { asistentes: false, programas: [definition.actor.slice(5)] },
      {
        ...options,
        definitions: [definition],
        catalog: [card],
        billing,
        observeTurn: house.observeTurn,
      },
    );
    await house.wake(scene);
    await minds.flush();
    return house.result(scene);
  } finally {
    minds?.close();
    house.close();
  }
}
