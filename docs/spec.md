# Herdr Prompts MVP specification

## Product boundary

Herdr Prompts is a macOS-only Herdr 0.8.0+ plugin that stores a user's personal prompt library locally and inserts a selected prompt into the Agent pane that opened the picker. The MVP is offline and includes no sync, import/export, telemetry, or selected-text capture.

The popup UI is English. Prompt content is unrestricted UTF-8 and may be multiline.

## Entry and delivery

- Plugin ID: `oppenheimor.herdr-prompts`.
- Action ID: `oppenheimor.herdr-prompts.open`.
- The action is available from an Agent pane's context menu.
- No shortcut is installed by default. Documentation may show a user-configurable example.
- The action opens the `picker` entrypoint as a focused `80%` by `70%` popup and passes the originating pane ID explicitly.
- The repository contains a root manifest and a committed self-contained bundle under `dist/`.

## Data model and persistence

The plugin uses `HERDR_PLUGIN_CONFIG_DIR/prompts.json`:

```json
{
  "version": 1,
  "prompts": [{ "content": "string" }]
}
```

- A prompt has only `content`; the versioned envelope permits future metadata.
- Blank content and exact duplicate content are invalid.
- New prompts are placed first. Editing or using a prompt does not reorder it.
- Writes use a private temporary file and atomic rename. The prompt file mode is `0600`.
- Malformed or unsupported data is reported and never overwritten.
- Concurrent edits from multiple picker sessions are outside the MVP.

## Search and management

- Search is a case-insensitive substring match across the entire prompt.
- The list shows a one-line summary and the selected prompt's full preview.
- Wide layouts use list and preview columns; narrow layouts stack them.
- An empty library immediately opens the create editor.
- List keys: typing searches; arrows select; `Enter` inserts; `Ctrl+N` creates; `Ctrl+E` edits; `Ctrl+D` requests deletion; `Esc` closes.
- Deletion requires `y/N` confirmation.
- Editor keys: `Enter` inserts a newline; `Ctrl+S` confirms; arrows move; `Esc` cancels.

## Template variables

- `{{variable}}` is a variable. Names accept Unicode letters and numbers plus `_`.
- `\{{...}}` is escaped and becomes literal `{{...}}` in inserted output.
- Selecting a prompt containing variables opens a one-off full-text fill editor.
- The saved template is never changed by filling it.
- `Ctrl+S` refuses insertion while valid variable markers remain unresolved.

## Safe Agent insertion

- The destination is the original pane, not whichever pane is focused later.
- Immediately before insertion, the plugin calls `herdr agent get` and requires the same pane to host a recognized Agent in `idle` or `done` state.
- `working`, `blocked`, `unknown`, missing, and changed targets are rejected with an in-popup error.
- Insertion uses `herdr pane send-text` only. Enter is never sent, so Codex, Claude Code, OpenCode, and other recognized Agent inputs are populated but not submitted.

## Acceptance

- Unit tests cover storage, search, templates, picker state, Unicode editing, and Herdr command construction.
- `pnpm check` passes on Node.js 20+.
- The root plugin links on Herdr 0.8.0 and the popup can create, search, fill, and insert a prompt without submitting it.
- README is English by default and links to a Simplified Chinese version.
