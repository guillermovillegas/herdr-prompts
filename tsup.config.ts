import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  clean: true,
  bundle: true,
  noExternal: [/^(?!react-devtools-core$).+/],
  esbuildOptions(options) {
    options.alias = {
      ...options.alias,
      "react-devtools-core": "./src/react-devtools-stub.ts",
    };
  },
  sourcemap: false,
  splitting: false,
  banner: {
    js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);',
  },
  outExtension: () => ({ js: ".mjs" }),
});
