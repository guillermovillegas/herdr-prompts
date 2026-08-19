const VARIABLE_NAME = /^[\p{L}\p{N}_]+$/u;

export function findTemplateVariables(content: string): string[] {
  const variables: string[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < content.length; ) {
    if (content.startsWith(String.raw`\{{`, index)) {
      const closingIndex = content.indexOf("}}", index + 3);
      index = closingIndex === -1 ? index + 3 : closingIndex + 2;
      continue;
    }

    if (!content.startsWith("{{", index)) {
      index += 1;
      continue;
    }

    const closingIndex = content.indexOf("}}", index + 2);
    if (closingIndex === -1) {
      break;
    }

    const name = content.slice(index + 2, closingIndex);
    if (VARIABLE_NAME.test(name) && !seen.has(name)) {
      variables.push(name);
      seen.add(name);
    }
    index = closingIndex + 2;
  }

  return variables;
}

export function materializePrompt(content: string): string {
  return content.replaceAll(String.raw`\{{`, "{{");
}
