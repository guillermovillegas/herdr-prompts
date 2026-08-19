import { spawnSync } from "node:child_process";

import { runListWorkspaces } from "./list-workspaces.js";

const exitCode = runListWorkspaces({
  env: process.env,
  spawn: (command, args, options) => {
    const result = spawnSync(command, args, options);

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      status: result.status,
      ...(result.error ? { error: result.error } : {}),
    };
  },
  stdout: process.stdout,
  stderr: process.stderr,
});

process.exitCode = exitCode;
