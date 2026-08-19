"use strict";

// src/index.ts
var import_node_child_process = require("child_process");

// src/list-workspaces.ts
function runListWorkspaces(runtime) {
  const herdrBin = runtime.env.HERDR_BIN_PATH ?? "herdr";
  const result = runtime.spawn(herdrBin, ["workspace", "list"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.stdout) {
    runtime.stdout.write(result.stdout);
  }
  if (result.stderr) {
    runtime.stderr.write(result.stderr);
  }
  if (result.error) {
    runtime.stderr.write(`Failed to run Herdr: ${result.error.message}
`);
  }
  return result.status ?? 1;
}

// src/index.ts
var exitCode = runListWorkspaces({
  env: process.env,
  spawn: (command, args, options) => {
    const result = (0, import_node_child_process.spawnSync)(command, args, options);
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      status: result.status,
      ...result.error ? { error: result.error } : {}
    };
  },
  stdout: process.stdout,
  stderr: process.stderr
});
process.exitCode = exitCode;
//# sourceMappingURL=index.cjs.map