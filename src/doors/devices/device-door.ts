// Autentica una máquina con desafíos Ed25519 de un solo uso sin crear una sesión de identidad.
import { randomUUID, randomBytes, createPublicKey, verify } from "node:crypto";
import type { DeviceRuntime } from "../../runtime/devices/device-runtime.ts";
import type { DeviceEndpoint } from "../../fields/device-protocol.ts";
import { deviceTexts } from "../../texts/devices.texts.ts";
export function createDeviceDoor(
  runtime: Pick<DeviceRuntime, "authentication" | "connect">,
  now: () => number = Date.now,
) {
  const pending = new Map<string, Readonly<{ device: string; message: string; expires: number }>>();
  return {
    challenge(device: string) {
      runtime.authentication(device);
      for (const [id, each] of pending) if (each.expires <= now()) pending.delete(id);
      if (pending.size >= 256) throw new Error(deviceTexts.authentication);
      const id = randomUUID();
      const message = JSON.stringify(["desert-device-v1", device, id, randomBytes(32).toString("base64")]);
      pending.set(id, { device, message, expires: now() + 30_000 });
      return { id, message };
    },
    connect(id: string, signature: string, endpoint: DeviceEndpoint) {
      const challenge = pending.get(id);
      pending.delete(id);
      if (!challenge || challenge.expires <= now() || signature.length > 1024)
        throw new Error(deviceTexts.authentication);
      let authenticated = false;
      try {
        const key = createPublicKey({
          key: Buffer.from(runtime.authentication(challenge.device), "base64"),
          type: "spki",
          format: "der",
        });
        authenticated = verify(null, Buffer.from(challenge.message), key, Buffer.from(signature, "base64"));
      } catch {
        throw new Error(deviceTexts.authentication);
      }
      if (!authenticated) throw new Error(deviceTexts.authentication);
      return runtime.connect(challenge.device, endpoint);
    },
  };
}
