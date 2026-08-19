import { copyFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const distDirectory = resolve(projectRoot, "dist");

await Promise.all([
  copyFile(
    resolve(projectRoot, "herdr-plugin.toml"),
    resolve(distDirectory, "herdr-plugin.toml"),
  ),
  copyFile(
    resolve(projectRoot, "README.md"),
    resolve(distDirectory, "README.md"),
  ),
]);
