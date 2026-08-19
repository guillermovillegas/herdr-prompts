import { spawnSync } from "node:child_process";

import React from "react";
import { render } from "ink";

import {
  HerdrClient,
  openPickerAction,
  type RunCommand,
} from "./herdr.js";
import { FatalApp, PickerApp } from "./picker.js";
import { PromptStore } from "./store.js";

const run: RunCommand = (command, args) => {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status,
    ...(result.error ? { error: result.error } : {}),
  };
};

const command = process.argv[2];

try {
  if (command === "open") {
    openPickerAction(process.env, run);
  } else if (command === "picker") {
    const configDirectory = requiredEnvironment("HERDR_PLUGIN_CONFIG_DIR");
    const targetPaneId = requiredEnvironment("HERDR_PROMPTS_TARGET_PANE_ID");
    const targetSessionId = requiredEnvironment(
      "HERDR_PROMPTS_TARGET_AGENT_SESSION_ID",
    );
    const store = new PromptStore(configDirectory);
    const herdr = new HerdrClient(process.env.HERDR_BIN_PATH ?? "herdr", run);
    const prompts = store.load();
    render(
      <PickerApp
        initialPrompts={prompts}
        store={store}
        herdr={herdr}
        target={{ paneId: targetPaneId, sessionId: targetSessionId }}
      />,
    );
  } else {
    process.stderr.write("Usage: index.mjs <open|picker>\n");
    process.exitCode = 2;
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (command === "picker") {
    render(<FatalApp message={message} />);
  } else {
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing`);
  return value;
}
