import { describe, expect, it, vi } from "vitest";

import {
  HerdrClient,
  HerdrRuntimeError,
  openPickerAction,
  type RunCommand,
} from "../src/herdr.js";

describe("openPickerAction", () => {
  it("opens a focused popup with the originating pane id", () => {
    const run = vi
      .fn<RunCommand>()
      .mockReturnValueOnce(agentResult("idle"))
      .mockReturnValueOnce({ stdout: "", stderr: "", status: 0 });

    openPickerAction(
      {
        HERDR_BIN_PATH: "/opt/herdr/bin/herdr",
        HERDR_PLUGIN_CONTEXT_JSON: JSON.stringify({
          focused_pane_id: "w1:p3",
        }),
      },
      run,
    );

    expect(run).toHaveBeenNthCalledWith(1, "/opt/herdr/bin/herdr", [
      "agent",
      "get",
      "w1:p3",
    ]);
    expect(run).toHaveBeenNthCalledWith(2, "/opt/herdr/bin/herdr", [
      "plugin",
      "pane",
      "open",
      "--plugin",
      "oppenheimor.herdr-prompts",
      "--entrypoint",
      "picker",
      "--placement",
      "popup",
      "--width",
      "80%",
      "--height",
      "70%",
      "--env",
      "HERDR_PROMPTS_TARGET_PANE_ID=w1:p3",
      "--env",
      "HERDR_PROMPTS_TARGET_AGENT_SESSION_ID=session-1",
      "--focus",
    ]);
  });

  it("opens popup even when the focused pane is not an agent", () => {
    const run = vi
      .fn<RunCommand>()
      .mockReturnValueOnce({ stdout: "", stderr: "agent target not found", status: 1 })
      .mockReturnValueOnce({ stdout: "", stderr: "", status: 0 });

    openPickerAction(
      {
        HERDR_BIN_PATH: "/opt/herdr/bin/herdr",
        HERDR_PLUGIN_CONTEXT_JSON: JSON.stringify({
          focused_pane_id: "w1:p9",
        }),
      },
      run,
    );

    expect(run).toHaveBeenNthCalledWith(2, "/opt/herdr/bin/herdr", [
      "plugin",
      "pane",
      "open",
      "--plugin",
      "oppenheimor.herdr-prompts",
      "--entrypoint",
      "picker",
      "--placement",
      "popup",
      "--width",
      "80%",
      "--height",
      "70%",
      "--env",
      "HERDR_PROMPTS_TARGET_PANE_ID=w1:p9",
      "--env",
      "HERDR_PROMPTS_TARGET_AGENT_SESSION_ID=",
      "--focus",
    ]);
  });
});

describe("HerdrClient", () => {
  it.each(["idle", "done"])(
    "inserts text without Enter when the target Agent is %s",
    (agentStatus) => {
      const run = vi
        .fn<RunCommand>()
        .mockReturnValueOnce({
          ...agentResult(agentStatus),
        })
        .mockReturnValueOnce({ stdout: "", stderr: "", status: 0 });

      new HerdrClient("herdr", run).insertPrompt(
        { paneId: "w1:p3", sessionId: "session-1" },
        "Review\nthis",
      );

      expect(run).toHaveBeenNthCalledWith(1, "herdr", [
        "agent",
        "get",
        "w1:p3",
      ]);
      expect(run).toHaveBeenNthCalledWith(2, "herdr", [
        "pane",
        "send-text",
        "w1:p3",
        "Review\nthis",
      ]);
    },
  );

  it("refuses to write when the target Agent is not ready", () => {
    const run = vi.fn<RunCommand>(() => agentResult("working"));

    expect(() =>
      new HerdrClient("herdr", run).insertPrompt(
        { paneId: "w1:p3", sessionId: "session-1" },
        "Do not send",
      ),
    ).toThrow(new HerdrRuntimeError("Target Agent is working, not idle"));
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("refuses to write when the pane hosts a replacement Agent", () => {
    const run = vi.fn<RunCommand>(() => agentResult("idle", "session-2"));

    expect(() =>
      new HerdrClient("herdr", run).insertPrompt(
        { paneId: "w1:p3", sessionId: "session-1" },
        "Do not send",
      ),
    ).toThrow("The target pane now hosts a different Agent");
    expect(run).toHaveBeenCalledTimes(1);
  });
});

function agentResult(status: string, sessionId = "session-1") {
  return {
    stdout: JSON.stringify({
      result: {
        agent: {
          agent: "codex",
          agent_session: { kind: "id", value: sessionId },
          agent_status: status,
          pane_id: "w1:p3",
        },
      },
    }),
    stderr: "",
    status: 0,
  };
}
