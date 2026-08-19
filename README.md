# Workspace List for Herdr

A minimal TypeScript Herdr plugin that exposes one action: list every workspace
in the current Herdr session.

## Development

```bash
pnpm install
pnpm check
```

The build creates a self-contained plugin directory under `dist/`:

```text
dist/
├── herdr-plugin.toml
├── index.cjs
├── index.cjs.map
└── README.md
```

## Link and run locally

Run these commands from inside a Herdr-managed pane:

```bash
pnpm plugin:link
pnpm plugin:invoke
pnpm plugin:logs
```

Unlink the development build with:

```bash
pnpm plugin:unlink
```

The plugin calls the active Herdr binary through `HERDR_BIN_PATH`, falling back
to `herdr` when the environment variable is unavailable.

## Distribution

Publish the contents of `dist/` as the plugin directory. If `dist/` is committed
as a subdirectory of a GitHub repository, users can install it with:

```bash
herdr plugin install owner/repository/dist
```
