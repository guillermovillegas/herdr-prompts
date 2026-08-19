import { describe, expect, it } from "vitest";

import {
  createPickerState,
  currentPrompt,
  pickerReducer,
  visiblePrompts,
} from "../src/picker-state.js";

const prompts = [
  { content: "Newest prompt" },
  { content: "Review the current diff" },
  { content: "Explain {{topic}}" },
];

describe("picker state", () => {
  it("starts in create mode for an empty library", () => {
    expect(createPickerState([])).toMatchObject({
      mode: "create",
      prompts: [],
      query: "",
      draft: "",
      cursor: 0,
    });
  });

  it("filters by query and keeps selection inside the visible results", () => {
    let state = createPickerState(prompts);
    state = pickerReducer(state, { type: "move", delta: 2 });
    expect(currentPrompt(state)).toEqual(prompts[2]);

    state = pickerReducer(state, { type: "set-query", query: "CURRENT" });
    expect(visiblePrompts(state)).toEqual([prompts[1]]);
    expect(currentPrompt(state)).toEqual(prompts[1]);
  });

  it("moves through management, fill, and delete modes", () => {
    let state = createPickerState(prompts);
    state = pickerReducer(state, { type: "start-edit" });
    expect(state).toMatchObject({
      mode: "edit",
      draft: "Newest prompt",
      originalContent: "Newest prompt",
    });

    state = pickerReducer(state, { type: "cancel" });
    state = pickerReducer(state, { type: "move", delta: 2 });
    state = pickerReducer(state, { type: "start-fill" });
    expect(state).toMatchObject({ mode: "fill", draft: "Explain {{topic}}" });

    state = pickerReducer(state, { type: "cancel" });
    state = pickerReducer(state, { type: "start-delete" });
    expect(state.mode).toBe("delete-confirm");
  });

  it("edits multiline text at the cursor", () => {
    let state = pickerReducer(createPickerState([]), {
      type: "insert-text",
      text: "first\nthird",
    });
    state = pickerReducer(state, { type: "move-cursor", direction: "up" });
    state = pickerReducer(state, { type: "insert-text", text: " line" });
    state = pickerReducer(state, { type: "backspace" });

    expect(state.draft).toBe("first lin\nthird");
    expect(state.cursor).toBe(9);
  });

  it("moves and deletes by grapheme without corrupting Unicode text", () => {
    let state = pickerReducer(createPickerState([]), {
      type: "insert-text",
      text: "中👨‍👩‍👧‍👦文",
    });
    state = pickerReducer(state, { type: "move-cursor", direction: "left" });
    state = pickerReducer(state, { type: "backspace" });

    expect(state.draft).toBe("中文");
    expect(state.cursor).toBe("中".length);
  });

  it("returns to create mode after deleting the final prompt", () => {
    const state = pickerReducer(createPickerState([{ content: "Only" }]), {
      type: "replace-prompts",
      prompts: [],
    });

    expect(state.mode).toBe("create");
  });
});
