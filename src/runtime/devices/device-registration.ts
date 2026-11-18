// Valida alta y administración por identidad y conserva los datos públicos de autenticación.
import { createPublicKey } from "node:crypto";
import { Value } from "@sinclair/typebox/value";
import { deviceRegistration, type DeviceRegistration } from "../../fields/device-protocol.ts";
import type { House } from "../../house/members.ts";
import type { HouseBus } from "../../journal/vocabulary.ts";
import { effect } from "../../house/facts.ts";
import { deviceTexts } from "../../texts/devices.texts.ts";
export function deviceRegistrationAccess(bus: HouseBus, state: () => House, checkOpen: () => void) {
  const owner = (actor: string, id: string) => {
    checkOpen();
    const device = state().devices.devices.get(id);
    if (!device || device.retired || !state().grants.has(actor) || (device.owner !== actor && actor !== state().admin))
      throw new Error(deviceTexts.forbidden);
  };
  return {
    register(actor: string, registration: DeviceRegistration) {
      checkOpen();
      if (!state().grants.has(actor)) throw new Error(deviceTexts.forbidden);
      if (!Value.Check(deviceRegistration, registration) || state().devices.devices.has(registration.id))
        throw new Error(deviceTexts.invalid);
      let valid = false;
      try {
        valid =
          createPublicKey({ key: Buffer.from(registration.publicKey, "base64"), type: "spki", format: "der" })
            .asymmetricKeyType === "ed25519";
      } catch {
        throw new Error(deviceTexts.invalid);
      }
      if (!valid) throw new Error(deviceTexts.invalid);
      bus.emit(effect("device-registered", registration, actor));
    },
    accept(actor: string, device: string) {
      owner(actor, device);
      bus.emit(effect("device-accepted", { device }, actor));
    },
    retire(actor: string, device: string) {
      owner(actor, device);
      bus.emit(effect("device-retired", { device }, actor));
    },
  };
}
