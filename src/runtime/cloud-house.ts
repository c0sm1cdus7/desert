// Abre la casa de nube siempre encendida; solo el anfitrión cierra recursos y las puertas reciben puertos sin apagado.
import { bindDoorRoot, rootVerifier } from "../house/doors/root-verifier.ts";
import type { ModelHouseOptions } from "./minds/mind-runtime-options.ts";
import type { Program, ViewLimits } from "../tools/tool-contract.ts";
import { RootHouseKeys } from "../keychain/cloud/root-house-keys.ts";
import { environmentRootKey, type KeyEnvironment } from "./environment-key.ts";
import { localPorts, startHouse, type RunningHouse } from "./house-runtime.ts";
export function startCloudHouse<X extends Program>(
  program: Omit<ModelHouseOptions<X>, "secretKeys">,
  home: string,
  environment: KeyEnvironment,
  variable: string,
) {
  const root = environmentRootKey(environment, variable);
  const verifier = rootVerifier(root);
  let keys: RootHouseKeys;
  try {
    keys = new RootHouseKeys(root, home);
  } finally {
    root.fill(0);
  }
  try {
    const house = startHouse(home, { ...program, secretKeys: keys });
    bindDoorRoot(house.bus, verifier);
    const stop = hostLifetime(house, keys);
    if (house.minds) void house.minds.catch(stop);
    const { tools, journal, bus, registry, now } = house;
    const { authentication, connect } = house.devices;
    return Object.freeze({
      ...(house.minds ? { minds: house.minds } : {}),
      ports: (identity: string, limits: Omit<ViewLimits, "now">) => localPorts(house, identity, limits),
      /** What a door serves from: the house without close, so no door can turn it off. */
      door: Object.freeze({ tools, journal, bus, registry, now }),
      /** Device admission for the HTTP door (`mcpDoor` option `devices: { access }`): signature check and connect. */
      devices: Object.freeze({ authentication, connect }),
    });
  } catch (error) {
    keys.dispose();
    throw error;
  }
}
function hostLifetime<X extends Program>(house: RunningHouse<X>, keys: RootHouseKeys) {
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
  return stop;
}
