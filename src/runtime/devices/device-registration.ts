// Host integrations delegate device administration to the same registered identity actions as every surface.
import type { DeviceRegistration } from "../../fields/device-protocol.ts";
import { deviceTexts } from "../../texts/devices.texts.ts";
import type { startTools } from "../../tools/start.ts";
import type { Program } from "../../tools/tool-contract.ts";
export function deviceRegistrationAccess<X extends Program>(tools: ReturnType<typeof startTools<X>>) {
  const act = (by: string, owner: string, name: string, input: unknown) => {
    const target = `identities/${owner}`;
    tools.act({ act: "attend", input: { target } }, tools.state().through, by);
    const result = tools.act({ act: name, target, input }, tools.state().through, by);
    if (result.status !== "accepted") throw new Error("reason" in result ? result.reason : deviceTexts.forbidden);
  };
  const owner = (device: string) => tools.state().house.devices.devices.get(device)?.owner ?? "absent";
  return {
    register: (by: string, input: DeviceRegistration) => act(by, by, "register-device", input),
    accept: (by: string, device: string) => act(by, owner(device), "accept-device", { device }),
    retire: (by: string, device: string) => act(by, owner(device), "retire-device", { device }),
  };
}
