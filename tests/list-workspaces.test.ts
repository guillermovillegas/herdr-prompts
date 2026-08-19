import { describe, expect, it, vi } from "vitest";

import { runListWorkspaces } from "../src/list-workspaces.js";

describe("list workspaces action", () => {
  it("runs `workspace list` through HERDR_BIN_PATH and forwards stdout", () => {
    const spawn = vi.fn(() => ({
      stdout: '{"workspaces":[]}',
      stderr: "",
      status: 0,
    }));
    const stdout = { write: vi.fn() };
    const stderr = { write: vi.fn() };

    const exitCode = runListWorkspaces({
      env: { HERDR_BIN_PATH: "/opt/herdr/bin/herdr" },
      spawn,
      stdout,
      stderr,
    });

    expect(spawn).toHaveBeenCalledWith(
      "/opt/herdr/bin/herdr",
      ["workspace", "list"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    expect(stdout.write).toHaveBeenCalledWith('{"workspaces":[]}');
    expect(stderr.write).not.toHaveBeenCalled();
    expect(exitCode).toBe(0);
  });

  it("falls back to `herdr` and preserves command failures", () => {
    const spawn = vi.fn(() => ({
      stdout: "",
      stderr: "Herdr is unavailable\n",
      status: 1,
    }));
    const stdout = { write: vi.fn() };
    const stderr = { write: vi.fn() };

    const exitCode = runListWorkspaces({
      env: {},
      spawn,
      stdout,
      stderr,
    });

    expect(spawn).toHaveBeenCalledWith("herdr", ["workspace", "list"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    expect(stdout.write).not.toHaveBeenCalled();
    expect(stderr.write).toHaveBeenCalledWith("Herdr is unavailable\n");
    expect(exitCode).toBe(1);
  });

  it("reports spawn errors when the Herdr executable cannot start", () => {
    const spawnError = new Error("spawn herdr ENOENT");
    const spawn = vi.fn(() => ({
      stdout: null,
      stderr: null,
      status: null,
      error: spawnError,
    }));
    const stderr = { write: vi.fn() };

    const exitCode = runListWorkspaces({
      env: {},
      spawn,
      stdout: { write: vi.fn() },
      stderr,
    });

    expect(stderr.write).toHaveBeenCalledWith(
      "Failed to run Herdr: spawn herdr ENOENT\n",
    );
    expect(exitCode).toBe(1);
  });
});
