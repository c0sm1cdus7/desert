// A program's executable composition calls this only when launched as the detached house.
import type { Composition } from "../../../tools/promises.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import { startHouse } from "../../../runtime/house-runtime.ts";
import type { HouseOptions } from "../../../house/state.ts";
import { serveHouse, type DoorKey } from "./serve.ts";
type ServerOptions<X extends Program> = Pick<HouseOptions<X>, "by" | "creation" | "secretKeys" | "founderDoorKeys"> & {
  readonly keys?: ReadonlyMap<string, DoorKey>;
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
