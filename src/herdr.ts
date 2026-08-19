export const PLUGIN_ID = "oppenheimor.herdr-prompts";

export interface CommandResult {
  stdout: string | null;
  stderr: string | null;
  status: number | null;
  error?: Error;
}

export type RunCommand = (command: string, args: string[]) => CommandResult;

export class HerdrRuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HerdrRuntimeError";
  }
}

export function openPickerAction(
  env: Record<string, string | undefined>,
  run: RunCommand,
): void {
  const targetPaneId = originatingPaneId(env.HERDR_PLUGIN_CONTEXT_JSON);
  const herdrBin = env.HERDR_BIN_PATH ?? "herdr";
  const result = run(herdrBin, [
    "plugin",
    "pane",
    "open",
    "--plugin",
    PLUGIN_ID,
    "--entrypoint",
    "picker",
    "--placement",
    "popup",
    "--width",
    "80%",
    "--height",
    "70%",
    "--env",
    `HERDR_PROMPTS_TARGET_PANE_ID=${targetPaneId}`,
    "--focus",
  ]);
  assertCommandSucceeded(result, "open the prompt picker");
}

export class HerdrClient {
  constructor(
    private readonly herdrBin: string,
    private readonly run: RunCommand,
  ) {}

  insertPrompt(targetPaneId: string, content: string): void {
    const infoResult = this.run(this.herdrBin, [
      "agent",
      "get",
      targetPaneId,
    ]);
    assertCommandSucceeded(infoResult, "inspect the target Agent");
    const agent = parseAgentInfo(infoResult.stdout);
    if (agent.paneId !== targetPaneId) {
      throw new HerdrRuntimeError("Herdr returned a different target pane");
    }
    if (agent.status !== "idle" && agent.status !== "done") {
      throw new HerdrRuntimeError(
        `Target Agent is ${agent.status}, not idle`,
      );
    }

    const sendResult = this.run(this.herdrBin, [
      "pane",
      "send-text",
      targetPaneId,
      content,
    ]);
    assertCommandSucceeded(sendResult, "insert the prompt");
  }
}

function originatingPaneId(serializedContext: string | undefined): string {
  if (!serializedContext) {
    throw new HerdrRuntimeError("HERDR_PLUGIN_CONTEXT_JSON is missing");
  }

  let context: unknown;
  try {
    context = JSON.parse(serializedContext);
  } catch {
    throw new HerdrRuntimeError("HERDR_PLUGIN_CONTEXT_JSON is invalid");
  }
  if (
    !isRecord(context) ||
    typeof context.focused_pane_id !== "string" ||
    context.focused_pane_id.length === 0
  ) {
    throw new HerdrRuntimeError("The plugin action requires a focused pane");
  }
  return context.focused_pane_id;
}

function parseAgentInfo(serialized: string | null): {
  paneId: string;
  status: string;
} {
  let response: unknown;
  try {
    response = JSON.parse(serialized ?? "");
  } catch {
    throw new HerdrRuntimeError("Herdr returned invalid Agent information");
  }

  const result = isRecord(response) ? response.result : undefined;
  const agent = isRecord(result) ? result.agent : undefined;
  if (
    !isRecord(agent) ||
    typeof agent.agent !== "string" ||
    typeof agent.agent_status !== "string" ||
    typeof agent.pane_id !== "string"
  ) {
    throw new HerdrRuntimeError("The target pane no longer hosts an Agent");
  }
  return { paneId: agent.pane_id, status: agent.agent_status };
}

function assertCommandSucceeded(
  result: CommandResult,
  operation: string,
): void {
  if (result.status === 0 && !result.error) {
    return;
  }
  const detail =
    result.error?.message ?? result.stderr?.trim() ?? "unknown Herdr error";
  throw new HerdrRuntimeError(`Unable to ${operation}: ${detail}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
