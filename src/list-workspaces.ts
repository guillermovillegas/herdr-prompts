export interface CommandResult {
  stdout: string | null;
  stderr: string | null;
  status: number | null;
  error?: Error;
}

export type SpawnCommand = (
  command: string,
  args: string[],
  options: {
    encoding: "utf8";
    stdio: ["ignore", "pipe", "pipe"];
  },
) => CommandResult;

export interface OutputWriter {
  write(chunk: string): unknown;
}

export interface ListWorkspacesRuntime {
  env: Record<string, string | undefined>;
  spawn: SpawnCommand;
  stdout: OutputWriter;
  stderr: OutputWriter;
}

export function runListWorkspaces(runtime: ListWorkspacesRuntime): number {
  const herdrBin = runtime.env.HERDR_BIN_PATH ?? "herdr";
  const result = runtime.spawn(herdrBin, ["workspace", "list"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.stdout) {
    runtime.stdout.write(result.stdout);
  }

  if (result.stderr) {
    runtime.stderr.write(result.stderr);
  }

  if (result.error) {
    runtime.stderr.write(`Failed to run Herdr: ${result.error.message}\n`);
  }

  return result.status ?? 1;
}
