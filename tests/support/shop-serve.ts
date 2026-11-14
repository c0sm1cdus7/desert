// A standalone test shop server, using only in-memory fixture credentials and custody.
import { runProgramServer } from "../../src/programs/server-process.ts";
import { program, server } from "./shop-program.ts";
const home = process.argv[2];
if (!home) throw new Error("Missing house path");
if (await runProgramServer(program, server, home)) process.stdout.write("ready\n");
