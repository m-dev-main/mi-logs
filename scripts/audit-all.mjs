import { spawn } from "node:child_process";

const commands = [
  ["pnpm", ["typecheck"]],
  ["pnpm", ["release"]],
  ["pnpm", ["audit:source"]],
  ["pnpm", ["audit:release"]],
];

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
    });

    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

for (const [command, args] of commands) {
  const label = [command, ...args].join(" ");
  console.log(`\n[audit-all] ${label}`);
  const code = await run(command, args);

  if (code !== 0) {
    console.error(`[audit-all] FAIL ${label}`);
    process.exit(code);
  }
}

console.log("\n[audit-all] PASS all non-runtime audits passed");
