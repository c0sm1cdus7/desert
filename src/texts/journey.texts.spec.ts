import { expect, it } from "vitest";
import { journeyControlPurpose } from "./journey.texts.ts";
it.each(["open", "plan", "done", "wait", "resume", "end", "desist"] as const)(
  "each control has a purpose in Spanish: %s",
  control => {
    expect(journeyControlPurpose.text("es", { control })).toMatch(/[áéíóúñ]|journey/);
    expect(journeyControlPurpose.id).toBe("journey.control.purpose");
  },
);
