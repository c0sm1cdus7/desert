import { expect, it } from "vitest";
import { journeyControlPurpose } from "./journey.texts.ts";
it.each(["open", "plan", "done", "wait", "end", "desist"] as const)(
  "cada control tiene un propósito en castellano: %s",
  control => {
    expect(journeyControlPurpose.text("es", { control })).toMatch(/[áéíóúñ]|journey/);
    expect(journeyControlPurpose.id).toBe("journey.control.purpose");
  },
);
