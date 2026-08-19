import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PromptStore, PromptStoreError } from "../src/store.js";

function temporaryConfigDirectory(): string {
  return mkdtempSync(join(tmpdir(), "herdr-prompts-"));
}

describe("PromptStore", () => {
  it("creates a versioned private JSON store with newest prompts first", () => {
    const configDirectory = temporaryConfigDirectory();
    const store = new PromptStore(configDirectory);

    expect(store.load()).toEqual([]);
    expect(store.add("First prompt")).toEqual([{ content: "First prompt" }]);
    expect(store.add("Second\nprompt")).toEqual([
      { content: "Second\nprompt" },
      { content: "First prompt" },
    ]);

    const storePath = join(configDirectory, "prompts.json");
    expect(JSON.parse(readFileSync(storePath, "utf8"))).toEqual({
      version: 1,
      prompts: [
        { content: "Second\nprompt" },
        { content: "First prompt" },
      ],
    });
    expect(statSync(storePath).mode & 0o777).toBe(0o600);
  });

  it("edits in place, deletes by content, and rejects blank or duplicate values", () => {
    const store = new PromptStore(temporaryConfigDirectory());
    store.add("First");
    store.add("Second");

    expect(store.update("First", "Updated")).toEqual([
      { content: "Second" },
      { content: "Updated" },
    ]);
    expect(store.remove("Second")).toEqual([{ content: "Updated" }]);

    expect(() => store.add("Updated")).toThrow("Prompt already exists");
    expect(() => store.add(" \n ")).toThrow("Prompt cannot be empty");
  });

  it("refuses to overwrite malformed or unsupported data", () => {
    const configDirectory = temporaryConfigDirectory();
    const storePath = join(configDirectory, "prompts.json");
    writeFileSync(storePath, "not json", "utf8");
    const malformedStore = new PromptStore(configDirectory);

    expect(() => malformedStore.add("New prompt")).toThrow(PromptStoreError);
    expect(readFileSync(storePath, "utf8")).toBe("not json");

    writeFileSync(storePath, '{"version":2,"prompts":[]}', "utf8");
    expect(() => malformedStore.load()).toThrow("Unsupported prompt store version");
  });

  it.each([
    ['{"version":1,"prompts":[{"content":"  "}]}', "Blank prompt"],
    [
      '{"version":1,"prompts":[{"content":"same"},{"content":"same"}]}',
      "Duplicate prompt",
    ],
  ])("rejects invalid existing prompt data without overwriting it", (source, message) => {
    const configDirectory = temporaryConfigDirectory();
    const storePath = join(configDirectory, "prompts.json");
    writeFileSync(storePath, source, "utf8");
    const store = new PromptStore(configDirectory);

    expect(() => store.add("New prompt")).toThrow(message);
    expect(readFileSync(storePath, "utf8")).toBe(source);
  });
});
