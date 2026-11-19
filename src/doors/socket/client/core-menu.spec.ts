// Core declarations travel through the shared router on streams and a real localhost port.
import { createServer, connect } from "node:net";
import { duplexPair } from "node:stream";
import { expect, it } from "vitest";
import { socketHouse } from "../../../../tests/support/socket-house.ts";
import { shopShown, type Shop } from "../../../../tests/support/shop.ts";
import { houseRouter } from "../../../surface/bridge/assembly/house-router.ts";
import { keysOf } from "../../terminal/input.ts";
import { socketConnection } from "./socket-connection.ts";
import { socketPorts } from "./socket-ports.ts";
it.each(["stream", "tcp"] as const)("uses the personal core from Menu over %s", async transport => {
  const fixture = await socketHouse("stream");
  const connection = socketConnection<Shop>("ana-terminal");
  const server = transport === "tcp" ? createServer(socket => fixture.attach(socket)) : undefined;
  let router: ReturnType<typeof houseRouter<Shop>> | undefined;
  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
      });
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing TCP address");
      await connection.attach(connect(address.port, "127.0.0.1"));
    } else {
      const pair = duplexPair();
      fixture.attach(pair[1]);
      await connection.attach(pair[0]);
    }
    router = houseRouter(
      socketPorts(connection, { registry: fixture.house().registry, limits: { recentLines: 40 } }),
      shopShown,
    );
    for (const key of ["u", "e", "Preparando la casa", "\r"]) {
      for (const intent of keysOf(key)) router.send(intent);
      await router.idle();
    }
    expect(fixture.house().tools.state().house.scenes.get("ana")?.data.general).toBe("Preparando la casa");
    expect(JSON.stringify(router.screen({ rows: 40 }))).toContain("Guardada · Escena");
  } finally {
    router?.stop();
    connection.close();
    await fixture.close();
    if (server?.listening) await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
