// A notes mind whose «send» runs on a connected device that announces how its work ends, behind a synthetic model.
import { generateKeyPairSync, sign } from "node:crypto";
import { effect } from "../../src/house/facts.ts";
import { explicitKit, kitLayout } from "../../src/house/kit-selection.ts";
import { createDeviceProcess } from "../../src/doors/devices/device-process.ts";
import type { DeviceNotice, DeviceRequest, DeviceResult } from "../../src/fields/device-protocol.ts";
import type { ProposedAct } from "../../src/tools/minds/mind-answer.ts";
import { answer, requestMindFixture, history, type RequestHouse } from "./request-mind-fixture.ts";
import { currentTurn } from "./request-mind-responder.ts";
import { requestKit, sendKit } from "./request-program.ts";
import { talkKit } from "./talk-program.ts";
const announcing = { at: "device", tool: "shell", version: "1", announces: true } as const;
type Started = (request: DeviceRequest) => DeviceResult;
/** What a journey answers on each call: its id, how many turns it ran, and how many calls this turn made. */
export type JourneyScript = (frame: string, id: string, turn: number, call: number, house: RequestHouse) => unknown;
/** The machine «vm»: one key for every connection, as a device keeps its own across restarts of the house. */
const pair = generateKeyPairSync("ed25519");
const publicKey = pair.publicKey.export({ type: "spki", format: "der" }).toString("base64");
/** What the notes mind's consciousness answers when anything but the thread's line wakes it. */
export type ConsciousScript = (frame: string, house: RequestHouse) => unknown;
/** The notes mind opens one journey for the line it heard; each call of that journey answers with `journey`. */
function script(house: RequestHouse, journey: JourneyScript, frames: string[], conscious: ConsciousScript) {
  const calls = new Map<string, number>();
  return (frame: string) => {
    frames.push(frame);
    const turn = currentTurn(house);
    calls.set(turn.data.turn, (calls.get(turn.data.turn) ?? 0) + 1);
    if (turn.process) {
      const turns = [...house.tools.state().house.minds.turns.values()].filter(t => t.opened.process === turn.process);
      return journey(frame, turn.process, turns.length, calls.get(turn.data.turn) ?? 0, house);
    }
    if (!wokeFor(house, "talk/said")) return conscious(frame, house);
    const kit = [{ tool: "notes", acts: ["outbox/send"] }];
    return answer([{ act: "open", target: "mind:notes", input: { goal: "Mandar el informe", kit } }]);
  };
}
/** The notes program's «send» runs on a device that announces: what Agents' starts declare. */
const announcingSend = () =>
  requestMindFixture(undefined, { capNanoUsd: 10e9 }, registry =>
    registry.map(tool => {
      const send = tool.acts["outbox/send"];
      return tool.id === "notes" && send
        ? { ...tool, acts: { ...tool.acts, "outbox/send": { ...send, execution: announcing } } }
        : tool;
    }),
  );
export function deviceMindFixture(conscious: ConsciousScript = () => answer()) {
  const fixture = announcingSend();
  let started: Started = request => ({ status: "accepted", reference: `inicio:${request.execution}` });
  let link: ReturnType<RequestHouse["devices"]["door"]["connect"]> | undefined;
  const frames: string[] = [];
  /** Connects «vm», registering and accepting it as ana's first, and lets the notes mind send through it. */
  const connect = (house: RequestHouse) => {
    if (!house.tools.state().house.devices.devices.has("vm")) {
      house.devices.register("ana", { id: "vm", name: "Linux", publicKey });
      house.devices.accept("ana", "vm");
    }
    const process = createDeviceProcess([
      { tool: "shell", version: "1", actions: { "outbox/send": request => Promise.resolve(started(request)) } },
    ]);
    const challenge = house.devices.door.challenge("vm");
    const signature = sign(null, Buffer.from(challenge.message), pair.privateKey).toString("base64");
    link = house.devices.door.connect(challenge.id, signature, process);
    const kit = explicitKit([...requestKit, ...sendKit, talkKit], kitLayout(house.registry));
    house.bus.emit(effect("kit-set", { version: 2, holder: "mind:notes", kit }, "ana"));
  };
  /** The device's word about one execution, as its outbox sends it; the house answers recorded, refused or held. */
  const announce = (execution: string, status: DeviceNotice["status"] = "finished") => {
    if (!link) throw new Error("Missing connection");
    return link.announce({ execution, status, reference: `aviso:${status}` }, () => {});
  };
  /** Opens the house with «vm» connected, before its minds start, and the notes mind answering with `journey`. */
  const open = (journey: JourneyScript, before?: (house: RequestHouse) => void) =>
    fixture.open(true, {
      started: (_, house) => {
        connect(house);
        fixture.respond(script(house, journey, frames, conscious));
        before?.(house);
      },
    });
  const onStart = (next: Started) => {
    started = next;
  };
  return { fixture, frames, open, onStart, announce, disconnect: () => link?.disconnect() };
}
/** The «send» act a journey proposes on «vm». */
export const sendOn = (body: string): ProposedAct => ({
  act: "outbox/send",
  target: "notes/outbox",
  input: { body },
  destination: { kind: "device", device: "vm" },
});
export const waitNotice = (id: string, what = "El envío") => ({
  act: "wait",
  target: id,
  input: { what, on: "notice" },
});
export const endJourney = (id: string) => ({ act: "end", target: id, input: { summary: "Listo", references: [] } });
/** The executions a journey started, in order. */
export const executionsOf = (house: RequestHouse, journey: string) =>
  [...house.tools.state().house.devices.executions.values()].filter(each => each.journey === journey);
/** Whether the current turn woke for a fact of this kind. */
export function wokeFor(house: RequestHouse, kind: string) {
  const turn = currentTurn(house);
  return history(house).some(event => turn.data.wake.includes(event.id) && event.kind === kind);
}
/** The turns a journey ran, each with the kinds of the facts that woke it. */
export function wakesOf(house: RequestHouse, journey: string) {
  const events = history(house);
  return [...house.tools.state().house.minds.turns.values()]
    .filter(turn => turn.opened.process === journey)
    .map(turn => events.filter(event => turn.opened.data.wake.includes(event.id)).map(event => event.kind));
}
export const flush = async (house: RequestHouse) => (await house.minds)?.flush();
export const journeyOf = (house: RequestHouse) => [...house.tools.state().house.journeys.values()][0];
export const told = "Avisó el dispositivo Linux: el trabajo outbox/send → notes/outbox que arrancó este journey";
