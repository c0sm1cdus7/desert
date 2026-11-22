// Device facts invented by an action, to check that the engine refuses the whole batch.
import { effect } from "../../src/house/facts.ts";
export const deviceEffects = (by: string) => [
  effect("device-registered", { id: "mac", name: "Máquina inventada", publicKey: "invented" }, by),
  effect("device-accepted", { device: "mac" }, by),
  effect("device-connected", { device: "mac", connection: "invented", inventory: [] }, by),
  effect("device-disconnected", { device: "mac", connection: "invented", reason: "Inventado" }, by),
  effect("device-retired", { device: "mac" }, by),
  effect(
    "device-execution-started",
    {
      execution: "invented",
      actor: by,
      program: "sales",
      action: "register",
      journey: "invented",
      device: "mac",
      connection: "invented",
    },
    by,
  ),
  effect("device-execution-unknown", { execution: "invented", reason: "Inventado" }, by),
  effect("device-execution-result", { execution: "invented", status: "accepted", reference: "invented" }, by),
  effect("device-execution-notice", { execution: "invented", status: "finished", reference: "invented" }, by),
];
