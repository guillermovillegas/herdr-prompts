import { describe, expect, it, vi } from "vitest";

import {
  HerdrClient,
  HerdrRuntimeError,
  openPickerAction,
  type RunCommand,
} from "../src/herdr.js";

describe("openPickerAction", () => {
  it("opens a focused popup with the originating pane id", () => {
    const run = vi.fn<RunCommand>(() => ({
      stdout: '{"result":{"pane":{"pane_id":"w1:p9"}}}',
      stderr: "",
      status: 0,
    }));

    openPickerAction(
      {
        HERDR_BIN_PATH: "/opt/herdr/bin/herdr",
        HERDR_PLUGIN_CONTEXT_JSON: JSON.stringify({
          focused_pane_id: "w1:p3",
        }),
      },
      run,
    );

    expect(run).toHaveBeenCalledWith("/opt/herdr/bin/herdr", [
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
          stdout: JSON.stringify({
            result: {
              agent: {
                agent: "codex",
                agent_status: agentStatus,
                pane_id: "w1:p3",
              },
            },
          }),
          stderr: "",
          status: 0,
        })
        .mockReturnValueOnce({ stdout: "", stderr: "", status: 0 });

      new HerdrClient("herdr", run).insertPrompt("w1:p3", "Review\nthis");

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
    const run = vi.fn<RunCommand>(() => ({
      stdout: JSON.stringify({
        result: {
          agent: {
            agent: "claude",
            agent_status: "working",
            pane_id: "w1:p3",
          },
        },
      }),
      stderr: "",
      status: 0,
    }));

    expect(() =>
      new HerdrClient("herdr", run).insertPrompt("w1:p3", "Do not send"),
    ).toThrow(new HerdrRuntimeError("Target Agent is working, not idle"));
    expect(run).toHaveBeenCalledTimes(1);
  });
});
