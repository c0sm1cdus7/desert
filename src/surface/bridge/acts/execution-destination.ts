// Adds a live destination choice and a final summary without changing the action's declared data.
import { deviceChoices } from "../../../house/devices/device-state.ts";
import type { ExecutionDestination } from "../../../fields/device-protocol.ts";
import type { ProgramAct } from "../../../tools/promises.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import { wordsIn, type InLanguage } from "../../../fields/phrases.ts";
import { deviceTexts } from "../../../texts/devices.texts.ts";
import { surfaceTexts } from "../../../texts/surface.texts.ts";
import type { Field } from "../../contract/contract.ts";
import { say, type SurfacePorts } from "../ports/house-ports.ts";
import type { Asking } from "../questions/asking.ts";
type Choice = Readonly<{ title: string; key: string; destination: ExecutionDestination }>;
type Words = InLanguage<typeof deviceTexts>;
function destinationChoices<X extends Program>(ports: SurfacePorts<X>, act: ProgramAct<X>, name: string): Choice[] {
  const words = wordsIn(deviceTexts, ports.language);
  return [
    ...(act.execution?.at === "either"
      ? [{ title: words.house, key: "c", destination: { kind: "house" as const } }]
      : []),
    ...deviceChoices(ports.state().house, act.execution, name).map((device, index) => ({
      title: words.deviceChoice(device.name, device.device),
      key: String(index + 1),
      destination: { kind: "device" as const, device: device.device },
    })),
  ];
}
function destinationQuestion(choices: () => readonly Choice[], words: Words): Field {
  return {
    ask: `${words.choose} · ${words.provisioning}`,
    kind: "pick",
    of: "devices",
    found: sought =>
      choices()
        .filter(choice => choice.title.toLowerCase().includes(sought.toLowerCase()))
        .map(choice => ({ ...choice, value: choice.title })),
    shown: answer => answer,
    valid: answer => choices().some(choice => choice.title === answer),
    nothing: () => words.none,
  };
}
function destinationConfirmation<X extends Program>(
  ports: SurfacePorts<X>,
  act: ProgramAct<X>,
  title: string,
  available: boolean,
  field: Field | null,
): Field {
  const words = wordsIn(deviceTexts, ports.language);
  const enter = say(ports, act.enter);
  const base =
    field?.kind === "confirm"
      ? field
      : {
          kind: "confirm" as const,
          options: [{ title: enter, key: enter.charAt(0) }],
          back: wordsIn(surfaceTexts, ports.language).back,
          ...(act.undoable ? { reversible: true as const } : {}),
        };
  return {
    ...base,
    ask: [field?.ask, words.confirm(title)].filter(Boolean).join(" · "),
    options: base.options.map(option => (available ? option : { ...option, off: true, detail: words.unavailable })),
  };
}
export function executionDestination<X extends Program>(
  ports: SurfacePorts<X>,
  act: ProgramAct<X>,
  name: string,
  ask: Asking,
) {
  const required = act.execution !== undefined && act.execution.at !== "house";
  const choices = () => destinationChoices(ports, act, name);
  const selected = (answers: readonly string[]): ExecutionDestination | undefined =>
    required ? choices().find(choice => choice.title === answers[ask.taken(answers)])?.destination : undefined;
  const next = (answers: readonly string[], confirmation: () => Field | null): Field | null => {
    if (!required) return null;
    const count = ask.taken(answers);
    if (answers.length === count) return destinationQuestion(choices, wordsIn(deviceTexts, ports.language));
    if (answers.length === count + 1)
      return destinationConfirmation(ports, act, answers[count] ?? "", selected(answers) !== undefined, confirmation());
    return null;
  };
  return {
    required,
    selected,
    next,
    problem: (answers: readonly string[]) =>
      required && answers.length > ask.taken(answers) && !selected(answers) ? deviceTexts.unavailable : undefined,
  };
}
