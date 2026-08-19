import { describe, expect, it } from "vitest";

import { searchPrompts } from "../src/search.js";

describe("searchPrompts", () => {
  it("matches full prompt content by a case-insensitive substring", () => {
    const prompts = [
      { content: "Review the current diff" },
      { content: "Explain this error\nand identify the root cause" },
      { content: "把这段代码重构得更清晰" },
    ];

    expect(searchPrompts(prompts, "CURRENT")).toEqual([prompts[0]]);
    expect(searchPrompts(prompts, "root cause")).toEqual([prompts[1]]);
    expect(searchPrompts(prompts, "代码重构")).toEqual([prompts[2]]);
    expect(searchPrompts(prompts, "")).toEqual(prompts);
  });
});
