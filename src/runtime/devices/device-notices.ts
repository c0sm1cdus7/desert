// Records a device's notice once, with author and journey taken from the house's record of that execution.
import { meant } from "../../fields/phrases.ts";
import { Value } from "@sinclair/typebox/value";
import { publicValue } from "../../adapters/public-value.ts";
import { isRecord } from "../../fields/json-values.ts";
import type { NoticeAnswer } from "../../fields/device-protocol.ts";
import { effect } from "../../house/facts.ts";
import { deviceFacts } from "../../house/devices/device-facts.ts";
import type { House } from "../../house/members.ts";
import type { HouseBus } from "../../journal/vocabulary.ts";
import { deviceTexts } from "../../texts/devices.texts.ts";
import type { DeviceConnection, HeldNotice } from "./device-dispatch.ts";
export type NoticePorts = Readonly<{
  bus: HouseBus;
  state: () => House;
  scrub: (value: unknown) => unknown;
}>;
const noticeFact = deviceFacts["device-execution-notice"];
/** Only what the journal keeps crosses: the value goes to the door's observer, never to the house. */
function journaled(ports: NoticePorts, notice: unknown) {
  if (!isRecord(notice)) return undefined;
  const { execution, status, reference } = notice;
  const safe = ports.scrub(publicValue({ execution, status, reference }));
  return Value.Check(noticeFact, safe) ? safe : undefined;
}
/** `refused` is final, so it answers only what never changes: a notice that is not this device's announcing
 * execution, or whose start was rejected. Missing and foreign executions get the same answer. */
export function announceNotice(
  ports: NoticePorts,
  device: string,
  connection: DeviceConnection,
  notice: unknown,
  later: HeldNotice["later"],
  written: HeldNotice["written"],
): NoticeAnswer | "held" {
  const house = ports.state();
  const owner = house.devices.devices.get(device);
  if (!owner?.accepted || owner.retired || owner.connection !== connection.id || !house.grants.has(owner.owner))
    throw new Error(meant(deviceTexts.unavailable));
  const safe = journaled(ports, notice);
  if (!safe) return "refused";
  const execution = house.devices.executions.get(safe.execution);
  if (!execution || execution.device !== device || !execution.announces || execution.status === "rejected")
    return "refused";
  if (execution.notice) return "recorded";
  if (execution.status === "running") {
    // The first held notice wins, as a recorded one does; a later caller hears the same answer when it is released.
    const first = connection.held.get(execution.execution);
    const both = (answer: NoticeAnswer) => {
      first?.later(answer);
      later(answer);
    };
    connection.held.set(execution.execution, first ? { ...first, later: both } : { notice: safe, later, written });
    return "held";
  }
  const { actor, journey } = execution;
  ports.bus.emit(effect("device-execution-notice", safe, actor, [execution.execution], journey));
  written();
  return "recorded";
}
/** Once the start's result or unknown is written, a held notice is recorded (or refused, if the start was rejected). */
export function releaseNotice(ports: NoticePorts, device: string, connection: DeviceConnection, execution: string) {
  const held = connection.held.get(execution);
  if (!held) return;
  connection.held.delete(execution);
  let answer: NoticeAnswer | "held";
  try {
    answer = announceNotice(ports, device, connection, held.notice, held.later, held.written);
  } catch {
    // Not answered: the device still owes it and sends it again with its next poll or connection.
    return;
  }
  if (answer !== "held") held.later(answer);
}
