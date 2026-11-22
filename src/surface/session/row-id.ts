// What a row is, whatever place it is drawn at: the identity a pointer chooses it by, read from what choosing does.
import type { Field, Option, Row } from "../contract/contract.ts";
import { rowIdLimit } from "../contract/limits.ts";
import type { Choice, Listed, Place } from "./screen.ts";

/** What choosing a row would do, as a tuple: two different doings never read the same. */
type Doing = readonly (string | number | null)[];
/** Where a row leads: a view, a conversation, or an act begun at one question and stopping at another. */
function leadsTo(open: Place): Doing {
  if (open.kind === "view") return ["view", open.tool, open.target ?? null];
  if (open.kind === "talk") return ["talk", open.tool, open.target ?? null];
  if (open.kind === "act") return ["act", open.tool, open.act, open.target ?? null, open.floor, open.until ?? null];
  throw new Error("a row leads to the Menu, which no row opens");
}
/** The ids of some rows, in their order: a row that does nothing has none. The second and later rows that would do
 * the same say which of those equals they are, from 2. An id longer than the limit is a defect, never cut. */
function identified<T>(rows: readonly T[], doing: (row: T) => Doing | undefined): readonly (string | undefined)[] {
  const seen = new Map<string, number>();
  return rows.map(row => {
    const tuple = doing(row);
    if (tuple === undefined) return undefined;
    const plain = JSON.stringify(tuple);
    const equals = (seen.get(plain) ?? 0) + 1;
    seen.set(plain, equals);
    const id = equals === 1 ? plain : JSON.stringify([...tuple, equals]);
    if (id.length > rowIdLimit) throw new Error(`a row's identity is ${id.length} units long, over ${rowIdLimit}`);
    return id;
  });
}
/** The row as drawn, with its identity when it has one: never one a tool brought along. */
export function withId<T extends Row>(row: T, id: string | undefined): Omit<T, "id"> & Pick<Row, "id"> {
  const { id: _brought, ...rest } = row;
  return id === undefined ? rest : { ...rest, id };
}
/** The ids of a menu's or a view's rows, list by list: a control in its line, or where a row leads. A row that is
 * off, or leads nowhere, has none. */
export function listIds(stacks: readonly Listed[]): readonly (readonly (string | undefined)[])[] {
  const rows = stacks.flatMap(stack => stack.rows.map(row => ({ stack: stack.title, row })));
  const ids = identified(rows, ({ stack, row }: { stack: string; row: Choice }): Doing | undefined => {
    if (row.off) return undefined;
    if (row.press) return ["press", stack, row.title];
    return row.open ? leadsTo(row.open) : undefined;
  });
  let at = 0;
  return stacks.map(stack => stack.rows.map(() => ids[at++]));
}
/** The answer a question takes from an option, as choosing it gives it: a thing picked by its value. */
const answerOf = (field: Field, option: Option): string =>
  field.kind === "pick" ? (option.value ?? option.title) : option.title;
/** The ids of a question's options: each answer, or the act that makes a new thing. One that is off has none. */
export const optionIds = (field: Field, options: readonly Option[]): readonly (string | undefined)[] =>
  identified(options, (option): Doing | undefined => {
    if (option.off) return undefined;
    return option.makes ? ["makes", option.makes.tool, option.makes.act] : ["answer", answerOf(field, option)];
  });
/** The ids of a conversation's pending question: each answer by its title, then «other», while it is not written. */
export const talkIds = (options: readonly Option[], writing: boolean): readonly (string | undefined)[] =>
  identified([...options, undefined], (option): Doing | undefined => {
    if (option === undefined) return writing ? undefined : ["other"];
    return option.off ? undefined : ["answer", option.title];
  });
