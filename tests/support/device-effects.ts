// Hechos de dispositivos inventados por una acción para comprobar que el motor rechaza el lote completo.
import { effect } from "../../src/house/facts.ts";
export const deviceEffects = (by: string) => [
  effect("device-registered", { id: "mac", name: "Máquina inventada", publicKey: "inventada" }, by),
  effect("device-accepted", { device: "mac" }, by),
  effect("device-connected", { device: "mac", connection: "inventada", inventory: [] }, by),
  effect("device-disconnected", { device: "mac", connection: "inventada", reason: "Inventado" }, by),
  effect("device-retired", { device: "mac" }, by),
  effect(
    "device-execution-started",
    {
      execution: "inventada",
      actor: by,
      program: "sales",
      action: "register",
      journey: "inventado",
      device: "mac",
      connection: "inventada",
    },
    by,
  ),
  effect("device-execution-unknown", { execution: "inventada", reason: "Inventado" }, by),
  effect("device-execution-result", { execution: "inventada", status: "accepted", reference: "inventada" }, by),
];
