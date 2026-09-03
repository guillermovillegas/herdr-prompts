import {
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

export interface Prompt {
  title?: string;
  content: string;
}

interface PromptFile {
  version: 1;
  prompts: Prompt[];
}

export class PromptStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromptStoreError";
  }
}

export class PromptStore {
  readonly path: string;
  private isArrayFormat = false;

  constructor(private readonly configDirectory: string) {
    this.path = join(configDirectory, "prompts.json");
  }

  load(): Prompt[] {
    let source: string;
    try {
      source = readFileSync(this.path, "utf8");
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return [];
      }
      throw new PromptStoreError(
        `Unable to read prompt store at ${this.path}: ${errorMessage(error)}`,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(source);
    } catch (error) {
      throw new PromptStoreError(
        `Invalid prompt store at ${this.path}: ${errorMessage(error)}`,
      );
    }

    let rawList: unknown[];
    if (Array.isArray(parsed)) {
      this.isArrayFormat = true;
      rawList = parsed;
    } else if (isRecord(parsed)) {
      if (parsed.version !== 1) {
        throw new PromptStoreError(
          `Unsupported prompt store version at ${this.path}`,
        );
      }
      if (!hasExactKeys(parsed, ["version", "prompts"])) {
        throw new PromptStoreError(`Unsupported prompt store fields at ${this.path}`);
      }
      if (!Array.isArray(parsed.prompts)) {
        throw new PromptStoreError(`Invalid prompt list at ${this.path}`);
      }
      this.isArrayFormat = false;
      rawList = parsed.prompts;
    } else {
      throw new PromptStoreError(
        `Unsupported prompt store version at ${this.path}`,
      );
    }

    const prompts: Prompt[] = rawList.map((prompt, index) => {
      if (typeof prompt === "string") {
        return { content: prompt };
      }
      if (
        !isRecord(prompt) ||
        !hasAllowedKeys(prompt, ["content", "title"]) ||
        typeof prompt.content !== "string" ||
        (prompt.title !== undefined && typeof prompt.title !== "string")
      ) {
        throw new PromptStoreError(
          `Invalid prompt at index ${index} in ${this.path}`,
        );
      }
      return {
        ...(prompt.title !== undefined ? { title: prompt.title } : {}),
        content: prompt.content,
      };
    });

    const seen = new Set<string>();
    for (const [index, prompt] of prompts.entries()) {
      if (prompt.content.trim().length === 0) {
        throw new PromptStoreError(
          `Blank prompt at index ${index} in ${this.path}`,
        );
      }
      if (seen.has(prompt.content)) {
        throw new PromptStoreError(
          `Duplicate prompt at index ${index} in ${this.path}`,
        );
      }
      seen.add(prompt.content);
    }
    return prompts;
  }

  add(content: string, title?: string): Prompt[] {
    validateContent(content);
    const prompts = this.load();
    assertUnique(prompts, content);
    const next = [{ ...(title ? { title } : {}), content }, ...prompts];
    this.save(next);
    return next;
  }

  update(originalContent: string, content: string, title?: string): Prompt[] {
    validateContent(content);
    const prompts = this.load();
    const index = prompts.findIndex(
      (prompt) => prompt.content === originalContent,
    );
    if (index === -1) {
      throw new PromptStoreError("Prompt no longer exists");
    }
    if (content !== originalContent) {
      assertUnique(prompts, content);
    }

    const prevTitle = prompts[index]?.title;
    const finalTitle = title !== undefined ? title : prevTitle;

    const next = prompts.map((prompt, promptIndex) =>
      promptIndex === index
        ? { ...(finalTitle ? { title: finalTitle } : {}), content }
        : prompt,
    );
    this.save(next);
    return next;
  }

  remove(content: string): Prompt[] {
    const prompts = this.load();
    const index = prompts.findIndex((prompt) => prompt.content === content);
    if (index === -1) {
      throw new PromptStoreError("Prompt no longer exists");
    }

    const next = prompts.filter((_, promptIndex) => promptIndex !== index);
    this.save(next);
    return next;
  }

  private save(prompts: Prompt[]): void {
    mkdirSync(this.configDirectory, { recursive: true, mode: 0o700 });
    const temporaryPath = join(
      this.configDirectory,
      `.prompts-${process.pid}-${randomUUID()}.tmp`,
    );
    const dataToWrite = this.isArrayFormat
      ? prompts
      : ({ version: 1, prompts } as PromptFile);

    try {
      writeFileSync(temporaryPath, `${JSON.stringify(dataToWrite, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      });
      renameSync(temporaryPath, this.path);
    } catch (error) {
      try {
        unlinkSync(temporaryPath);
      } catch {
        // The temporary file may not have been created.
      }
      throw new PromptStoreError(
        `Unable to write prompt store at ${this.path}: ${errorMessage(error)}`,
      );
    }
  }
}

function validateContent(content: string): void {
  if (content.trim().length === 0) {
    throw new PromptStoreError("Prompt cannot be empty");
  }
}

function assertUnique(prompts: readonly Prompt[], content: string): void {
  if (prompts.some((prompt) => prompt.content === content)) {
    throw new PromptStoreError("Prompt already exists");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean {
  const keys = Object.keys(value);
  return (
    keys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.hasOwn(value, key))
  );
}

function hasAllowedKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function isNodeError(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error;
}

function errorMessage(value: unknown): string {
  return value instanceof Error ? value.message : String(value);
}
