// Builds an explicit snapshot of a mind's frame at the turn's sequence.
import type { Skill, Message } from "../../fields/messages.ts";
import type { MindDefinition, MindScope, TurnContext } from "../../tools/minds/mind-contract.ts";
export type FrameItem = Readonly<{ id: string; text: string; covered?: boolean; seq?: number }>;
export type FrameSource = Readonly<{
  definition: MindDefinition;
  skills: readonly Readonly<{ id: string; skill: Skill }>[];
  textRules: readonly Readonly<{ id: string; text: Message<Record<string, never>, "house"> }>[];
  scene: string;
  required: string;
  /** The menu said once: one line per kind of act. */
  menu: string;
  activity: readonly FrameItem[];
  objects: readonly FrameItem[];
  thread: readonly FrameItem[];
  /** The house clock in milliseconds, so a journey can wait until a real moment. */
  now?: number;
  /** What woke the mind, in words, one line per waking fact, when some fact has words. */
  woke?: readonly string[];
  /** How many lines of activity came before the mind last answered: the read act brings them. */
  older?: number;
  /** How many listed things nothing touched since the mind last answered: rows of their list, readable whole. */
  quiet?: number;
}>;
export type FrameSnapshot = Readonly<FrameSource & { scope: MindScope; through: number; wake: readonly string[] }>;
export type { FramePort, MindFrame } from "./mind-ports.ts";
export function buildMindFrame(scope: MindScope, turn: TurnContext, source: FrameSource): FrameSnapshot {
  const required = (value: unknown, name: string) => {
    if (value == null) throw new Error(`Falta el argumento · ${name}`);
  };
  for (const [name, value] of Object.entries({ scope, turn, source })) required(value, name);
  if (
    scope.actor !== turn.scope.actor ||
    scope.kind !== turn.scope.kind ||
    (scope.kind === "journey" && (turn.scope.kind !== "journey" || scope.process !== turn.scope.process))
  )
    throw new Error("Alcance de turno inválido");
  if (source.definition.actor !== scope.actor) throw new Error("Mente de marco inválida");
  return {
    scope,
    through: turn.through,
    wake: [...turn.wake],
    definition: source.definition,
    skills: [...source.skills],
    textRules: [...source.textRules],
    scene: source.scene,
    required: source.required,
    menu: source.menu,
    ...(source.now === undefined ? {} : { now: source.now }),
    ...(source.woke === undefined ? {} : { woke: [...source.woke] }),
    ...(source.older ? { older: source.older } : {}),
    ...(source.quiet ? { quiet: source.quiet } : {}),
    activity: source.activity.map(item => ({
      id: item.id,
      text: item.text,
      ...(item.covered === undefined ? {} : { covered: item.covered }),
      ...(item.seq === undefined ? {} : { seq: item.seq }),
    })),
    objects: source.objects.map(item => ({ id: item.id, text: item.text })),
    thread: source.thread.map(item => ({ id: item.id, text: item.text })),
  };
}
