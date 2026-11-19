// Identity owners provision devices; owners and administrators accept or retire them through declared actions.
import { text } from "../../fields/fields.ts";
import { object } from "../../fields/visible-text.ts";
import { validDevicePublicKey } from "../../house/devices/device-public-key.ts";
import { effect } from "../../house/facts.ts";
import { mindTool } from "../../house/kit.ts";
import { deviceActionTexts as words } from "../../texts/devices.texts.ts";
import { identityTexts } from "../../texts/identities.texts.ts";
import { programAct } from "../promises.ts";
import type { Program, State } from "../tool-contract.ts";
import { deviceCases } from "./device-cases.ts";
import { targetIdentity } from "./identity-reading.ts";
export function deviceOwnerProblem<X extends Program>(state: State<X>, target: string, register = false) {
  const owner = targetIdentity(target);
  if (mindTool(owner)) return identityTexts.ownActions;
  if (!state.house.grants.has(owner)) return words.missing;
  if (state.by !== owner && (register || state.by !== state.house.admin))
    return register ? words.owner : words.forbidden;
  return undefined;
}
function registerDevice<X extends Program>() {
  const input = object({
    id: { ...text(words.id, words.hint), maxLength: 200 },
    name: { ...text(words.name, words.hint), maxLength: 200 },
    publicKey: { ...text(words.publicKey, words.keyHint), maxLength: 1024 },
  });
  return programAct<X, typeof input>({
    ...words.register,
    on: "thing",
    undoable: true,
    input,
    refuses: [identityTexts.ownActions, words.missing, words.owner, words.invalid, words.duplicate],
    offered: (state, target) => deviceOwnerProblem(state, target, true),
    stops: ({ id, publicKey }, { house }) => {
      if (typeof id === "string" && house.devices.devices.has(id)) return words.duplicate;
      return typeof publicKey === "string" && !validDevicePublicKey(publicKey) ? words.invalid : undefined;
    },
    run: (registration, { by }) => ({
      status: "accepted",
      text: words.registered,
      effects: [effect("device-registered", registration, by)],
    }),
    cases: deviceCases<X>().register,
  });
}
function changeDevice<X extends Program>(operation: "accept" | "retire") {
  const input = object({ device: text(words.id, words.hint) });
  return programAct<X, typeof input>({
    ...words[operation],
    on: "thing",
    undoable: operation === "accept",
    input,
    ...(operation === "retire" ? { confirms: () => words.sure } : {}),
    refuses: [identityTexts.ownActions, words.missing, words.forbidden],
    offered: (state, target) => deviceOwnerProblem(state, target),
    stops: ({ device }, { house }, target) => {
      if (typeof device !== "string") return undefined;
      const found = house.devices.devices.get(device);
      return found && !found.retired && found.owner === targetIdentity(target) ? undefined : words.missing;
    },
    run: ({ device }, { by }) => ({
      status: "accepted",
      text: operation === "accept" ? words.accepted : words.retired,
      effects: [effect(operation === "accept" ? "device-accepted" : "device-retired", { device }, by)],
    }),
    cases: deviceCases<X>()[operation],
  });
}
export const deviceActions = <X extends Program>() => ({
  "register-device": registerDevice<X>(),
  "accept-device": changeDevice<X>("accept"),
  "retire-device": changeDevice<X>("retire"),
});
