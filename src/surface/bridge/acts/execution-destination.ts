// Adds a live destination choice and a final summary without changing the action's declared data.
import { deviceChoices } from "../../../house/devices/device-state.ts";
import type { ExecutionDestination } from "../../../fields/device-protocol.ts";
import type { ProgramAct } from "../../../tools/promises.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import { deviceTexts as words } from "../../../texts/devices.texts.ts";
import type { Field } from "../../contract/contract.ts";
import type { SurfacePorts } from "../ports/house-ports.ts";
import type { Asking } from "../questions/asking.ts";
type Choice = Readonly<{ title: string; key: string; destination: ExecutionDestination }>;
function destinationChoices<X extends Program>(ports: SurfacePorts<X>, act: ProgramAct<X>, name: string): Choice[] {
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
function destinationQuestion(choices: () => readonly Choice[]): Field {
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
  act: ProgramAct<X>,
  title: string,
  available: boolean,
  field: Field | null,
): Field {
  const base =
    field?.kind === "confirm"
      ? field
      : {
          kind: "confirm" as const,
          options: [{ title: act.enter, key: act.enter.charAt(0) }],
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
    if (answers.length === count) return destinationQuestion(choices);
    if (answers.length === count + 1)
      return destinationConfirmation(act, answers[count] ?? "", selected(answers) !== undefined, confirmation());
    return null;
  };
  return {
    required,
    selected,
    next,
    problem: (answers: readonly string[]) =>
      required && answers.length > ask.taken(answers) && !selected(answers) ? words.unavailable : undefined,
  };
}
