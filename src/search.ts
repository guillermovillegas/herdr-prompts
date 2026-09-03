export interface PromptContent {
  title?: string;
  content: string;
}

export function searchPrompts<T extends PromptContent>(
  prompts: readonly T[],
  query: string,
): T[] {
  if (query.length === 0) {
    return [...prompts];
  }

  const normalizedQuery = query.toLowerCase();
  return prompts.filter((prompt) =>
    (prompt.title && prompt.title.toLowerCase().includes(normalizedQuery)) ||
    prompt.content.toLowerCase().includes(normalizedQuery),
  );
}
