import { searchPrompts } from "./search.js";
import type { Prompt } from "./store.js";

export type PickerMode =
  | "list"
  | "create"
  | "edit"
  | "fill"
  | "delete-confirm";

export interface PickerState {
  mode: PickerMode;
  prompts: Prompt[];
  query: string;
  selectedIndex: number;
  draft: string;
  cursor: number;
  originalContent?: string;
  error?: string;
}

export type PickerAction =
  | { type: "set-query"; query: string }
  | { type: "move"; delta: number }
  | { type: "start-create" }
  | { type: "start-edit" }
  | { type: "start-fill" }
  | { type: "start-delete" }
  | { type: "cancel" }
  | { type: "insert-text"; text: string }
  | { type: "backspace" }
  | { type: "delete-forward" }
  | { type: "move-cursor"; direction: "left" | "right" | "up" | "down" }
  | { type: "replace-prompts"; prompts: Prompt[] }
  | { type: "set-error"; error: string }
  | { type: "clear-error" };

export function createPickerState(prompts: Prompt[]): PickerState {
  return {
    mode: prompts.length === 0 ? "create" : "list",
    prompts,
    query: "",
    selectedIndex: 0,
    draft: "",
    cursor: 0,
  };
}

export function visiblePrompts(state: PickerState): Prompt[] {
  return searchPrompts(state.prompts, state.query);
}

export function currentPrompt(state: PickerState): Prompt | undefined {
  return visiblePrompts(state)[state.selectedIndex];
}

export function pickerReducer(
  state: PickerState,
  action: PickerAction,
): PickerState {
  switch (action.type) {
    case "set-query":
      return clearError({ ...state, query: action.query, selectedIndex: 0 });
    case "move": {
      const count = visiblePrompts(state).length;
      if (count === 0) return state;
      const selectedIndex = Math.max(
        0,
        Math.min(count - 1, state.selectedIndex + action.delta),
      );
      return clearError({ ...state, selectedIndex });
    }
    case "start-create":
      return editorState(state, "create", "");
    case "start-edit": {
      const prompt = currentPrompt(state);
      return prompt
        ? editorState(state, "edit", prompt.content, prompt.content)
        : state;
    }
    case "start-fill": {
      const prompt = currentPrompt(state);
      return prompt ? editorState(state, "fill", prompt.content) : state;
    }
    case "start-delete":
      return currentPrompt(state)
        ? clearError({ ...state, mode: "delete-confirm" })
        : state;
    case "cancel":
      return listState(state, state.prompts);
    case "insert-text":
      if (!isEditorMode(state.mode) || action.text.length === 0) return state;
      return clearError({
        ...state,
        draft:
          state.draft.slice(0, state.cursor) +
          action.text +
          state.draft.slice(state.cursor),
        cursor: state.cursor + action.text.length,
      });
    case "backspace":
      if (!isEditorMode(state.mode) || state.cursor === 0) return state;
      const previousCursor = previousGraphemeBoundary(state.draft, state.cursor);
      return clearError({
        ...state,
        draft:
          state.draft.slice(0, previousCursor) +
          state.draft.slice(state.cursor),
        cursor: previousCursor,
      });
    case "delete-forward":
      if (!isEditorMode(state.mode) || state.cursor >= state.draft.length) {
        return state;
      }
      return clearError({
        ...state,
        draft:
          state.draft.slice(0, state.cursor) +
          state.draft.slice(nextGraphemeBoundary(state.draft, state.cursor)),
      });
    case "move-cursor":
      if (!isEditorMode(state.mode)) return state;
      return clearError({
        ...state,
        cursor: moveCursor(state.draft, state.cursor, action.direction),
      });
    case "replace-prompts":
      return listState(state, action.prompts);
    case "set-error":
      return { ...state, error: action.error };
    case "clear-error":
      return clearError(state);
  }
}

function editorState(
  state: PickerState,
  mode: "create" | "edit" | "fill",
  draft: string,
  originalContent?: string,
): PickerState {
  return {
    mode,
    prompts: state.prompts,
    query: state.query,
    selectedIndex: state.selectedIndex,
    draft,
    cursor: draft.length,
    ...(originalContent === undefined ? {} : { originalContent }),
  };
}

function listState(state: PickerState, prompts: Prompt[]): PickerState {
  return {
    mode: prompts.length === 0 ? "create" : "list",
    prompts,
    query: "",
    selectedIndex: Math.min(state.selectedIndex, Math.max(0, prompts.length - 1)),
    draft: "",
    cursor: 0,
  };
}

function clearError(state: PickerState): PickerState {
  if (state.error === undefined) return state;
  const { error: _, ...withoutError } = state;
  return withoutError;
}

function isEditorMode(mode: PickerMode): boolean {
  return mode === "create" || mode === "edit" || mode === "fill";
}

function moveCursor(
  text: string,
  cursor: number,
  direction: "left" | "right" | "up" | "down",
): number {
  if (direction === "left") return previousGraphemeBoundary(text, cursor);
  if (direction === "right") return nextGraphemeBoundary(text, cursor);

  const lineStart = text.lastIndexOf("\n", cursor - 1) + 1;
  const column = graphemeCount(text.slice(lineStart, cursor));
  if (direction === "up") {
    if (lineStart === 0) return cursor;
    const previousLineEnd = lineStart - 1;
    const previousLineStart = text.lastIndexOf("\n", previousLineEnd - 1) + 1;
    return indexAtGraphemeColumn(
      text,
      previousLineStart,
      previousLineEnd,
      column,
    );
  }

  const lineEnd = text.indexOf("\n", cursor);
  if (lineEnd === -1) return cursor;
  const nextLineStart = lineEnd + 1;
  const nextLineEnd = text.indexOf("\n", nextLineStart);
  return indexAtGraphemeColumn(
    text,
    nextLineStart,
    nextLineEnd === -1 ? text.length : nextLineEnd,
    column,
  );
}

const graphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});

function previousGraphemeBoundary(text: string, index: number): number {
  let previous = 0;
  for (const segment of graphemeSegmenter.segment(text)) {
    if (segment.index >= index) break;
    previous = segment.index;
  }
  return previous;
}

export function nextGraphemeBoundary(text: string, index: number): number {
  for (const segment of graphemeSegmenter.segment(text)) {
    if (segment.index > index) return segment.index;
  }
  return text.length;
}

function graphemeCount(text: string): number {
  return Array.from(graphemeSegmenter.segment(text)).length;
}

function indexAtGraphemeColumn(
  text: string,
  start: number,
  end: number,
  column: number,
): number {
  let currentColumn = 0;
  for (const segment of graphemeSegmenter.segment(text.slice(start, end))) {
    if (currentColumn === column) return start + segment.index;
    currentColumn += 1;
  }
  return end;
}
