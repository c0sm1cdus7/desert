import { readonlyState } from "../../journal/readonly-state.ts";
/** One protected reader for startup, reactions and the public house handle. */
export function readonlyPorts<T extends { state(): unknown }>(ports: T): T;
export function readonlyPorts(ports: { state(): unknown }) {
  return { ...ports, state: () => readonlyState(ports.state()) };
}
