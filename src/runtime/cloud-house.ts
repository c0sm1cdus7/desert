// Abre la casa de nube siempre encendida; solo el anfitrión cierra recursos y las puertas reciben puertos sin apagado.
import type { HouseOptions } from "../house/state.ts";
import type { Program, ViewLimits } from "../tools/tool-contract.ts";
import { RootHouseKeys } from "../keychain/cloud/root-house-keys.ts";
import { environmentRootKey, type KeyEnvironment } from "./environment-key.ts";
import { localPorts, startHouse, type RunningHouse } from "./house-runtime.ts";
export function startCloudHouse<X extends Program>(
  program: Omit<HouseOptions<X>, "secretKeys">,
  home: string,
  environment: KeyEnvironment,
  variable: string,
) {
  const root = environmentRootKey(environment, variable);
  let keys: RootHouseKeys;
  try {
    keys = new RootHouseKeys(root, home);
  } finally {
    root.fill(0);
  }
  try {
    const house = startHouse(home, { ...program, secretKeys: keys });
    hostLifetime(house, keys);
    return Object.freeze({
      ports: (identity: string, limits: Omit<ViewLimits, "now">) => localPorts(house, identity, limits),
    });
  } catch (error) {
    keys.dispose();
    throw error;
  }
}
function hostLifetime<X extends Program>(house: RunningHouse<X>, keys: RootHouseKeys): void {
  // A house without pending wakes or connected doors still keeps its host process alive.
  const alive = setInterval(() => {}, 60_000);
  let closed = false;
  const stop = () => {
    if (closed) return;
    closed = true;
    clearInterval(alive);
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
    process.removeListener("exit", stop);
    try {
      house.close();
    } finally {
      keys.dispose();
    }
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  process.once("exit", stop);
}
