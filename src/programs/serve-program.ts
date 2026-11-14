// A program's executable composition calls this only when launched as the detached house.
import type { Composition } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import { startHouse, type HouseOptions } from "./house-runtime.ts";
import { serveHouse, type DoorKey } from "../doors/socket/serve.ts";
export type ServerOptions<X extends Program> = Pick<HouseOptions<X>, "by" | "creation" | "secretKeys"> & {
  readonly keys: ReadonlyMap<string, DoorKey>;
};
export async function serveProgram<X extends Program>(
  program: Composition<X>,
  options: ServerOptions<X>,
  home: string,
) {
  const { keys, ...houseOptions } = options;
  const house = startHouse(home, { ...program, ...houseOptions });
  try {
    return await serveHouse(house, home, keys);
  } catch (error) {
    house.close();
    throw error;
  }
}
