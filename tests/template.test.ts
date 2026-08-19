import { describe, expect, it } from "vitest";

import {
  findTemplateVariables,
  materializePrompt,
} from "../src/template.js";

describe("prompt templates", () => {
  it("finds unique variables while ignoring escaped double braces", () => {
    const prompt = String.raw`Review {{文件路径}} for {{topic_1}}. Keep \{{literal}} and revisit {{topic_1}}.`;

    expect(findTemplateVariables(prompt)).toEqual(["文件路径", "topic_1"]);
  });

  it("removes the escape marker from literal double braces", () => {
    expect(materializePrompt(String.raw`Explain \{{user.name}} here`)).toBe(
      "Explain {{user.name}} here",
    );
  });
});
