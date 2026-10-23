export {};
let input = "";
for await (const chunk of process.stdin) input += String(chunk);
const request = JSON.parse(input);
if (request.input.mode === "fail") process.exit(7);
if (request.input.mode === "wait") await new Promise(resolve => setTimeout(resolve, 30000));
if (request.input.mode === "overflow") process.stdout.write("x".repeat(4096));
else process.stdout.write(JSON.stringify({ ...request, inheritedSecret: !!process.env.EXECUTION_TEST_SECRET }));
