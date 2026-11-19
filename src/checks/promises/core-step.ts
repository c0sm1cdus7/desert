// Synthetic core setup uses registered actions and temporary endpoints, never sockets or real credentials.
import { issueDoorKey, issueInvitation } from "../../house/doors/door-material.ts";
import { createDeviceProcess } from "../../doors/devices/device-process.ts";
import { effect } from "../../house/facts.ts";
import type { startHouse } from "../../runtime/house-runtime.ts";
import type { Step } from "../../tools/promises.ts";
import type { Program } from "../../tools/tool-contract.ts";
const admin = "ana";
export function coreStep<X extends Program>(house: ReturnType<typeof startHouse<X>>, step: Step): boolean {
  if ("scene" in step) {
    house.bus.emit(effect("scene", { general: step.scene.general, to: { ...step.scene.to } }, step.scene.by));
    return true;
  }
  if ("device" in step) {
    provisionDevice(house, step.device);
    return true;
  }
  if ("invitation" in step) {
    const { id, identity } = step.invitation;
    const { fact } = issueInvitation(identity, "agent", admin, house.now());
    house.bus.emit({ ...fact, data: { ...fact.data, id } });
    return true;
  }
  if ("mindCards" in step) {
    house.bus.emit(
      effect(
        "mind-cards-published",
        {
          mind: step.mindCards.mind,
          cards: step.mindCards.cards.map(card => ({ ...card, capabilities: [...card.capabilities] })),
        },
        admin,
      ),
    );
    return true;
  }
  if ("doorKey" in step) {
    const { id, identity, door } = step.doorKey;
    const { fact } = issueDoorKey(identity, door, house.tools.state().house.admin);
    house.bus.emit({ ...fact, data: { ...fact.data, id } });
    return true;
  }

  return false;
}

function provisionDevice<X extends Program>(
  house: ReturnType<typeof startHouse<X>>,
  device: Extract<Step, { device: unknown }>["device"],
) {
  const { id, owner, tool, version, actions, result } = device;
  house.devices.register(owner, {
    id,
    name: id,
    publicKey: "MCowBQYDK2VwAyEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  });
  house.devices.accept(admin, id);
  house.devices.connect(
    id,
    createDeviceProcess([
      {
        tool,
        version,
        actions: Object.fromEntries(
          actions.map(action => [action, () => Promise.resolve({ status: "accepted", reference: result })]),
        ),
      },
    ]),
  );
}
