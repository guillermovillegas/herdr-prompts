export const PLUGIN_ID = "oppenheimor.herdr-prompts";

export interface CommandResult {
  stdout: string | null;
  stderr: string | null;
  status: number | null;
  error?: Error;
}

export type RunCommand = (command: string, args: string[]) => CommandResult;

export interface AgentTarget {
  paneId: string;
  sessionId?: string;
}

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
  let sessionId = "";
  if (targetPaneId) {
    try {
      const target = inspectAgent(herdrBin, targetPaneId, run);
      sessionId = target.sessionId;
    } catch {
      // Non-agent pane, or agent without native session (Codex/OpenCode/raw shell)
    }
  }
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
    "--env",
    `HERDR_PROMPTS_TARGET_AGENT_SESSION_ID=${sessionId}`,
    "--focus",
  ]);
  assertCommandSucceeded(result, "open the prompt picker");
}

export class HerdrClient {
  constructor(
    private readonly herdrBin: string,
    private readonly run: RunCommand,
  ) {}

  insertPrompt(target: AgentTarget, content: string): void {
    if (!target.paneId) {
      throw new HerdrRuntimeError("No target pane to insert prompt into");
    }
    if (target.sessionId) {
      try {
        const agent = inspectAgent(this.herdrBin, target.paneId, this.run);
        if (agent.sessionId && agent.sessionId !== target.sessionId) {
          throw new HerdrRuntimeError("The target pane now hosts a different Agent");
        }
        if (agent.status !== "idle" && agent.status !== "done") {
          throw new HerdrRuntimeError(
            `Target Agent is ${agent.status}, not idle`,
          );
        }
      } catch (err) {
        if (err instanceof HerdrRuntimeError && (err.message.includes("different Agent") || err.message.includes("not idle"))) {
          throw err;
        }
      }
    }

    const sendResult = this.run(this.herdrBin, [
      "pane",
      "send-text",
      target.paneId,
      content,
    ]);
    assertCommandSucceeded(sendResult, "insert the prompt");
  }
}

function originatingPaneId(serializedContext: string | undefined): string {
  if (!serializedContext) {
    return "";
  }

  let context: unknown;
  try {
    context = JSON.parse(serializedContext);
  } catch {
    return "";
  }
  if (
    !isRecord(context) ||
    typeof context.focused_pane_id !== "string"
  ) {
    return "";
  }
  return context.focused_pane_id;
}

function parseAgentInfo(serialized: string | null): {
  paneId: string;
  sessionId: string;
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
  const agentSession = isRecord(agent) ? agent.agent_session : undefined;
  if (
    !isRecord(agent) ||
    typeof agent.agent !== "string" ||
    typeof agent.agent_status !== "string" ||
    typeof agent.pane_id !== "string" ||
    !isRecord(agentSession) ||
    typeof agentSession.value !== "string" ||
    agentSession.value.length === 0
  ) {
    throw new HerdrRuntimeError("The target pane no longer hosts an Agent");
  }
  return {
    paneId: agent.pane_id,
    sessionId: agentSession.value,
    status: agent.agent_status,
  };
}

function inspectAgent(
  herdrBin: string,
  paneId: string,
  run: RunCommand,
): ReturnType<typeof parseAgentInfo> {
  const result = run(herdrBin, ["agent", "get", paneId]);
  assertCommandSucceeded(result, "inspect the target Agent");
  return parseAgentInfo(result.stdout);
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
