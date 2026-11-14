// A standalone test shop server, using only in-memory fixture credentials and custody.
import { serveProgram } from "../../src/programs/serve-program.ts";
import { program, server } from "./shop-program.ts";
const home = process.argv[2];
if (!home) throw new Error("Missing house path");
await serveProgram(program, server, home);
process.stdout.write("ready\n");
